import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Icon } from './ui.jsx';
import { fechaCorta } from '../utils.js';
import { useAuth } from '../context/AuthContext.jsx';

// A dónde lleva cada tipo de aviso: la sección correcta con su filtro activado y, si se conoce, la tarjeta exacta.
// Se decide por el tipo y el rol (no solo por el enlace guardado), así también funcionan los avisos antiguos.
function destino(n, rol) {
  let d = null, r = null;
  try { const u = new URL(n.enlace || '', 'http://x'); d = u.searchParams.get('d'); r = u.searchParams.get('r'); } catch { /* sin enlace */ }
  const don = (f) => `/mis-donaciones?f=${f}${d ? `&d=${d}` : ''}`;
  const res = (f) => `/mis-reservas?f=${f}${r ? `&r=${r}` : ''}`;
  switch (n.tipo) {
    case 'reservada': return don('reservada');
    case 'cancelada': return don('publicada');
    case 'recogida': return res('completada');
    case 'por_vencer': return res('activa');
    case 'expirada': return rol === 'donante' ? don('expirada') : res('cancelada');
    case 'calificacion': return rol === 'donante' ? don('recogida') : res('completada');
    case 'nueva_donacion': return n.enlace || '/mapa';
    case 'org_pendiente': return '/admin/organizaciones?f=pendiente';
    case 'validacion': return n.enlace || '/perfil';
    default: return n.enlace || null;
  }
}

const ICONOS = { reservada: 'shopping_basket', recogida: 'check_circle', cancelada: 'event_busy', expirada: 'timer_off', por_vencer: 'schedule',
  nueva_donacion: 'volunteer_activism', validacion: 'verified_user', org_pendiente: 'pending_actions', calificacion: 'star' };

// Campana de notificaciones: consulta al servidor cada 15 segundos
export default function Campana() {
  const nav = useNavigate();
  const { usuario } = useAuth();
  const [abierta, setAbierta] = useState(false);
  const [datos, setDatos] = useState({ no_leidas: 0, notificaciones: [] });
  const [sacude, setSacude] = useState(false);
  const previas = useRef(0);
  const caja = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const d = await api('/notifications');
      if (d.no_leidas > previas.current) { setSacude(true); setTimeout(() => setSacude(false), 900); }
      previas.current = d.no_leidas; setDatos(d);
    } catch { /* si falla, se reintenta en el siguiente ciclo */ }
  }, []);

  useEffect(() => { cargar(); const t = setInterval(cargar, 15000); return () => clearInterval(t); }, [cargar]);
  useEffect(() => {
    const fuera = (e) => caja.current && !caja.current.contains(e.target) && setAbierta(false);
    document.addEventListener('mousedown', fuera); return () => document.removeEventListener('mousedown', fuera);
  }, []);

  async function abrir(n) {
    setAbierta(false);
    if (!n.leida) { await api(`/notifications/${n.id_notificacion}/read`, { method: 'PATCH' }).catch(() => {}); cargar(); }
    const ruta = destino(n, usuario?.rol);
    if (ruta) nav(ruta);
  }
  async function quitarLeidas() { await api('/notifications/read', { method: 'DELETE' }).catch(() => {}); cargar(); }
  async function todas() { await api('/notifications/read-all', { method: 'PATCH' }).catch(() => {}); cargar(); }

  return (
    <div className="sm:relative" ref={caja}>
      <button onClick={() => { setAbierta(!abierta); if (!abierta) cargar(); }} className="relative w-11 h-11 rounded-xl hover:bg-surface-container grid place-items-center" aria-label={`Notificaciones (${datos.no_leidas} sin leer)`}>
        <Icon name="notifications" className={`text-[26px] ${sacude ? 'animate-campana' : ''}`} />
        {datos.no_leidas > 0 && <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-secondary text-on-secondary text-[11px] font-bold grid place-items-center animate-pop">{datos.no_leidas > 9 ? '9+' : datos.no_leidas}</span>}
      </button>
      {abierta && (
        <div className="absolute left-3 right-3 top-full mt-2 sm:left-auto sm:right-0 sm:top-auto sm:w-[360px] card shadow-xl overflow-hidden animate-pop z-[1500]">
          <div className="flex justify-between items-center px-4 py-3 border-b border-outline-variant/60">
            <b>Notificaciones</b>
            <span className="flex gap-3">
              {datos.no_leidas > 0 && <button onClick={todas} className="text-sm font-semibold text-primary">Marcar todas</button>}
              {datos.notificaciones.some((n) => n.leida) && <button onClick={quitarLeidas} className="text-sm font-semibold text-on-surface-variant">Quitar leídas</button>}
            </span>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {datos.notificaciones.length === 0 && <li className="p-6 text-center text-sm text-on-surface-variant">Sin notificaciones por ahora.</li>}
            {datos.notificaciones.map((n) => (
              <li key={n.id_notificacion}>
                <button onClick={() => abrir(n)} className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-surface-container-low ${n.leida ? '' : 'bg-primary-container/10'}`}>
                  <Icon name={ICONOS[n.tipo] || 'notifications'} className="text-primary mt-0.5" />
                  <span className="flex-1 text-sm"><span className={n.leida ? '' : 'font-semibold'}>{n.mensaje}</span>
                    <span className="block text-xs text-outline mt-0.5">{fechaCorta(n.fecha)}</span></span>
                  {!n.leida && <span className="w-2 h-2 mt-2 rounded-full bg-secondary" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
