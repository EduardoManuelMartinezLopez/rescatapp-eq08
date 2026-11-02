import { useEffect, useState } from 'react';

// Permite mostrar un botón "Instalar app" cuando el navegador lo permite
export function usePwa() {
  const [evento, setEvento] = useState(null);
  const [instalada, setInstalada] = useState(typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
  useEffect(() => {
    const antes = (e) => { e.preventDefault(); setEvento(e); };
    const hecho = () => { setInstalada(true); setEvento(null); };
    window.addEventListener('beforeinstallprompt', antes); window.addEventListener('appinstalled', hecho);
    return () => { window.removeEventListener('beforeinstallprompt', antes); window.removeEventListener('appinstalled', hecho); };
  }, []);
  return { puedeInstalar: !!evento && !instalada, instalada, instalar: async () => { if (!evento) return; evento.prompt(); await evento.userChoice; setEvento(null); } };
}
