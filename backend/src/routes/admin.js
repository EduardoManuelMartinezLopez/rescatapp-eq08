const express = require('express');
const pool = require('../db');
const { autenticar, requerirRol } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errores');
const { expirarVencidas } = require('../services/expiracion');
const { notificar } = require('../services/notificaciones');
const { impacto, FUENTES } = require('../utils/impacto');
const { aCsv } = require('../utils/csv');

const router = express.Router();
router.use(autenticar, requerirRol('admin'));

// GET /api/admin/metrics  -> indicadores calculados con datos REALES de la base
router.get('/metrics', asyncHandler(async (req, res) => {
  await expirarVencidas();
  const q = (sql) => pool.query(sql).then((r) => r.rows);
  const [[kilos], [entregas], [donantes], porEstado, orgs, porSemana, porCategoria] = await Promise.all([
    q("SELECT COALESCE(SUM(kilos),0) AS v FROM donaciones WHERE estado = 'recogida'"),
    q("SELECT COUNT(*) AS v FROM reservas WHERE estado = 'completada'"),
    q('SELECT COUNT(DISTINCT id_donante) AS v FROM donaciones'),
    q('SELECT estado, COUNT(*) AS total FROM donaciones GROUP BY estado'),
    q("SELECT estado_validacion AS estado, COUNT(*) AS total FROM usuarios WHERE rol = 'receptor' GROUP BY estado_validacion"),
    q(`SELECT date_trunc('week', r.fecha_recogida) AS semana, SUM(d.kilos) AS kilos
         FROM reservas r JOIN donaciones d ON d.id_donacion = r.id_donacion
        WHERE r.estado = 'completada' AND r.fecha_recogida >= NOW() - INTERVAL '28 days'
        GROUP BY 1 ORDER BY 1`),
    q(`SELECT d.categoria, SUM(d.kilos) AS kilos FROM donaciones d WHERE d.estado = 'recogida'
        GROUP BY d.categoria ORDER BY kilos DESC`),
  ]);
  res.json({
    kilos_rescatados: kilos.v,
    entregas_completadas: entregas.v,
    donantes_con_publicaciones: donantes.v,
    donaciones_por_estado: porEstado,
    organizaciones_por_validacion: orgs,
    kilos_por_semana: porSemana,
    kilos_por_categoria: porCategoria,
    impacto: impacto(kilos.v),
    fuentes_impacto: FUENTES,
  });
}));

// GET /api/admin/organizations?estado=pendiente|aprobada|rechazada
router.get('/organizations', asyncHandler(async (req, res) => {
  const params = [];
  let filtro = '';
  if (['pendiente', 'aprobada', 'rechazada'].includes(req.query.estado)) {
    params.push(req.query.estado);
    filtro = ' AND u.estado_validacion = $1';
  }
  const { rows } = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.correo, u.telefono, u.direccion, u.estado_validacion, u.fecha_registro,
            (SELECT ROUND(AVG(estrellas)::numeric, 1) FROM calificaciones WHERE id_destino = u.id_usuario) AS promedio
       FROM usuarios u WHERE u.rol = 'receptor' ${filtro} ORDER BY u.fecha_registro DESC`, params);
  res.json({ total: rows.length, organizaciones: rows });
}));

// PATCH /api/admin/organizations/:id  { estado_validacion: "aprobada" | "rechazada" | "pendiente" }
router.patch('/organizations/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const estado = req.body?.estado_validacion;
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador inválido.' });
  if (!['aprobada', 'rechazada', 'pendiente'].includes(estado)) {
    return res.status(400).json({ error: 'estado_validacion debe ser "aprobada", "rechazada" o "pendiente".' });
  }
  const { rows } = await pool.query(
    `UPDATE usuarios SET estado_validacion = $1 WHERE id_usuario = $2 AND rol = 'receptor'
      RETURNING id_usuario, nombre, correo, estado_validacion`, [estado, id]);
  if (!rows[0]) return res.status(404).json({ error: 'La organización receptora no existe.' });
  if (estado === 'aprobada') await notificar(pool, id, 'validacion', '¡Tu organización fue aprobada! Ya puedes apartar donaciones.', '/mapa');
  if (estado === 'rechazada') await notificar(pool, id, 'validacion', 'Tu organización no fue aprobada. Contacta al administrador para más información.', null);
  res.json({ mensaje: 'Estado actualizado.', organizacion: rows[0] });
}));

// GET /api/admin/donations  -> últimas donaciones registradas
router.get('/donations', asyncHandler(async (req, res) => {
  await expirarVencidas();
  // Opcional: ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD filtra por fecha de publicación (se usa para el reporte imprimible)
  const fecha = /^\d{4}-\d{2}-\d{2}$/;
  const params = [];
  let filtro = '';
  if (fecha.test(req.query.desde || '')) { params.push(req.query.desde); filtro += ` AND d.fecha_publicacion >= $${params.length}::date`; }
  if (fecha.test(req.query.hasta || '')) { params.push(req.query.hasta); filtro += ` AND d.fecha_publicacion < ($${params.length}::date + 1)`; }
  const limite = filtro ? 500 : 50;
  const { rows } = await pool.query(
    `SELECT d.id_donacion, d.titulo, d.categoria, d.kilos, d.estado, d.fecha_publicacion, d.fecha_caducidad,
            ud.nombre AS donante, ur.nombre AS receptor
       FROM donaciones d
       JOIN usuarios ud ON ud.id_usuario = d.id_donante
       LEFT JOIN reservas r ON r.id_donacion = d.id_donacion AND r.estado IN ('activa','completada')
       LEFT JOIN usuarios ur ON ur.id_usuario = r.id_receptor
      WHERE TRUE ${filtro}
      ORDER BY d.fecha_publicacion DESC LIMIT ${limite}`, params);
  // Resumen del mismo conjunto de filas (para el reporte)
  const recogidas = rows.filter((d) => d.estado === 'recogida');
  const kilos = recogidas.reduce((t, d) => t + Number(d.kilos), 0);
  const porCategoria = {};
  recogidas.forEach((d) => { porCategoria[d.categoria] = (porCategoria[d.categoria] || 0) + Number(d.kilos); });
  const porEstado = {};
  rows.forEach((d) => { porEstado[d.estado] = (porEstado[d.estado] || 0) + 1; });
  res.json({
    total: rows.length, donaciones: rows,
    resumen: {
      kilos_rescatados: Math.round(kilos * 100) / 100, entregas: recogidas.length, impacto: impacto(kilos),
      por_categoria: Object.entries(porCategoria).map(([categoria, k]) => ({ categoria, kilos: Math.round(k * 100) / 100 })).sort((x, y) => y.kilos - x.kilos),
      por_estado: Object.entries(porEstado).map(([estado, total]) => ({ estado, total })),
    },
  });
}));

// GET /api/admin/reports/donations.csv?desde=AAAA-MM-DD&hasta=AAAA-MM-DD  -> descarga para Excel
router.get('/reports/donations.csv', asyncHandler(async (req, res) => {
  const fecha = /^\d{4}-\d{2}-\d{2}$/;
  const params = [];
  let filtro = '';
  if (fecha.test(req.query.desde || '')) { params.push(req.query.desde); filtro += ` AND d.fecha_publicacion >= $${params.length}::date`; }
  if (fecha.test(req.query.hasta || '')) { params.push(req.query.hasta); filtro += ` AND d.fecha_publicacion < ($${params.length}::date + 1)`; }
  const { rows } = await pool.query(
    `SELECT d.id_donacion, d.titulo, d.categoria, d.kilos, d.estado, d.fecha_publicacion, d.fecha_caducidad,
            ud.nombre AS donante, ur.nombre AS receptor, r.fecha_recogida
       FROM donaciones d
       JOIN usuarios ud ON ud.id_usuario = d.id_donante
       LEFT JOIN reservas r ON r.id_donacion = d.id_donacion AND r.estado IN ('activa','completada')
       LEFT JOIN usuarios ur ON ur.id_usuario = r.id_receptor
      WHERE TRUE ${filtro} ORDER BY d.fecha_publicacion DESC`, params);
  const csv = aCsv([
    { titulo: 'ID', campo: 'id_donacion' }, { titulo: 'Alimento', campo: 'titulo' }, { titulo: 'Categoría', campo: 'categoria' },
    { titulo: 'Kilos', campo: 'kilos' }, { titulo: 'Estado', campo: 'estado' }, { titulo: 'Donante', campo: 'donante' },
    { titulo: 'Receptor', campo: 'receptor' }, { titulo: 'Publicada', campo: 'fecha_publicacion' },
    { titulo: 'Caduca', campo: 'fecha_caducidad' }, { titulo: 'Recogida', campo: 'fecha_recogida' },
  ], rows);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="rescatapp_donaciones.csv"');
  res.send(csv);
}));

module.exports = router;
