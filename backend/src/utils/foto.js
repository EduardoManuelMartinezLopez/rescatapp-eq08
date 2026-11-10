// Valida una imagen enviada como "data URL" (el navegador la redimensiona antes).
const MAX_BYTES = 400 * 1024;
const RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

function leerFoto(dataUrl) {
  if (dataUrl === undefined || dataUrl === null || dataUrl === '') return { ok: true, foto: null };
  if (typeof dataUrl !== 'string') return { ok: false, error: 'La foto no es válida.' };
  const m = RE.exec(dataUrl);
  if (!m) return { ok: false, error: 'La foto debe ser una imagen JPG, PNG o WEBP.' };
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length === 0 || buffer.length > MAX_BYTES) return { ok: false, error: 'La foto es demasiado grande (máximo 400 KB).' };
  return { ok: true, foto: { buffer, tipo: m[1] } };
}
module.exports = { leerFoto, MAX_BYTES };
