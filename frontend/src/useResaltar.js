import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Cuando se llega desde una notificación (?d=ID o ?r=ID) muestra todos los elementos,
// se desplaza hasta la tarjeta indicada y la resalta unos segundos.
export function useResaltar(clave, prefijo, listo, alEncontrar) {
  const [params, setParams] = useSearchParams();
  const id = params.get(clave);
  useEffect(() => {
    if (!id || !listo) return;
    alEncontrar?.();
    const t = setTimeout(() => {
      const el = document.getElementById(`${prefijo}-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-primary');
        setTimeout(() => el.classList.remove('ring-4', 'ring-primary'), 3000);
      } else window.scrollTo({ top: 0, behavior: 'smooth' });
      setParams({}, { replace: true });
    }, 150);
    return () => clearTimeout(t);
  }, [id, listo]); // eslint-disable-line react-hooks/exhaustive-deps
}
