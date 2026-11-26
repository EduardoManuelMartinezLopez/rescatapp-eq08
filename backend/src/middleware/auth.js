const jwt = require('jsonwebtoken');
const pool = require('../db');

// Verifica el token JWT que llega en la cabecera:  Authorization: Bearer <token>
async function autenticar(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Falta el token de autenticación.' });
  }
  let datos;
  try {
    datos = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
  req.usuario = { id: datos.id, rol: datos.rol };
  try {
    // Si la contraseña se restableció después de emitir este token, la sesión ya no es válida
    const u = await pool.query('SELECT sesion_desde FROM usuarios WHERE id_usuario = $1', [datos.id]);
    if (u.rows[0]?.sesion_desde && datos.iat < Math.floor(new Date(u.rows[0].sesion_desde).getTime() / 1000)) {
      return res.status(401).json({ error: 'Tu sesión se cerró porque cambió la contraseña. Inicia sesión de nuevo.' });
    }
  } catch (err) {
    return next(err); // un error de base de datos es un 500, no un token inválido
  }
  next();
}

// Permite el paso solo a ciertos roles:  requerirRol('donante')
const requerirRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' });
  }
  next();
};

module.exports = { autenticar, requerirRol };
