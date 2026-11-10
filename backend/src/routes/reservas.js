const express = require('express');
const pool = require('../db');
const { autenticar, requerirRol } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errores');
const { expirarVencidas } = require('../services/expiracion');
const { notificar } = require('../services/notificaciones');

const router = express.Router();
router.use(autenticar);

// POST /api/reservations/book  { id_donacion }
// Reserva con TRANSACCIÓN: si dos receptores aprietan "Apartar" al mismo tiempo,
// solo uno gana; el otro recibe 409 (conflicto).
router.post('/book', requerirRol('receptor'), asyncHandler(async (req, res) => {
  const idDonacion = parseInt(req.body?.id_donacion, 10);
  if (!Number.isInteger(idDonacion)) return res.status(400).json({ error: 'id_donacion es obligatorio.' });

  // RD-04: solo receptores validados por el administrador
  const u = await pool.query('SELECT nombre, estado_validacion FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);
  if (!u.rows[0] || u.rows[0].estado_validacion !== 'aprobada') {
    return res.status(403).json({ error: 'Tu organización aún no ha sido validada por un administrador.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // FOR UPDATE bloquea la fila: la segunda petición espera a que termine la primera
    const { rows } = await client.query('SELECT * FROM donaciones WHERE id_donacion = $1 FOR UPDATE', [idDonacion]);
    const d = rows[0];
    if (!d) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'La donación no existe.' }); }
    if (d.estado !== 'publicada' || new Date(d.fecha_caducidad) <= new Date()) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La donación ya no está disponible (reservada, recogida o vencida).' });
    }
    const ins = await client.query(
      'INSERT INTO reservas (id_donacion, id_receptor) VALUES ($1,$2) RETURNING *', [idDonacion, req.usuario.id]);
    await client.query("UPDATE donaciones SET estado = 'reservada' WHERE id_donacion = $1", [idDonacion]);
    await notificar(client, d.id_donante, 'reservada', `${u.rows[0].nombre} apartó tu donación "${d.titulo}".`, '/mis-donaciones');
    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Donación apartada. Recógela en el horario indicado.', reserva: ins.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'La donación ya fue apartada por otra organización.' });
    throw err;
  } finally {
    client.release();
  }
}));

// GET /api/reservations/mine  -> reservas del receptor
// El teléfono del donante solo se muestra cuando ya existe la reserva.
router.get('/mine', requerirRol('receptor'), asyncHandler(async (req, res) => {
  await expirarVencidas();
  const { rows } = await pool.query(
    `SELECT r.id_reserva, r.id_donacion, r.estado, r.fecha_reserva, r.fecha_recogida,
            d.id_donante, d.titulo, d.categoria, d.kilos, d.direccion, d.latitud, d.longitud, d.horario_recoleccion,
            d.fecha_caducidad, d.estado AS estado_donacion, (d.foto IS NOT NULL) AS tiene_foto,
            u.nombre AS donante_nombre, u.telefono AS donante_telefono,
            EXISTS (SELECT 1 FROM calificaciones c WHERE c.id_reserva = r.id_reserva AND c.id_autor = r.id_receptor) AS calificada
       FROM reservas r
       JOIN donaciones d ON d.id_donacion = r.id_donacion
       JOIN usuarios u ON u.id_usuario = d.id_donante
      WHERE r.id_receptor = $1 ORDER BY r.fecha_reserva DESC`, [req.usuario.id]);
  res.json({ total: rows.length, reservas: rows });
}));

// PATCH /api/reservations/:id/pickup  -> el DONANTE confirma que ya recogieron
router.patch('/:id/pickup', requerirRol('donante'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador inválido.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT r.*, d.id_donante, d.titulo FROM reservas r JOIN donaciones d ON d.id_donacion = r.id_donacion
        WHERE r.id_reserva = $1 FOR UPDATE OF r`, [id]);
    const r = rows[0];
    if (!r) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'La reserva no existe.' }); }
    if (r.id_donante !== req.usuario.id) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Esta reserva no corresponde a una donación tuya.' }); }
    if (r.estado !== 'activa') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'La reserva ya no está activa.' }); }
    await client.query("UPDATE reservas SET estado = 'completada', fecha_recogida = NOW() WHERE id_reserva = $1", [id]);
    await client.query("UPDATE donaciones SET estado = 'recogida' WHERE id_donacion = $1", [r.id_donacion]);
    await notificar(client, r.id_receptor, 'recogida', `Se confirmó la recolección de "${r.titulo}". ¡Califica la experiencia!`, '/mis-reservas');
    await client.query('COMMIT');
    res.json({ mensaje: 'Recolección confirmada. ¡Gracias por rescatar alimento!' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// PATCH /api/reservations/:id/cancel  -> el RECEPTOR cancela su reserva activa
router.patch('/:id/cancel', requerirRol('receptor'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador inválido.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT r.*, d.id_donante, d.titulo FROM reservas r JOIN donaciones d ON d.id_donacion = r.id_donacion
        WHERE r.id_reserva = $1 FOR UPDATE OF r`, [id]);
    const r = rows[0];
    if (!r) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'La reserva no existe.' }); }
    if (r.id_receptor !== req.usuario.id) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Esta reserva no es tuya.' }); }
    if (r.estado !== 'activa') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Solo se puede cancelar una reserva activa.' }); }
    await client.query("UPDATE reservas SET estado = 'cancelada' WHERE id_reserva = $1", [id]);
    // La donación vuelve a estar disponible si aún no caduca
    await client.query(
      `UPDATE donaciones SET estado = CASE WHEN fecha_caducidad > NOW() THEN 'publicada' ELSE 'expirada' END
        WHERE id_donacion = $1`, [r.id_donacion]);
    await notificar(client, r.id_donante, 'cancelada', `Se canceló la reserva de "${r.titulo}". La donación volvió a estar disponible.`, '/mis-donaciones');
    await client.query('COMMIT');
    res.json({ mensaje: 'Reserva cancelada. La donación vuelve a estar disponible.' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
