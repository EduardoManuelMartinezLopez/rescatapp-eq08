const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { autenticar } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errores');
const { texto, validarRegistro } = require('../utils/validar');
const { enviarCorreo } = require('../services/correo');
const { notificar } = require('../services/notificaciones');

const router = express.Router();

const publico = (u, extra = {}) => ({
  id_usuario: u.id_usuario, nombre: u.nombre, correo: u.correo, rol: u.rol,
  telefono: u.telefono, direccion: u.direccion, estado_validacion: u.estado_validacion,
  con_google: !!u.google_id, password_definida: u.password_definida, ...extra,
});

const firmar = (u) =>
  jwt.sign({ id: u.id_usuario, rol: u.rol }, process.env.JWT_SECRET, {
    algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES || '8h',
  });

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Avisa a los administradores que hay una organización nueva por validar
async function avisarAdmins(db, nombre) {
  await db.query(
    `INSERT INTO notificaciones (id_usuario, tipo, mensaje, enlace)
     SELECT id_usuario, 'org_pendiente', $1, '/admin/organizaciones' FROM usuarios WHERE rol = 'admin'`,
    [`Nueva organización por validar: ${nombre}.`]);
}

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const errores = validarRegistro(req.body);
  if (errores.length) return res.status(400).json({ error: 'Datos inválidos.', detalles: errores });

  const { nombre, correo, password, rol, telefono, direccion } = req.body;
  const hash = await bcrypt.hash(password, 10);
  // RD-04: los receptores quedan "pendiente" hasta que un administrador los apruebe
  const estado = rol === 'receptor' ? 'pendiente' : 'aprobada';
  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, correo, password_hash, rol, telefono, direccion, estado_validacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [texto(nombre), texto(correo).toLowerCase(), hash, rol, texto(telefono) || null, texto(direccion) || null, estado]
    );
    if (rol === 'receptor') await avisarAdmins(pool, rows[0].nombre);
    res.status(201).json({ mensaje: 'Cuenta creada correctamente.', usuario: publico(rows[0]), token: firmar(rows[0]) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    throw err;
  }
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const correo = texto(req.body?.correo).toLowerCase();
  const password = req.body?.password;
  if (!correo || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  }
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
  const u = rows[0];
  // Mismo mensaje si el correo no existe o la contraseña falla (no revelamos cuál)
  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }
  res.json({ token: firmar(u), usuario: publico(u) });
}));

// POST /api/auth/google  { credential, rol? }
// "credential" es el token que entrega el botón de Google. Lo verificamos con Google.
router.post('/google', asyncHandler(async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'El inicio de sesión con Google no está configurado en el servidor.' });
  const { credential, rol } = req.body || {};
  if (typeof credential !== 'string' || !credential) return res.status(400).json({ error: 'Falta la credencial de Google.' });

  let perfil;
  try {
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
    if (!r.ok) return res.status(401).json({ error: 'La credencial de Google no es válida.' });
    perfil = await r.json();
  } catch {
    return res.status(502).json({ error: 'No se pudo verificar la credencial con Google.' });
  }
  const emisorOk = ['accounts.google.com', 'https://accounts.google.com'].includes(perfil.iss);
  const verificado = perfil.email_verified === true || perfil.email_verified === 'true';
  if (perfil.aud !== process.env.GOOGLE_CLIENT_ID || !emisorOk || !verificado || !perfil.email) {
    return res.status(401).json({ error: 'La credencial de Google no es válida para esta aplicación.' });
  }

  const correo = perfil.email.toLowerCase();
  const existente = await pool.query('SELECT * FROM usuarios WHERE google_id = $1 OR correo = $2', [perfil.sub, correo]);
  let u = existente.rows[0];
  if (u) {
    if (!u.google_id) { // cuenta creada con contraseña: se vincula con Google (el correo ya está verificado por Google)
      u = (await pool.query('UPDATE usuarios SET google_id = $1 WHERE id_usuario = $2 RETURNING *', [perfil.sub, u.id_usuario])).rows[0];
    }
    return res.json({ token: firmar(u), usuario: publico(u) });
  }
  // Cuenta nueva: necesitamos saber si será donante o receptor
  if (!rol) return res.json({ necesita_rol: true, perfil: { nombre: perfil.name || correo, correo } });
  if (!['donante', 'receptor'].includes(rol)) return res.status(400).json({ error: 'El rol debe ser "donante" o "receptor".' });

  const hashAleatorio = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const nuevo = (await pool.query(
    `INSERT INTO usuarios (nombre, correo, password_hash, rol, estado_validacion, google_id, password_definida)
     VALUES ($1,$2,$3,$4,$5,$6,FALSE) RETURNING *`,
    [texto(perfil.name || correo).slice(0, 120), correo, hashAleatorio, rol, rol === 'receptor' ? 'pendiente' : 'aprobada', perfil.sub])).rows[0];
  if (rol === 'receptor') await avisarAdmins(pool, nuevo.nombre);
  res.status(201).json({ token: firmar(nuevo), usuario: publico(nuevo) });
}));

// POST /api/auth/forgot  { correo }  -> siempre responde igual (no revela si el correo existe)
router.post('/forgot', asyncHandler(async (req, res) => {
  const correo = texto(req.body?.correo).toLowerCase();
  const respuesta = { mensaje: 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Vence en 30 minutos.' };
  if (!correo) return res.status(400).json({ error: 'Escribe tu correo.' });

  const { rows } = await pool.query('SELECT id_usuario, nombre FROM usuarios WHERE correo = $1', [correo]);
  if (rows[0]) {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query('UPDATE password_resets SET usado = TRUE WHERE id_usuario = $1 AND usado = FALSE', [rows[0].id_usuario]);
    await pool.query(
      "INSERT INTO password_resets (id_usuario, token_hash, expira) VALUES ($1,$2, NOW() + INTERVAL '30 minutes')",
      [rows[0].id_usuario, sha256(token)]);
    const enlace = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/restablecer?token=${token}`;
    try {
      await enviarCorreo({
        para: correo, asunto: 'Restablece tu contraseña de RescatApp',
        texto: `Hola ${rows[0].nombre}:\n\nPara crear una nueva contraseña abre este enlace (vence en 30 minutos):\n${enlace}\n\nSi no lo pediste tú, ignora este mensaje.`,
      });
    } catch (e) { console.error('[CORREO] No se pudo enviar:', e.message); }
    if (process.env.DEV_SHOW_RESET_LINK === 'true') respuesta.enlace_dev = enlace;
  }
  res.json(respuesta);
}));

// POST /api/auth/reset  { token, password }
router.post('/reset', asyncHandler(async (req, res) => {
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'El enlace no es válido o ya venció.' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM password_resets WHERE token_hash = $1 AND usado = FALSE AND expira > NOW() FOR UPDATE', [sha256(token)]);
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'El enlace no es válido o ya venció.' }); }
    await client.query('UPDATE usuarios SET password_hash = $1, password_definida = TRUE WHERE id_usuario = $2',
      [await bcrypt.hash(password, 10), rows[0].id_usuario]);
    await client.query('UPDATE password_resets SET usado = TRUE WHERE id_usuario = $1', [rows[0].id_usuario]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}));

// GET /api/auth/me
router.get('/me', autenticar, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);
  if (!rows[0]) return res.status(401).json({ error: 'El usuario ya no existe.' });
  const cal = await pool.query(
    'SELECT ROUND(AVG(estrellas)::numeric, 1) AS promedio, COUNT(*) AS total FROM calificaciones WHERE id_destino = $1', [req.usuario.id]);
  res.json({ usuario: publico(rows[0], { calificacion: { promedio: cal.rows[0].promedio, total: cal.rows[0].total } }) });
}));

// PATCH /api/auth/me  { nombre, telefono, direccion }
router.patch('/me', autenticar, asyncHandler(async (req, res) => {
  const nombre = texto(req.body?.nombre);
  const telefono = texto(req.body?.telefono);
  const direccion = texto(req.body?.direccion);
  if (nombre.length < 3) return res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres.' });
  if (telefono && !/^[0-9+()\-\s]{7,20}$/.test(telefono)) return res.status(400).json({ error: 'El teléfono no es válido.' });
  const { rows } = await pool.query(
    'UPDATE usuarios SET nombre = $1, telefono = $2, direccion = $3 WHERE id_usuario = $4 RETURNING *',
    [nombre, telefono || null, direccion || null, req.usuario.id]);
  res.json({ mensaje: 'Perfil actualizado.', usuario: publico(rows[0]) });
}));

// PATCH /api/auth/password  { actual?, nueva }
router.patch('/password', autenticar, asyncHandler(async (req, res) => {
  const { actual, nueva } = req.body || {};
  if (typeof nueva !== 'string' || nueva.length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);
  const u = rows[0];
  if (u.password_definida && !(await bcrypt.compare(String(actual || ''), u.password_hash))) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
  }
  await pool.query('UPDATE usuarios SET password_hash = $1, password_definida = TRUE WHERE id_usuario = $2',
    [await bcrypt.hash(nueva, 10), req.usuario.id]);
  res.json({ mensaje: 'Contraseña actualizada.' });
}));

module.exports = router;
