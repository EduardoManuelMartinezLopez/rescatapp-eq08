const express = require('express');
const pool = require('../db');
const { autenticar, requerirRol } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errores');
const { texto, validarDonacion } = require('../utils/validar');
const { leerFoto } = require('../utils/foto');
const { expirarVencidas } = require('../services/expiracion');

const router = express.Router();

// Columnas públicas de una donación (nunca incluimos la foto binaria en las listas)
const COLS = `d.id_donacion, d.id_donante, d.titulo, d.descripcion, d.categoria, d.kilos, d.direccion, d.latitud,
  d.longitud, d.horario_recoleccion, d.acepta_buena_fe, d.fecha_publicacion, d.fecha_caducidad, d.estado,
  (d.foto IS NOT NULL) AS tiene_foto`;
const RETURNING_COLS = COLS.replace(/d\./g, '');

// GET /api/donations/:id/foto  (pública: la usan las etiquetas <img>, que no pueden enviar el token)
router.get('/:id/foto', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador inválido.' });
  const { rows } = await pool.query('SELECT foto, foto_tipo FROM donaciones WHERE id_donacion = $1', [id]);
  if (!rows[0] || !rows[0].foto) return res.status(404).json({ error: 'La donación no tiene foto.' });
  res.set('Content-Type', rows[0].foto_tipo || 'image/jpeg');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(rows[0].foto);
}));

router.use(autenticar);

// GET /api/donations  -> donaciones disponibles (publicadas y vigentes) para el mapa/lista
router.get('/', asyncHandler(async (req, res) => {
  await expirarVencidas();
  const params = [];
  let filtros = '';
  if (req.query.categoria) { params.push(req.query.categoria); filtros += ` AND d.categoria = $${params.length}`; }
  if (req.query.q) { params.push(`%${req.query.q}%`); filtros += ` AND (d.titulo ILIKE $${params.length} OR d.direccion ILIKE $${params.length})`; }
  const { rows } = await pool.query(
    `SELECT ${COLS}, u.nombre AS donante_nombre,
            (SELECT ROUND(AVG(estrellas)::numeric, 1) FROM calificaciones WHERE id_destino = d.id_donante) AS donante_promedio
       FROM donaciones d JOIN usuarios u ON u.id_usuario = d.id_donante
      WHERE d.estado = 'publicada' AND d.fecha_caducidad > NOW() ${filtros}
      ORDER BY d.fecha_caducidad ASC`, params);
  res.json({ total: rows.length, donaciones: rows });
}));

// GET /api/donations/mine  -> donaciones del donante que inició sesión
router.get('/mine', requerirRol('donante'), asyncHandler(async (req, res) => {
  await expirarVencidas();
  const { rows } = await pool.query(
    `SELECT ${COLS}, r.id_reserva, r.estado AS estado_reserva, ur.id_usuario AS id_receptor,
            ur.nombre AS receptor_nombre, ur.telefono AS receptor_telefono,
            EXISTS (SELECT 1 FROM calificaciones c WHERE c.id_reserva = r.id_reserva AND c.id_autor = d.id_donante) AS calificada
       FROM donaciones d
       LEFT JOIN reservas r ON r.id_donacion = d.id_donacion AND r.estado IN ('activa','completada')
       LEFT JOIN usuarios ur ON ur.id_usuario = r.id_receptor
      WHERE d.id_donante = $1 ORDER BY d.fecha_publicacion DESC`, [req.usuario.id]);
  res.json({ total: rows.length, donaciones: rows });
}));

// POST /api/donations/publish  -> publicar una donación (solo donantes)
router.post('/publish', requerirRol('donante'), asyncHandler(async (req, res) => {
  const errores = validarDonacion(req.body);
  const f = leerFoto(req.body?.foto);
  if (!f.ok) errores.push(f.error);
  if (errores.length) return res.status(400).json({ error: 'Datos inválidos.', detalles: errores });
  const b = req.body;
  const { rows } = await pool.query(
    `INSERT INTO donaciones (id_donante, titulo, descripcion, categoria, kilos, direccion, latitud, longitud,
                             horario_recoleccion, acepta_buena_fe, fecha_caducidad, foto, foto_tipo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10,$11,$12) RETURNING ${RETURNING_COLS}`,
    [req.usuario.id, texto(b.titulo), texto(b.descripcion) || null, b.categoria, Number(b.kilos), texto(b.direccion),
     Number(b.latitud), Number(b.longitud), texto(b.horario_recoleccion) || null, new Date(b.fecha_caducidad),
     f.foto?.buffer || null, f.foto?.tipo || null]);
  // Avisa a las organizaciones ya validadas que hay alimento nuevo
  await pool.query(
    `INSERT INTO notificaciones (id_usuario, tipo, mensaje, enlace)
     SELECT id_usuario, 'nueva_donacion', $1, $2 FROM usuarios WHERE rol = 'receptor' AND estado_validacion = 'aprobada'`,
    [`Nueva donación disponible: ${rows[0].titulo} (${rows[0].kilos} kg).`, `/mapa?d=${rows[0].id_donacion}`]);
  res.status(201).json({ mensaje: 'Donación publicada.', donacion: rows[0] });
}));

// PATCH /api/donations/:id  -> editar una donación propia que sigue "publicada" (nadie la ha apartado)
// Acepta los mismos campos que publicar. Foto: "foto" la reemplaza, "quitar_foto": true la elimina, si no viene se conserva.
router.patch('/:id', requerirRol('donante'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador inválido.' });
  const errores = validarDonacion(req.body);
  const f = leerFoto(req.body?.foto);
  if (!f.ok) errores.push(f.error);
  if (errores.length) return res.status(400).json({ error: 'Datos inválidos.', detalles: errores });
  const b = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Se bloquea la fila: así no se puede editar mientras otra organización la está apartando
    const { rows: ex } = await client.query('SELECT id_donante, estado FROM donaciones WHERE id_donacion = $1 FOR UPDATE', [id]);
    if (!ex[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'La donación no existe.' }); }
    if (ex[0].id_donante !== req.usuario.id) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Esta donación no es tuya.' }); }
    if (ex[0].estado !== 'publicada') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Solo se puede editar una donación que sigue publicada (sin reservar).' }); }
    const cambiaFoto = !!f.foto || b.quitar_foto === true;
    const { rows } = await client.query(
      `UPDATE donaciones SET titulo=$1, descripcion=$2, categoria=$3, kilos=$4, direccion=$5, latitud=$6, longitud=$7,
              horario_recoleccion=$8, fecha_caducidad=$9
              ${cambiaFoto ? ', foto=$11, foto_tipo=$12' : ''}
        WHERE id_donacion=$10 RETURNING ${RETURNING_COLS}`,
      [texto(b.titulo), texto(b.descripcion) || null, b.categoria, Number(b.kilos), texto(b.direccion), Number(b.latitud),
       Number(b.longitud), texto(b.horario_recoleccion) || null, new Date(b.fecha_caducidad), id,
       ...(cambiaFoto ? [f.foto?.buffer || null, f.foto?.tipo || null] : [])]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Donación actualizada.', donacion: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally { client.release(); }
}));

// DELETE /api/donations/:id  -> retirar una donación que nadie ha reservado
router.delete('/:id', requerirRol('donante'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador inválido.' });
  const { rows } = await pool.query('SELECT id_donacion, id_donante, estado FROM donaciones WHERE id_donacion = $1', [id]);
  const d = rows[0];
  if (!d) return res.status(404).json({ error: 'La donación no existe.' });
  if (d.id_donante !== req.usuario.id) return res.status(403).json({ error: 'Esta donación no es tuya.' });
  if (d.estado !== 'publicada') return res.status(409).json({ error: 'Solo se puede retirar una donación en estado "publicada".' });
  try {
    await pool.query('DELETE FROM donaciones WHERE id_donacion = $1', [id]);
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'La donación ya tiene historial de reservas y no puede borrarse.' });
    throw err;
  }
  res.json({ mensaje: 'Donación retirada.' });
}));

module.exports = router;
