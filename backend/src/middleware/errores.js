// Evita repetir try/catch en cada ruta
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function noEncontrada(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}

// Manejador central de errores
function manejarErrores(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = { asyncHandler, noEncontrada, manejarErrores };
