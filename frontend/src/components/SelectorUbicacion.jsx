import { useEffect, useRef, useState } from 'react';
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
// Búsqueda en OpenStreetMap (Nominatim) con preferencia por la zona de Oaxaca
async function nominatim(q, acotar = false) {
  const p = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', 'accept-language': 'es', countrycodes: 'mx', limit: '6', viewbox: '-97.4,17.4,-96.2,16.7', q });
  if (acotar) p.set('bounded', '1');
  const r = await fetch(`${NOM}/search?${p}`);
  if (!r.ok) throw new Error('El buscador de direcciones no respondió.');
  return (await r.json()).map((x) => ({ texto: formatear(x), lat: Number(x.lat), lng: Number(x.lon) }));
}

// Photon (OpenStreetMap): tolera errores de dedo y direcciones incompletas
async function photon(q) {
  const p = new URLSearchParams({ q, lat: '17.06', lon: '-96.72', limit: '8' });
  const r = await fetch(`https://photon.komoot.io/api/?${p}`);
  if (!r.ok) throw new Error('El buscador de direcciones no respondió.');
  const j = await r.json();
  return (j.features || [])
    .filter((f) => f.properties?.countrycode === 'MX' && f.geometry?.coordinates)
    .map((f) => {
      const a = f.properties; const [lng, lat] = f.geometry.coordinates;
      const calle = a.street ? [a.street, a.housenumber].filter(Boolean).join(' ') : '';
      const texto = [a.name && a.name !== a.street ? a.name : '', calle, a.district || a.locality, a.city || a.county || a.state].filter(Boolean).join(', ');
      return { texto: texto.slice(0, 250), lat, lng };
    })
    .filter((r) => r.texto.length >= 3 && r.lat > 15.5 && r.lat < 18.7 && r.lng > -98.6 && r.lng < -94.6);
}

// Quita palabras que estorban ("calle", "col.", "número"…) y números para intentar con algo más simple
const simplificar = (t) => t.replace(/\b(calle|col(onia)?\.?|av(enida)?\.?|num(ero)?\.?|no\.?|esquina|entre|y|c\.p\.?)\b/gi, ' ').replace(/#?\d+[a-z]?\b/gi, ' ').replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
const sinDuplicados = (lista) => { const v = new Set(); return lista.filter((r) => { const k = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`; if (v.has(k)) return false; v.add(k); return true; }); };

// Prueba varias formas hasta encontrar sugerencias: exacta → solo en Oaxaca → simplificada → Photon (tolerante)
async function buscar(texto) {
  const base = texto.trim();
  const conCiudad = /oaxaca/i.test(base) ? base : `${base}, Oaxaca`;
  const simple = simplificar(base);
  const intentos = [
    () => nominatim(conCiudad),
    () => nominatim(base, true),
    () => (simple.length >= 3 && simple !== base ? nominatim(`${simple}, Oaxaca`, true) : []),
    () => photon(conCiudad),
    () => (simple.length >= 3 ? photon(`${simple} Oaxaca`) : []),
  ];
  let ultimoError = null;
  for (const intento of intentos) {
    try { const r = sinDuplicados(await intento()); if (r.length) return r; } catch (e) { ultimoError = e; }
  }
  if (ultimoError) throw ultimoError;
  return [];
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
  const tecleando = useRef(false); // solo se sugiere mientras la persona escribe (no al rellenar desde el mapa)

  // Sugerencias mientras escribe (con pausa para no saturar el buscador)
  useEffect(() => {
    const q = (direccion || '').trim();
    if (!tecleando.current || q.length < 4) return undefined;
    const t = setTimeout(async () => {
      try { const r = await photon(/oaxaca/i.test(q) ? q : `${q} Oaxaca`); if (tecleando.current) setResultados(r.slice(0, 5)); } catch { /* sin sugerencias */ }
    }, 700);
    return () => clearTimeout(t);
  }, [direccion]);

  async function ir() {
    if ((direccion || '').trim().length < 3) return setMsg('Escribe al menos 3 letras de la dirección para buscarla.');
    tecleando.current = false;
    setOcupado(true); setMsg(''); setResultados([]);
    try {
      const r = await buscar(direccion);
      if (r.length === 0) setMsg('No encontré esa dirección. Prueba solo con el nombre de la calle o colonia (ej. «Reforma, Oaxaca»), o tócala directamente en el mapa.');
      setResultados(r);
    } catch (e) { setMsg(e.message); }
    finally { setOcupado(false); }
  }
  const elegir = (r) => { tecleando.current = false; onDireccion(r.texto); onPunto([r.lat, r.lng]); setResultados([]); setVerMapa(true); setMsg(''); };
  async function alMapa(p) {
    tecleando.current = false;
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
          onChange={(e) => { tecleando.current = true; onDireccion(e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ir(); } }} />
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
