const express = require('express');
const pool = require('../db');
const { autenticar } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errores');
const { impacto, FUENTES } = require('../utils/impacto');

const router = express.Router();
router.use(autenticar);

// GET /api/impact/mine  -> impacto estimado del usuario (donante: lo que donó; receptor: lo que recibió)
router.get('/mine', asyncHandler(async (req, res) => {
  let sql;
  if (req.usuario.rol === 'donante') {
    sql = "SELECT COALESCE(SUM(kilos),0) AS kilos, COUNT(*) AS entregas FROM donaciones WHERE id_donante = $1 AND estado = 'recogida'";
  } else if (req.usuario.rol === 'receptor') {
    sql = `SELECT COALESCE(SUM(d.kilos),0) AS kilos, COUNT(*) AS entregas FROM reservas r
             JOIN donaciones d ON d.id_donacion = r.id_donacion WHERE r.id_receptor = $1 AND r.estado = 'completada'`;
  } else {
    sql = "SELECT COALESCE(SUM(kilos),0) AS kilos, COUNT(*) AS entregas FROM donaciones WHERE estado = 'recogida' AND $1::int IS NOT NULL";
  }
  const { rows } = await pool.query(sql, [req.usuario.id]);
  res.json({ ...impacto(rows[0].kilos), entregas: rows[0].entregas, fuentes: FUENTES, nota: 'Valores estimados con promedios mundiales.' });
}));

module.exports = router;
