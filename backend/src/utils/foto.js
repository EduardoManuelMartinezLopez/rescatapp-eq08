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
  // Revisa los primeros bytes: el contenido debe ser realmente del tipo que dice ser
  const b = buffer;
  const real = b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? 'image/jpeg'
    : b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'image/png'
    : b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' ? 'image/webp'
    : null;
  if (real !== m[1]) return { ok: false, error: 'El archivo no es una imagen válida (JPG, PNG o WEBP).' };
  return { ok: true, foto: { buffer, tipo: m[1] } };
}
module.exports = { leerFoto, MAX_BYTES };
