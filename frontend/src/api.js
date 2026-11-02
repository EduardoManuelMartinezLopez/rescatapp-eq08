// Pequeño cliente para hablar con el backend. Agrega el token JWT automáticamente.
const TOKEN_KEY = 'rescatapp_token';

export const guardarToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignorar */ }
};
export const leerToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };

export async function api(ruta, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = leerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`/api${ruta}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend?');
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(datos.detalles?.join(' ') || datos.error || 'Ocurrió un error.');
    err.status = res.status;
    throw err;
  }
  return datos;
}

// Descarga un archivo protegido (por ejemplo el CSV del administrador)
export async function descargar(ruta, nombreArchivo) {
  const token = leerToken();
  const res = await fetch(`/api${ruta}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'No se pudo descargar el archivo.');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = nombreArchivo; a.click();
  URL.revokeObjectURL(url);
}
