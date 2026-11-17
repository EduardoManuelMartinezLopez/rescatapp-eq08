// Validaciones (sin librerías externas). Las reglas de correo/nombre/contraseña viven en reglas.js,
// que se comparte con el frontend para que el formulario y el servidor validen exactamente lo mismo.
const R = require('./reglas');

const CATEGORIAS = ['Pan y repostería', 'Comida preparada', 'Frutas y verduras', 'Lácteos', 'Abarrotes', 'Otro'];
const MAX_KILOS = 1000;          // tope de kilos por donación
const MAX_DIAS_CADUCIDAD = 30;   // la caducidad no puede ser a más de 30 días

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

function validarRegistro(b = {}) {
  const e = [];
  const n = R.validarNombre(b.nombre); if (n) e.push(n);
  const c = R.validarCorreo(b.correo); if (c) e.push(c);
  e.push(...R.validarPassword(b.password, { correo: texto(b.correo), nombre: texto(b.nombre) }));
  const t = R.validarTelefono(b.telefono); if (t) e.push(t);
  if (b.direccion && R.limpiarTexto(b.direccion, 400).length > 200) e.push('La dirección es demasiado larga (máximo 200 caracteres).');
  if (!['donante', 'receptor'].includes(b.rol)) e.push('El rol debe ser "donante" o "receptor".');
  if (b.acepta_terminos !== true) e.push('Debes aceptar el aviso de privacidad y los términos de uso.');
  return e;
}

function validarDonacion(b = {}) {
  const e = [];
  const titulo = R.limpiarTexto(b.titulo, 500);
  if (titulo.length < 3) e.push('El título es obligatorio (mínimo 3 caracteres).');
  else if (titulo.length > 100) e.push('El título es demasiado largo (máximo 100 caracteres).');
  if (!CATEGORIAS.includes(b.categoria)) e.push('La categoría no es válida.');
  const kilos = Number(b.kilos);
  if (!Number.isFinite(kilos) || kilos <= 0) e.push('Los kilos deben ser un número mayor que 0.');
  else if (kilos > MAX_KILOS) e.push(`Los kilos no pueden pasar de ${MAX_KILOS} por donación.`);
  const dir = R.limpiarTexto(b.direccion, 500);
  if (dir.length < 5) e.push('La dirección es obligatoria (mínimo 5 caracteres).');
  else if (dir.length > 200) e.push('La dirección es demasiado larga (máximo 200 caracteres).');
  if (b.descripcion && R.limpiarTexto(b.descripcion, 2000).length > 500) e.push('La descripción es demasiado larga (máximo 500 caracteres).');
  const lat = Number(b.latitud), lng = Number(b.longitud);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) e.push('La latitud no es válida.');
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) e.push('La longitud no es válida.');
  if (b.acepta_buena_fe !== true) e.push('Debes aceptar la declaración de buena fe.');
  const f = new Date(b.fecha_caducidad);
  if (!b.fecha_caducidad || Number.isNaN(f.getTime())) e.push('La fecha de caducidad es obligatoria.');
  else if (f.getTime() <= Date.now()) e.push('La fecha de caducidad debe ser posterior a este momento.');
  else if (f.getTime() > Date.now() + MAX_DIAS_CADUCIDAD * 86400000) e.push(`La fecha de caducidad no puede ser a más de ${MAX_DIAS_CADUCIDAD} días.`);
  return e;
}

module.exports = { CATEGORIAS, MAX_KILOS, MAX_DIAS_CADUCIDAD, texto, validarRegistro, validarDonacion, ...R };
