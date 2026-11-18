const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { autenticar } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errores');
const { texto, limpiarTexto, validarRegistro, validarCorreo, validarNombre, validarTelefono, validarDireccion, validarUbicacion, validarPassword } = require('../utils/validar');
const { crearLimitador, limitarPeticiones, minutos } = require('../utils/limitador');
const { enviarCorreo, plantillaHtml } = require('../services/correo');
const { notificar } = require('../services/notificaciones');

const router = express.Router();

// Intentos de inicio de sesión: solo cuentan los FALLOS, por IP + correo (5 fallos = 15 min de espera)
const fallosLogin = crearLimitador({ max: 5, ventanaMs: 15 * 60 * 1000 });
// Solicitudes de recuperación y reenvíos de verificación: máximo 5 por IP cada 15 minutos
const limitarForgot = limitarPeticiones({ max: 5, ventanaMs: 15 * 60 * 1000, mensaje: 'Hiciste demasiadas solicitudes.' });
const limitarReenvio = limitarPeticiones({ max: 5, ventanaMs: 15 * 60 * 1000, mensaje: 'Hiciste demasiadas solicitudes.' });
// Registros: máximo 40 por IP cada hora (evita crear cuentas en masa)
const limitarRegistro = limitarPeticiones({ max: 40, ventanaMs: 60 * 60 * 1000, mensaje: 'Se crearon demasiadas cuentas desde esta red.' });
router.limpiarLimites = () => { fallosLogin.limpiarTodo(); limitarForgot.limpiar(); limitarReenvio.limpiar(); limitarRegistro.limpiar(); };

const publico = (u, extra = {}) => ({
  id_usuario: u.id_usuario, nombre: u.nombre, correo: u.correo, rol: u.rol,
  telefono: u.telefono, direccion: u.direccion, estado_validacion: u.estado_validacion,
  con_google: !!u.google_id, password_definida: u.password_definida, correo_verificado: !!u.correo_verificado, ...extra,
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

// Crea un enlace de verificación (vence en 24 h) y lo envía por correo. Nunca lanza error.
async function enviarVerificacion(u) {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query('UPDATE verificaciones_correo SET usado = TRUE WHERE id_usuario = $1 AND usado = FALSE', [u.id_usuario]);
    await pool.query(
      "INSERT INTO verificaciones_correo (id_usuario, token_hash, expira) VALUES ($1,$2, NOW() + INTERVAL '24 hours')",
      [u.id_usuario, sha256(token)]);
    const enlace = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verificar?token=${token}`;
    await enviarCorreo({
      para: u.correo, asunto: 'Confirma tu correo en RescatApp',
      texto: `Hola ${u.nombre}:\n\nConfirma tu correo abriendo este enlace (vence en 24 horas):\n${enlace}\n\nSi no creaste la cuenta, ignora este mensaje.`,
      html: plantillaHtml({
        titulo: 'Confirma tu correo',
        parrafos: [`Hola ${u.nombre}:`, 'Gracias por registrarte. Confirma que este correo es tuyo para proteger tu cuenta. El enlace vence en 24 horas.'],
        boton: { texto: 'Confirmar mi correo', url: enlace },
        pie: 'Si no creaste una cuenta en RescatApp, ignora este mensaje.',
      }),
    });
    return process.env.DEV_SHOW_RESET_LINK === 'true' ? enlace : null;
  } catch (e) { console.error('[CORREO] No se pudo enviar la verificación:', e.message); return null; }
}

// POST /api/auth/register
router.post('/register', limitarRegistro, asyncHandler(async (req, res) => {
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
      [limpiarTexto(nombre, 100).replace(/\s+/g, ' '), texto(correo).toLowerCase(), hash, rol, texto(telefono), limpiarTexto(direccion, 200).replace(/\s+/g, ' '), estado]
    );
    if (rol === 'receptor') await avisarAdmins(pool, rows[0].nombre);
    const enlaceDev = await enviarVerificacion(rows[0]);
    const extra = enlaceDev ? { enlace_verificacion_dev: enlaceDev } : {};
    res.status(201).json({ mensaje: 'Cuenta creada correctamente. Te enviamos un correo para confirmar tu dirección.', usuario: publico(rows[0]), token: firmar(rows[0]), ...extra });
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
  const clave = `${req.ip}|${correo}`;
  const espera = fallosLogin.bloqueado(clave);
  if (espera) {
    res.set('Retry-After', String(espera));
    return res.status(429).json({ error: `Demasiados intentos fallidos. Por seguridad, espera ${minutos(espera)} minuto(s) e inténtalo de nuevo, o usa «¿Olvidaste tu contraseña?».` });
  }
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
  const u = rows[0];
  // Mismo mensaje si el correo no existe o la contraseña falla (no revelamos cuál)
  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    fallosLogin.registrar(clave);
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }
  fallosLogin.reiniciar(clave);
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
      u = (await pool.query('UPDATE usuarios SET google_id = $1, correo_verificado = TRUE WHERE id_usuario = $2 RETURNING *', [perfil.sub, u.id_usuario])).rows[0];
    }
    return res.json({ token: firmar(u), usuario: publico(u) });
  }
  // Cuenta nueva: necesitamos saber si será donante o receptor
  if (!rol) return res.json({ necesita_rol: true, perfil: { nombre: perfil.name || correo, correo } });
  if (!['donante', 'receptor'].includes(rol)) return res.status(400).json({ error: 'El rol debe ser "donante" o "receptor".' });

  const hashAleatorio = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const nuevo = (await pool.query(
    `INSERT INTO usuarios (nombre, correo, password_hash, rol, estado_validacion, google_id, password_definida, correo_verificado)
     VALUES ($1,$2,$3,$4,$5,$6,FALSE,TRUE) RETURNING *`,
    [texto(perfil.name || correo).slice(0, 120), correo, hashAleatorio, rol, rol === 'receptor' ? 'pendiente' : 'aprobada', perfil.sub])).rows[0];
  if (rol === 'receptor') await avisarAdmins(pool, nuevo.nombre);
  res.status(201).json({ token: firmar(nuevo), usuario: publico(nuevo) });
}));

// POST /api/auth/forgot  { correo }  -> siempre responde igual (no revela si el correo existe)
router.post('/forgot', limitarForgot, asyncHandler(async (req, res) => {
  const correo = texto(req.body?.correo).toLowerCase();
  const respuesta = { mensaje: 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Vence en 30 minutos.' };
  const errCorreo = validarCorreo(correo);
  if (errCorreo) return res.status(400).json({ error: errCorreo });

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
        html: plantillaHtml({
          titulo: 'Restablece tu contraseña',
          parrafos: [`Hola ${rows[0].nombre}:`, 'Recibimos una solicitud para crear una nueva contraseña en tu cuenta. El enlace vence en 30 minutos y solo se puede usar una vez.'],
          boton: { texto: 'Crear nueva contraseña', url: enlace },
          pie: 'Si no lo pediste tú, ignora este mensaje: tu contraseña actual no cambiará.',
        }),
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM password_resets WHERE token_hash = $1 AND usado = FALSE AND expira > NOW() FOR UPDATE', [sha256(token)]);
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'El enlace no es válido o ya venció.' }); }
    const dueno = (await client.query('SELECT nombre, correo FROM usuarios WHERE id_usuario = $1', [rows[0].id_usuario])).rows[0];
    const errPw = validarPassword(password, dueno);
    if (errPw.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Contraseña no válida.', detalles: errPw }); }
    await client.query('UPDATE usuarios SET password_hash = $1, password_definida = TRUE WHERE id_usuario = $2',
      [await bcrypt.hash(password, 10), rows[0].id_usuario]);
    await client.query('UPDATE password_resets SET usado = TRUE WHERE id_usuario = $1', [rows[0].id_usuario]);
    // Si abrió el enlace desde su correo, también queda comprobado que el correo es suyo
    await client.query('UPDATE usuarios SET correo_verificado = TRUE WHERE id_usuario = $1', [rows[0].id_usuario]);
    fallosLogin.limpiarTodo();
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
  const nombre = limpiarTexto(req.body?.nombre, 100).replace(/\s+/g, ' ');
  const telefono = texto(req.body?.telefono);
  const direccion = limpiarTexto(req.body?.direccion, 300);
  const actual = (await pool.query('SELECT rol, direccion FROM usuarios WHERE id_usuario = $1', [req.usuario.id])).rows[0];
  if (!actual) return res.status(401).json({ error: 'El usuario ya no existe.' });
  const esAdmin = actual.rol === 'admin';
  const errores = [validarNombre(nombre), validarTelefono(telefono, !esAdmin)];
  if (!esAdmin || direccion) errores.push(validarDireccion(direccion));
  // Si cambió la dirección, debe venir de un punto real del mapa
  if (direccion && direccion !== (actual.direccion || '')) errores.push(validarUbicacion(req.body?.latitud, req.body?.longitud));
  const malos = errores.filter(Boolean);
  if (malos.length) return res.status(400).json({ error: malos[0], detalles: malos });
  const { rows } = await pool.query(
    'UPDATE usuarios SET nombre = $1, telefono = $2, direccion = $3 WHERE id_usuario = $4 RETURNING *',
    [nombre, telefono || null, direccion || null, req.usuario.id]);
  res.json({ mensaje: 'Perfil actualizado.', usuario: publico(rows[0]) });
}));

// PATCH /api/auth/password  { actual?, nueva }
router.patch('/password', autenticar, asyncHandler(async (req, res) => {
  const { actual, nueva } = req.body || {};
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);
  const u = rows[0];
  const errPw = validarPassword(nueva, u);
  if (errPw.length) return res.status(400).json({ error: 'Contraseña no válida.', detalles: errPw });
  if (u.password_definida && !(await bcrypt.compare(String(actual || ''), u.password_hash))) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
  }
  if (u.password_definida && actual === nueva) return res.status(400).json({ error: 'La nueva contraseña debe ser distinta de la actual.' });
  await pool.query('UPDATE usuarios SET password_hash = $1, password_definida = TRUE WHERE id_usuario = $2',
    [await bcrypt.hash(nueva, 10), req.usuario.id]);
  res.json({ mensaje: 'Contraseña actualizada.' });
}));

// POST /api/auth/verify  { token }  -> confirma el correo con el enlace recibido
router.post('/verify', asyncHandler(async (req, res) => {
  const { token } = req.body || {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'El enlace no es válido o ya venció.' });
  const { rows } = await pool.query(
    'UPDATE verificaciones_correo SET usado = TRUE WHERE token_hash = $1 AND usado = FALSE AND expira > NOW() RETURNING id_usuario', [sha256(token)]);
  if (!rows[0]) return res.status(400).json({ error: 'El enlace no es válido o ya venció. Pide uno nuevo desde tu cuenta.' });
  await pool.query('UPDATE usuarios SET correo_verificado = TRUE WHERE id_usuario = $1', [rows[0].id_usuario]);
  res.json({ mensaje: 'Correo confirmado. ¡Gracias!' });
}));

// POST /api/auth/resend-verification  (con sesión iniciada)
router.post('/resend-verification', autenticar, limitarReenvio, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);
  const u = rows[0];
  if (!u) return res.status(401).json({ error: 'El usuario ya no existe.' });
  if (u.correo_verificado) return res.json({ mensaje: 'Tu correo ya está confirmado.' });
  const enlaceDev = await enviarVerificacion(u);
  res.json({ mensaje: 'Te enviamos un nuevo enlace. Revisa tu bandeja de entrada y la carpeta de spam.', ...(enlaceDev ? { enlace_dev: enlaceDev } : {}) });
}));

module.exports = router;
