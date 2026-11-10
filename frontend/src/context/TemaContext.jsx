import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const KEY = 'rescatapp_tema';
const TemaContext = createContext(null);
export const useTema = () => useContext(TemaContext);

function temaInicial() {
  try { const g = localStorage.getItem(KEY); if (g === 'claro' || g === 'oscuro') return g; } catch { /* sin almacenamiento */ }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'oscuro');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'oscuro' ? '#0c1511' : '#2ecc71');
    try { localStorage.setItem(KEY, tema); } catch { /* ignorar */ }
  }, [tema]);
  const alternar = useCallback(() => setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro')), []);
  return <TemaContext.Provider value={{ tema, alternar }}>{children}</TemaContext.Provider>;
}
