import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Icon } from './ui.jsx';
import { CENTRO_OAXACA } from '../utils.js';

const pin = L.divIcon({ className: '', html: '<div style="width:24px;height:24px;border-radius:50%;background:#944a00;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>', iconSize: [24, 24], iconAnchor: [12, 12] });
const NOM = 'https://nominatim.openstreetmap.org';

// Arma "Calle 123, Colonia, Ciudad" a partir de la respuesta de OpenStreetMap (Nominatim)
function formatear(x) {
  const a = x.address || {};
  const calle = [a.road || a.pedestrian || a.footway || a.path, a.house_number].filter(Boolean).join(' ');
  const colonia = a.suburb || a.neighbourhood || a.quarter || a.city_district;
  const ciudad = a.city || a.town || a.village || a.municipality;
  const txt = [calle, colonia, ciudad].filter(Boolean).join(', ');
  return (txt.length >= 5 ? txt : String(x.display_name || '').split(',').slice(0, 3).join(',').trim()).slice(0, 250);
}
async function buscar(q) {
  const p = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', 'accept-language': 'es', countrycodes: 'mx', limit: '5', viewbox: '-97.4,17.4,-96.2,16.7', q });
  const r = await fetch(`${NOM}/search?${p}`);
  if (!r.ok) throw new Error('El buscador de direcciones no respondió.');
  return (await r.json()).map((x) => ({ texto: formatear(x), lat: Number(x.lat), lng: Number(x.lon) }));
}
async function inversa(lat, lng) {
  const p = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', 'accept-language': 'es', zoom: '18', lat, lon: lng });
  const r = await fetch(`${NOM}/reverse?${p}`);
  if (!r.ok) throw new Error('No se pudo obtener la dirección.');
  const x = await r.json();
  if (x.error) throw new Error('No hay dirección en ese punto.');
  return formatear(x);
}

function Clic({ onPunto }) { useMapEvents({ click: (e) => onPunto([e.latlng.lat, e.latlng.lng]) }); return null; }
function Volar({ punto }) {
  const map = useMap();
  useEffect(() => {
    if (!punto) return undefined;
    const t = setTimeout(() => { map.invalidateSize(); const s = map.getSize(); if (s.x > 0 && s.y > 0) map.setView(punto, Math.max(map.getZoom(), 16), { animate: true }); }, 60);
    return () => clearTimeout(t);
  }, [punto, map]);
  return null;
}

// Dirección escrita ⇄ punto en el mapa: si escribes y buscas, se marca; si tocas el mapa, se escribe.
export default function SelectorUbicacion({ direccion, onDireccion, punto, onPunto, plegable = false, alto = 280, requerida = true }) {
  const [resultados, setResultados] = useState([]);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState('');
  const [verMapa, setVerMapa] = useState(!plegable);

  async function ir() {
    if ((direccion || '').trim().length < 3) return setMsg('Escribe al menos 3 letras de la dirección para buscarla.');
    setOcupado(true); setMsg(''); setResultados([]);
    try {
      const q = /oaxaca/i.test(direccion) ? direccion : `${direccion}, Oaxaca`;
      const r = await buscar(q);
      if (r.length === 0) setMsg('No encontré esa dirección. Prueba con otra o márcala en el mapa.');
      setResultados(r);
    } catch (e) { setMsg(e.message); }
    finally { setOcupado(false); }
  }
  const elegir = (r) => { onDireccion(r.texto); onPunto([r.lat, r.lng]); setResultados([]); setVerMapa(true); setMsg(''); };
  async function alMapa(p) {
    onPunto(p); setOcupado(true); setMsg(''); setResultados([]);
    try { onDireccion(await inversa(p[0], p[1])); }
    catch (e) { setMsg(`${e.message} Puedes escribirla tú.`); }
    finally { setOcupado(false); }
  }
  function miUbicacion() {
    if (!navigator.geolocation) return setMsg('Tu navegador no permite obtener la ubicación.');
    setOcupado(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setOcupado(false); setVerMapa(true); alMapa([pos.coords.latitude, pos.coords.longitude]); },
      () => { setOcupado(false); setMsg('No se pudo obtener tu ubicación (revisa el permiso del navegador).'); },
      { timeout: 8000 });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="input" value={direccion} required={requerida} minLength={requerida ? 5 : undefined} placeholder="Escribe la dirección y pulsa Buscar"
          onChange={(e) => onDireccion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ir(); } }} />
        <button type="button" className="btn-ghost shrink-0 !px-4" onClick={ir} disabled={ocupado} aria-label="Buscar dirección"><Icon name={ocupado ? 'progress_activity' : 'search'} className={ocupado ? 'animate-spin' : ''} /><span className="hidden sm:inline">Buscar</span></button>
        <button type="button" className="btn-ghost shrink-0 !px-3" onClick={miUbicacion} disabled={ocupado} title="Usar mi ubicación" aria-label="Usar mi ubicación"><Icon name="my_location" /></button>
      </div>
      {msg && <p className="text-sm text-secondary">{msg}</p>}
      {resultados.length > 0 && (
        <ul className="card overflow-hidden divide-y divide-outline-variant/50 animate-pop">
          {resultados.map((r, i) => (
            <li key={i}><button type="button" onClick={() => elegir(r)} className="w-full text-left px-4 py-3 text-sm hover:bg-surface-container-low flex gap-2"><Icon name="location_on" className="text-primary" />{r.texto}</button></li>
          ))}
        </ul>
      )}
      {plegable && !verMapa && <button type="button" className="text-sm font-semibold text-primary" onClick={() => setVerMapa(true)}>Elegir en el mapa</button>}
      {verMapa && (
        <div>
          <MapContainer center={punto || CENTRO_OAXACA} zoom={punto ? 16 : 14} style={{ height: alto }} className="rounded-xl border border-outline-variant z-0">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Clic onPunto={alMapa} />
            <Volar punto={punto} />
            {punto && <Marker position={punto} icon={pin} draggable eventHandlers={{ dragend: (e) => { const l = e.target.getLatLng(); alMapa([l.lat, l.lng]); } }} />}
          </MapContainer>
          <p className="text-xs text-on-surface-variant mt-1">{punto ? 'Arrastra el marcador o toca otro punto para corregirlo. La dirección se actualiza sola.' : 'Toca el mapa para marcar el punto: la dirección se escribirá sola.'}</p>
        </div>
      )}
    </div>
  );
}
