// Validaciones sencillas (sin librerías externas)
const CATEGORIAS = ['Pan y repostería', 'Comida preparada', 'Frutas y verduras', 'Lácteos', 'Abarrotes', 'Otro'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

function validarRegistro(b = {}) {
  const e = [];
  if (texto(b.nombre).length < 3) e.push('El nombre debe tener al menos 3 caracteres.');
  if (!EMAIL_RE.test(texto(b.correo))) e.push('El correo no es válido.');
  if (typeof b.password !== 'string' || b.password.length < 8) e.push('La contraseña debe tener al menos 8 caracteres.');
  if (!['donante', 'receptor'].includes(b.rol)) e.push('El rol debe ser "donante" o "receptor".');
  return e;
}

function validarDonacion(b = {}) {
  const e = [];
  if (texto(b.titulo).length < 3) e.push('El título es obligatorio (mínimo 3 caracteres).');
  if (!CATEGORIAS.includes(b.categoria)) e.push('La categoría no es válida.');
  const kilos = Number(b.kilos);
  if (!Number.isFinite(kilos) || kilos <= 0 || kilos > 99999) e.push('Los kilos deben ser un número mayor que 0.');
  if (texto(b.direccion).length < 5) e.push('La dirección es obligatoria.');
  const lat = Number(b.latitud), lng = Number(b.longitud);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) e.push('La latitud no es válida.');
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) e.push('La longitud no es válida.');
  if (b.acepta_buena_fe !== true) e.push('Debes aceptar la declaración de buena fe.');
  const f = new Date(b.fecha_caducidad);
  if (!b.fecha_caducidad || Number.isNaN(f.getTime())) e.push('La fecha de caducidad es obligatoria.');
  else if (f.getTime() <= Date.now()) e.push('La fecha de caducidad debe ser posterior a este momento.');
  return e;
}

module.exports = { CATEGORIAS, texto, validarRegistro, validarDonacion };
