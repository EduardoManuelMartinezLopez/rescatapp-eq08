import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alerta, Cargando, Estrellas, FotoDonacion, Icon, Vacio } from '../components/ui.jsx';
import { useActualizar } from '../useActualizar.js';
import { CATEGORIAS, CENTRO_OAXACA, fechaCorta, rutaLink, tiempoRestante, urgente, verHorario } from '../utils.js';

// Marcador en forma de "pastilla" con los kilos (evita usar imágenes de iconos)
const icono = (kilos, activo, uurg) => L.divIcon({
  className: '',
  html: `<div style="background:${uurg ? '#944a00' : '#006d37'};color:#fff;font-weight:700;font-size:13px;padding:6px 10px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.35);border:${activo ? '3px solid #fff' : '2px solid #fff'};transform:${activo ? 'scale(1.2)' : 'none'}">${kilos} kg</div>`,
  iconSize: [64, 30], iconAnchor: [32, 15],
});

// Mueve el mapa a la donación elegida. Si el mapa está oculto (celular, pestaña "Lista") no se mueve:
// con tamaño 0 Leaflet calcula coordenadas NaN y la pantalla se quedaba en blanco.
function Enfocar({ donacion, dep }) {
  const map = useMap();
  useEffect(() => {
    if (!donacion) return undefined;
    const lat = Number(donacion.latitud), lng = Number(donacion.longitud);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    const t = setTimeout(() => {
      map.invalidateSize();
      const s = map.getSize();
      if (s.x > 0 && s.y > 0) map.flyTo([lat, lng], 16, { duration: 0.6 });
    }, 80);
    return () => clearTimeout(t);
  }, [donacion, dep, map]);
  return null;
}

// Tocar una zona vacía del mapa cierra la tarjeta de la donación
function CerrarAlTocar({ onCerrar }) { useMapEvents({ click: onCerrar }); return null; }

// Leaflet necesita recalcular su tamaño cuando el mapa pasa de oculto a visible (celular)
function Redimensionar({ dep }) {
  const map = useMap();
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 50); return () => clearTimeout(t); }, [dep, map]);
  return null;
}

export default function Mapa() {
  const { usuario } = useAuth();
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [sel, setSel] = useState(null);
  const [vista, setVista] = useState('mapa'); // en celular: 'mapa' o 'lista'
  const [aviso, setAviso] = useState(null);
  const [apartando, setApartando] = useState(false);
  const [params, setParams] = useSearchParams();

  const cargar = useCallback(async () => {
    const p = new URLSearchParams();
    if (cat) p.set('categoria', cat);
    if (q.trim()) p.set('q', q.trim());
    try {
      const d = await api(`/donations?${p}`);
      setLista(d.donaciones);
      setSel((s) => d.donaciones.find((x) => x.id_donacion === s?.id_donacion) || null);
    } catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    finally { setCargando(false); }
  }, [cat, q]);

  useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [cargar]);
  useActualizar(cargar, 15000); // cambios de otras cuentas aparecen solos

  // Si se llega desde una notificación (/mapa?d=ID) se selecciona esa donación
  useEffect(() => {
    const id = params.get('d');
    if (!id || lista.length === 0) return;
    const d = lista.find((x) => String(x.id_donacion) === id);
    if (d) setSel(d);
    setParams({}, { replace: true });
  }, [lista, params, setParams]);

  async function apartar(d) {
    setApartando(true); setAviso(null);
    try {
      const r = await api('/reservations/book', { method: 'POST', body: { id_donacion: d.id_donacion } });
      setAviso({ tipo: 'ok', texto: r.mensaje });
      setSel(null);
    } catch (e) { setAviso({ tipo: e.status === 409 ? 'aviso' : 'error', texto: e.message }); }
    finally { setApartando(false); cargar(); }
  }

  // Escape cierra la tarjeta
  useEffect(() => {
    const t = (e) => e.key === 'Escape' && setSel(null);
    document.addEventListener('keydown', t); return () => document.removeEventListener('keydown', t);
  }, []);

  const validada = usuario.estado_validacion === 'aprobada';

  const Lista = (
    <div className="space-y-3">
      {lista.length === 0 && !cargando && <Vacio icono="search_off" titulo="No hay donaciones disponibles" texto="Prueba con otro filtro o vuelve más tarde." />}
      {lista.map((d, i) => (
        <button key={d.id_donacion} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} onClick={() => { if (sel?.id_donacion === d.id_donacion && vista === 'mapa') setSel(null); else { setSel(d); setVista('mapa'); } }}
          className={`card card-hover animate-fade-up w-full text-left p-4 transition ${sel?.id_donacion === d.id_donacion ? 'ring-2 ring-primary' : ''}`}>
          <FotoDonacion id={d.id_donacion} tiene={d.tiene_foto} alto="h-28" className="mb-3" />
          <div className="flex justify-between gap-2">
            <p className="text-xs font-bold text-primary uppercase">{d.donante_nombre}</p>
            <span className="text-sm font-bold">{d.kilos} kg</span>
          </div>
          <p className="font-bold text-lg leading-snug">{d.titulo}</p>
          <p className="text-sm text-on-surface-variant">{d.categoria} · {d.direccion}</p>
          <p className={`mt-2 text-sm font-bold flex items-center gap-1 ${urgente(d.fecha_caducidad) ? 'text-secondary' : 'text-on-surface-variant'}`}>
            <Icon name="schedule" className="text-base" /> Caduca en {tiempoRestante(d.fecha_caducidad)}
          </p>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Mapa de donaciones</h1>
        <p className="text-on-surface-variant">Alimentos disponibles hoy en Oaxaca de Juárez. {lista.length} activas.</p>
      </div>
      {!validada && (
        <Alerta tipo="aviso">
          Tu organización está <b>{usuario.estado_validacion}</b>. Puedes ver las donaciones, pero solo podrás apartarlas cuando un administrador la apruebe.
        </Alerta>
      )}
      <Alerta tipo={aviso?.tipo}>{aviso?.texto}</Alerta>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input className="input pl-11" placeholder="Buscar donación o colonia…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input sm:max-w-xs" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="flex lg:hidden rounded-xl border border-outline-variant overflow-hidden">
          {['mapa', 'lista'].map((v) => (
            <button key={v} onClick={() => setVista(v)} className={`flex-1 min-h-[48px] px-5 font-semibold capitalize ${vista === v ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-lowest'}`}>{v}</button>
          ))}
        </div>
      </div>

      {cargando ? <Cargando /> : (
        <div className="grid lg:grid-cols-[380px_1fr] gap-4">
          <div className={`${vista === 'lista' ? 'block' : 'hidden'} lg:block lg:max-h-[640px] lg:overflow-y-auto pr-1`}>{Lista}</div>
          <div className={`${vista === 'mapa' ? 'block' : 'hidden'} lg:block relative`}>
            <MapContainer center={CENTRO_OAXACA} zoom={14} style={{ height: 'min(640px, 70vh)' }} className="rounded-2xl border border-outline-variant z-0">
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Redimensionar dep={vista} />
              <Enfocar donacion={sel} dep={vista} />
              <CerrarAlTocar onCerrar={() => setSel(null)} />
              {lista.map((d) => (
                <Marker key={d.id_donacion} position={[Number(d.latitud), Number(d.longitud)]}
                  icon={icono(d.kilos, sel?.id_donacion === d.id_donacion, urgente(d.fecha_caducidad))}
                  eventHandlers={{ click: () => setSel(d) }} />
              ))}
            </MapContainer>
            {sel && (
              <div className="card p-5 mt-3 lg:absolute lg:bottom-4 lg:left-4 lg:right-4 lg:mt-0 z-[500]">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs font-bold text-primary uppercase">{sel.categoria} · {sel.donante_nombre}</p>
                    <h2 className="text-xl font-extrabold">{sel.titulo}</h2>
                    <p className="text-sm text-on-surface-variant">{sel.direccion}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary-container/30 font-bold text-sm">{sel.kilos} kg</span>
                    <button onClick={() => setSel(null)} className="w-10 h-10 rounded-full hover:bg-surface-container grid place-items-center" aria-label="Cerrar detalle"><Icon name="close" /></button>
                  </div>
                </div>
                <FotoDonacion id={sel.id_donacion} tiene={sel.tiene_foto} alto="h-36" className="mt-3" />
                <div className="mt-2 flex items-center gap-2 text-sm"><span className="text-on-surface-variant">Donante:</span><Estrellas promedio={sel.donante_promedio} /></div>
                {sel.descripcion && <p className="mt-2 text-sm">{sel.descripcion}</p>}
                <div className="mt-3 rounded-xl bg-secondary-container/25 p-3 text-sm space-y-1">
                  <p className="font-bold flex items-center gap-1"><Icon name="schedule" className="text-base" /> Caduca en {tiempoRestante(sel.fecha_caducidad)} ({fechaCorta(sel.fecha_caducidad)})</p>
                  {sel.horario_recoleccion && <p>Recolección: {verHorario(sel.horario_recoleccion)}</p>}
                  <p className="text-on-surface-variant">Lleva canastas o cajas limpias. RescatApp no garantiza la inocuidad del alimento: revísalo al recogerlo.</p>
                </div>
                <a className="btn-ghost w-full mt-3" href={rutaLink(sel.latitud, sel.longitud)} target="_blank" rel="noreferrer"><Icon name="directions" /> Cómo llegar</a>
                <button className="btn-alert w-full mt-2" disabled={!validada || apartando} onClick={() => apartar(sel)}>
                  <Icon name="shopping_basket" /> {apartando ? 'Apartando…' : 'APARTAR ALIMENTO'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
