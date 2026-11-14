import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Cuando se llega desde una notificación (?d=ID o ?r=ID, y opcionalmente &f=estado) la página
// activa el filtro que corresponde (p. ej. "expirada"), se desplaza a la tarjeta y la resalta.
// Si la tarjeta no aparece en ese filtro, prueba con "todas".
export function useResaltar(clave, prefijo, listo, aplicarFiltro) {
  const [params, setParams] = useSearchParams();
  const id = params.get(clave);
  const filtro = params.get('f');
  useEffect(() => {
    if (!listo || (!id && !filtro)) return;
    if (filtro) aplicarFiltro(filtro);
    let intento = 0;
    const buscar = () => {
      const el = id && document.getElementById(`${prefijo}-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-primary');
        setTimeout(() => el.classList.remove('ring-4', 'ring-primary'), 3000);
      } else if (id && intento++ === 0) { aplicarFiltro('todas'); t = setTimeout(buscar, 150); return; }
      else window.scrollTo({ top: 0, behavior: 'smooth' });
      setParams({}, { replace: true });
    };
    let t = setTimeout(buscar, 150);
    return () => clearTimeout(t);
  }, [id, filtro, listo]); // eslint-disable-line react-hooks/exhaustive-deps
}
