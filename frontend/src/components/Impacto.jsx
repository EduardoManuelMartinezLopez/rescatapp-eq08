import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Contador, Esqueleto, Icon } from './ui.jsx';

// Tarjeta de impacto estimado del usuario (comidas equivalentes y CO2e evitado)
export default function Impacto({ titulo = 'Tu impacto' }) {
  const [d, setD] = useState(null);
  useEffect(() => { api('/impact/mine').then(setD).catch(() => setD(false)); }, []);
  if (d === null) return <Esqueleto className="h-28" />;
  if (!d) return null;
  return (
    <section className="card p-5 animate-fade-up bg-gradient-to-br from-primary-container/15 to-transparent">
      <h2 className="font-bold flex items-center gap-2"><Icon name="eco" className="text-primary" />{titulo}</h2>
      <div className="grid grid-cols-3 gap-3 mt-3 text-center">
        <div><p className="text-2xl font-extrabold"><Contador valor={d.kilos} decimales={d.kilos % 1 ? 1 : 0} /></p><p className="text-xs text-on-surface-variant">kg rescatados</p></div>
        <div><p className="text-2xl font-extrabold"><Contador valor={d.comidas_equivalentes} /></p><p className="text-xs text-on-surface-variant">comidas*</p></div>
        <div><p className="text-2xl font-extrabold"><Contador valor={d.co2e_evitado_kg} decimales={1} /></p><p className="text-xs text-on-surface-variant">kg CO₂e evitados*</p></div>
      </div>
      <p className="text-[11px] text-outline mt-3">* Estimación con promedios mundiales: 420 g por comida (WRAP) y 2.5 kg CO₂e por kg de alimento (FAO, 2013). No es una medición propia.</p>
    </section>
  );
}
