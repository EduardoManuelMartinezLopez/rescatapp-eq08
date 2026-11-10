import { useEffect, useRef } from 'react';
import { crearGlobo } from '../lib/globo.js';

// Globo terráqueo animado. estado: 'reposo' | 'cargando' | 'listo'
export default function Globo({ estado = 'reposo', className = '' }) {
  const ref = useRef(null);
  const globo = useRef(null);
  useEffect(() => { globo.current = crearGlobo(ref.current); return () => globo.current?.destruir(); }, []);
  useEffect(() => { globo.current?.setEstado(estado); }, [estado]);
  return <canvas ref={ref} className={`w-full h-full ${className}`} role="img" aria-label="Globo terráqueo con Oaxaca marcado" />;
}
