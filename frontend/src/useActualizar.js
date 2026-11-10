import { useEffect, useRef } from 'react';

// Vuelve a pedir los datos cada cierto tiempo (solo si la pestaña está visible) y al volver a la pestaña.
// Así los cambios de otras cuentas aparecen sin recargar la página.
export function useActualizar(funcion, ms = 15000) {
  const ref = useRef(funcion);
  ref.current = funcion;
  useEffect(() => {
    const correr = () => { if (document.visibilityState === 'visible') ref.current(); };
    const t = setInterval(correr, ms);
    document.addEventListener('visibilitychange', correr);
    window.addEventListener('focus', correr);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', correr); window.removeEventListener('focus', correr); };
  }, [ms]);
}
