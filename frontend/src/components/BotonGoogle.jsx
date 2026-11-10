import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let cargaScript;
function cargarGoogle() {
  cargaScript ||= new Promise((ok, mal) => {
    if (window.google?.accounts?.id) return ok();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
    s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar Google.'));
    document.head.appendChild(s);
  });
  return cargaScript;
}

// Botón oficial "Continuar con Google". Si no hay VITE_GOOGLE_CLIENT_ID, no se muestra.
export default function BotonGoogle({ onCredencial, onError }) {
  const caja = useRef(null);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let vivo = true;
    cargarGoogle().then(() => {
      if (!vivo || !caja.current) return;
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (r) => onCredencial(r.credential), ux_mode: 'popup' });
      const ancho = Math.min(360, Math.max(240, caja.current.offsetWidth));
      window.google.accounts.id.renderButton(caja.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: 'es', width: ancho });
      setListo(true);
    }).catch((e) => onError?.(e.message));
    return () => { vivo = false; };
  }, [onCredencial, onError]);
  if (!CLIENT_ID) return null;
  return (
    <div>
      <div className="flex items-center gap-3 text-xs text-outline my-1"><span className="flex-1 h-px bg-outline-variant" />o<span className="flex-1 h-px bg-outline-variant" /></div>
      <div ref={caja} className={`flex justify-center min-h-[44px] transition-opacity ${listo ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
