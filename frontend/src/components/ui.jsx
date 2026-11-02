import { useEffect, useRef, useState } from 'react';

export const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>
);

const ESTILOS = {
  publicada: 'bg-primary-container/25 text-primary', aprobada: 'bg-primary-container/25 text-primary',
  reservada: 'bg-secondary-container/35 text-secondary', activa: 'bg-secondary-container/35 text-secondary', pendiente: 'bg-secondary-container/35 text-secondary',
  recogida: 'bg-surface-variant text-on-surface', completada: 'bg-surface-variant text-on-surface',
  expirada: 'bg-error/15 text-error', cancelada: 'bg-error/15 text-error', rechazada: 'bg-error/15 text-error',
};
const NOMBRES = { publicada: 'Publicada', reservada: 'Reservada', recogida: 'Recogida', expirada: 'Expirada',
  activa: 'Activa', completada: 'Completada', cancelada: 'Cancelada', pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada' };

export const Chip = ({ estado }) => (
  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${ESTILOS[estado] || 'bg-surface-variant'}`}>
    {NOMBRES[estado] || estado}
  </span>
);

const TIPOS = {
  error: 'bg-error/10 text-error border-error/30',
  ok: 'bg-primary-container/20 text-primary border-primary/30',
  aviso: 'bg-secondary-container/30 text-secondary border-secondary/30',
};
export const Alerta = ({ tipo = 'error', children }) => children ? (
  <div role="alert" className={`rounded-xl border px-4 py-3 text-sm font-medium animate-pop ${TIPOS[tipo] || TIPOS.error}`}>{children}</div>
) : null;

// Esqueletos de carga (en lugar de un simple "Cargando…")
export const Esqueleto = ({ className = '' }) => <div className={`animate-pulse rounded-xl bg-surface-container ${className}`} />;
export const Cargando = ({ filas = 3 }) => (
  <div className="grid md:grid-cols-2 gap-4" aria-busy="true" aria-label="Cargando">
    {Array.from({ length: filas }, (_, i) => (
      <div key={i} className="card p-5 space-y-3">
        <Esqueleto className="h-3 w-1/3" /><Esqueleto className="h-5 w-2/3" /><Esqueleto className="h-3 w-1/2" /><Esqueleto className="h-10 w-full" />
      </div>
    ))}
  </div>
);

export const Vacio = ({ icono = 'inbox', titulo, texto }) => (
  <div className="card p-8 text-center animate-fade-up">
    <Icon name={icono} className="text-5xl text-outline" />
    <h3 className="mt-2 font-bold text-lg">{titulo}</h3>
    {texto && <p className="text-on-surface-variant mt-1 text-sm">{texto}</p>}
  </div>
);

export const Campo = ({ etiqueta, children, ayuda }) => (
  <label className="block">
    <span className="block text-sm font-semibold mb-1">{etiqueta}</span>
    {children}
    {ayuda && <span className="block text-xs text-on-surface-variant mt-1">{ayuda}</span>}
  </label>
);

// Estrellas de solo lectura: ★ 4.8 (3)
export const Estrellas = ({ promedio, total }) => {
  const n = Number(promedio);
  if (!n) return <span className="text-xs text-outline">Sin calificaciones</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold" title={`${n} de 5`}>
      <Icon name="star" className="!text-[18px] text-secondary" />{n.toFixed(1)}{total !== undefined && <span className="text-on-surface-variant font-normal">({total})</span>}
    </span>
  );
};

// Número que "sube" hasta su valor (respeta prefers-reduced-motion)
export function Contador({ valor, decimales = 0, sufijo = '' }) {
  const [v, setV] = useState(0);
  const destino = Number(valor) || 0;
  useEffect(() => {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(destino); return undefined; }
    let raf; const t0 = performance.now(); const dur = 900;
    const paso = (t) => { const p = Math.min(1, (t - t0) / dur); setV(destino * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(paso); };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [destino]);
  return <>{v.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}{sufijo}</>;
}

export const FotoDonacion = ({ id, tiene, alto = 'h-40', className = '' }) => tiene ? (
  <img src={`/api/donations/${id}/foto`} alt="Foto de la donación" loading="lazy"
    className={`w-full ${alto} object-cover rounded-xl bg-surface-container ${className}`} />
) : null;

// Ventana modal sencilla
export function Modal({ titulo, onCerrar, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', tecla); ref.current?.focus();
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4 bg-black/50 animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo} className="card w-full max-w-md p-6 space-y-4 animate-pop outline-none">
        <div className="flex justify-between items-center"><h2 className="text-xl font-extrabold">{titulo}</h2>
          <button onClick={onCerrar} className="w-10 h-10 rounded-full hover:bg-surface-container" aria-label="Cerrar"><Icon name="close" /></button></div>
        {children}
      </div>
    </div>
  );
}

// ---- Campo de contraseña con botón para ver lo escrito ----
export function CampoPassword({ value, onChange, placeholder, autoComplete = 'current-password', required = true, minLength, className = '' }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input className={`input pr-12 ${className}`} type={ver ? 'text' : 'password'} required={required} minLength={minLength} autoComplete={autoComplete}
        placeholder={placeholder} value={value} onChange={onChange} />
      <button type="button" onClick={() => setVer(!ver)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 text-outline hover:text-on-surface" aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        <Icon name={ver ? 'visibility_off' : 'visibility'} />
      </button>
    </div>
  );
}

// ---- Teléfono con lada (el valor guardado es "+52 9511234567") ----
const LADAS = [['+52', 'México'], ['+1', 'EE. UU. / Canadá'], ['+502', 'Guatemala'], ['+57', 'Colombia'], ['+54', 'Argentina'], ['+56', 'Chile'], ['+51', 'Perú'], ['+34', 'España']];
function separarTelefono(v) {
  const t = String(v || '').trim();
  if (!t) return { lada: '+52', num: '' };
  if (t.startsWith('+')) {
    const l = [...LADAS].sort((a, b) => b[0].length - a[0].length).find(([c]) => t.startsWith(c));
    if (l) return { lada: l[0], num: t.slice(l[0].length).replace(/\D/g, '') };
  }
  const d = t.replace(/\D/g, '');
  return { lada: '+52', num: d.length > 10 && d.startsWith('52') ? d.slice(2) : d };
}
export function CampoTelefono({ value, onChange }) {
  const ini = separarTelefono(value);
  const [lada, setLada] = useState(ini.lada);
  const [num, setNum] = useState(ini.num);
  const emitir = (l, n) => onChange(n ? `${l} ${n}` : '');
  const mx = lada === '+52';
  return (
    <div className="flex gap-2">
      <select className="input !w-auto !px-3 shrink-0" value={lada} aria-label="Lada del país" onChange={(e) => { setLada(e.target.value); emitir(e.target.value, num); }}>
        {LADAS.map(([c, n]) => <option key={c} value={c}>{c} {n}</option>)}
      </select>
      <input className="input" type="tel" inputMode="numeric" autoComplete="tel-national" value={num}
        placeholder={mx ? '10 dígitos, ej. 9511234567' : 'Número'} maxLength={mx ? 10 : 12}
        pattern={mx ? '[0-9]{10}' : '[0-9]{6,12}'} title={mx ? 'Escribe los 10 dígitos de tu teléfono' : 'Solo números'}
        onChange={(e) => { const n = e.target.value.replace(/\D/g, ''); setNum(n); emitir(lada, n); }} />
    </div>
  );
}

// ---- Botón flotante de modo claro/oscuro para las pantallas sin menú ----
export function BotonTema({ tema, alternar }) {
  return (
    <button type="button" onClick={alternar} className="fixed top-4 right-4 z-50 w-11 h-11 rounded-full card grid place-items-center hover:bg-surface-container"
      aria-label={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
      <Icon name={tema === 'oscuro' ? 'light_mode' : 'dark_mode'} />
    </button>
  );
}
