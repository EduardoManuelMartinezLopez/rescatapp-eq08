const express = require('express');
const pool = require('../db');
const { autenticar } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errores');

const router = express.Router();
router.use(autenticar);

// GET /api/notifications
router.get('/', asyncHandler(async (req, res) => {
  const lista = await pool.query(
    `SELECT id_notificacion, tipo, mensaje, enlace, leida, fecha FROM notificaciones
      WHERE id_usuario = $1 ORDER BY fecha DESC, id_notificacion DESC LIMIT 30`, [req.usuario.id]);
  const n = await pool.query('SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = $1 AND leida = FALSE', [req.usuario.id]);
  res.json({ no_leidas: n.rows[0].total, notificaciones: lista.rows });
}));

// PATCH /api/notifications/read-all
router.patch('/read-all', asyncHandler(async (req, res) => {
  await pool.query('UPDATE notificaciones SET leida = TRUE WHERE id_usuario = $1 AND leida = FALSE', [req.usuario.id]);
  res.json({ mensaje: 'Todas las notificaciones quedaron como leídas.' });
}));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador inválido.' });
  const r = await pool.query('UPDATE notificaciones SET leida = TRUE WHERE id_notificacion = $1 AND id_usuario = $2', [id, req.usuario.id]);
  if (!r.rowCount) return res.status(404).json({ error: 'La notificación no existe.' });
  res.json({ mensaje: 'Notificación leída.' });
}));

module.exports = router;
