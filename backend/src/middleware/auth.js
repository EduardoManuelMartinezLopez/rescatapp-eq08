const jwt = require('jsonwebtoken');

// Verifica el token JWT que llega en la cabecera:  Authorization: Bearer <token>
function autenticar(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Falta el token de autenticación.' });
  }
  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.usuario = { id: datos.id, rol: datos.rol };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

// Permite el paso solo a ciertos roles:  requerirRol('donante')
const requerirRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' });
  }
  next();
};

module.exports = { autenticar, requerirRol };
