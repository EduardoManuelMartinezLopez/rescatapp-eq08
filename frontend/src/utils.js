export const CATEGORIAS = ['Pan y repostería', 'Comida preparada', 'Frutas y verduras', 'Lácteos', 'Abarrotes', 'Otro'];
export const CENTRO_OAXACA = [17.0606, -96.7253];

export function tiempoRestante(fecha) {
  const ms = new Date(fecha).getTime() - Date.now();
  if (ms <= 0) return 'Vencida';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ${min % 60} min`;
  return `${Math.floor(h / 24)} días`;
}
export const urgente = (fecha) => new Date(fecha).getTime() - Date.now() < 4 * 3600 * 1000;
export const fechaCorta = (f) => f ? new Date(f).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// Enlace de WhatsApp (teléfonos de 10 dígitos se tratan como México, +52)
export function waLink(telefono, mensaje = '') {
  const d = String(telefono || '').replace(/\D/g, '');
  if (d.length < 10) return null;
  const numero = d.length === 10 ? `52${d}` : d;
  return `https://wa.me/${numero}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
}
// Abre la ruta hasta el punto en la app de mapas del dispositivo
export const rutaLink = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

// ---- Horario de recolección estructurado: "AAAA-MM-DD HH:mm-HH:mm" ----
export const armarHorario = (dia, desde, hasta) => `${dia} ${desde}-${hasta}`;
export function leerHorario(s) {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(s || '');
  return m ? { dia: m[1], desde: m[2], hasta: m[3] } : null;
}
const hora12 = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); const d = new Date(2000, 0, 1, h, m); return d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }); };
const fechaLocal = (d) => { const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return x.toISOString().slice(0, 10); };
export const hoyISO = () => fechaLocal(new Date());
// Texto legible: "Hoy, 8:00 p. m. a 9:00 p. m." (si es un texto libre antiguo, se muestra tal cual)
export function verHorario(s) {
  const h = leerHorario(s);
  if (!h) return s || '';
  const manana = fechaLocal(new Date(Date.now() + 86400000));
  const dia = h.dia === hoyISO() ? 'Hoy' : h.dia === manana ? 'Mañana'
    : new Date(`${h.dia}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  return `${dia}, ${hora12(h.desde)} a ${hora12(h.hasta)}`;
}
// Valor para <input type="datetime-local"> en hora local
export const inputFecha = (d) => { const x = new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000); return x.toISOString().slice(0, 16); };
