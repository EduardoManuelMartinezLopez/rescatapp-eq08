const express = require('express');
const pool = require('../db');
const { autenticar } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errores');
const { texto } = require('../utils/validar');
const { notificar } = require('../services/notificaciones');

const router = express.Router();
router.use(autenticar);

// POST /api/ratings  { id_reserva, estrellas, comentario? }
// Solo participantes de una reserva COMPLETADA, y una sola vez por autor.
router.post('/', asyncHandler(async (req, res) => {
  const idReserva = parseInt(req.body?.id_reserva, 10);
  const estrellas = Number(req.body?.estrellas);
  const comentario = texto(req.body?.comentario).slice(0, 300);
  if (!Number.isInteger(idReserva)) return res.status(400).json({ error: 'id_reserva es obligatorio.' });
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) return res.status(400).json({ error: 'Las estrellas deben ser un número del 1 al 5.' });

  const { rows } = await pool.query(
    `SELECT r.id_reserva, r.estado, r.id_receptor, d.id_donante, d.titulo
       FROM reservas r JOIN donaciones d ON d.id_donacion = r.id_donacion WHERE r.id_reserva = $1`, [idReserva]);
  const r = rows[0];
  if (!r) return res.status(404).json({ error: 'La reserva no existe.' });
  const yo = req.usuario.id;
  if (yo !== r.id_receptor && yo !== r.id_donante) return res.status(403).json({ error: 'No participaste en esta reserva.' });
  if (r.estado !== 'completada') return res.status(409).json({ error: 'Solo se puede calificar cuando la recolección fue confirmada.' });
  const destino = yo === r.id_receptor ? r.id_donante : r.id_receptor;
  try {
    const ins = await pool.query(
      'INSERT INTO calificaciones (id_reserva, id_autor, id_destino, estrellas, comentario) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [idReserva, yo, destino, estrellas, comentario || null]);
    await notificar(pool, destino, 'calificacion', `Recibiste una calificación de ${estrellas} ★ por "${r.titulo}".`, null);
    res.status(201).json({ mensaje: 'Gracias por tu calificación.', calificacion: ins.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya calificaste esta reserva.' });
    throw err;
  }
}));

// GET /api/ratings/user/:id  -> promedio y últimas reseñas
router.get('/user/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador inválido.' });
  const resumen = await pool.query(
    'SELECT ROUND(AVG(estrellas)::numeric, 1) AS promedio, COUNT(*) AS total FROM calificaciones WHERE id_destino = $1', [id]);
  const recientes = await pool.query(
    `SELECT c.estrellas, c.comentario, c.fecha, u.nombre AS autor
       FROM calificaciones c JOIN usuarios u ON u.id_usuario = c.id_autor
      WHERE c.id_destino = $1 ORDER BY c.fecha DESC LIMIT 5`, [id]);
  res.json({ ...resumen.rows[0], recientes: recientes.rows });
}));

module.exports = router;
