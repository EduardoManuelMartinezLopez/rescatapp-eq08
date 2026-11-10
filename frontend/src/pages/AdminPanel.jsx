import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, descargar } from '../api.js';
import { Alerta, Cargando, Chip, Contador, Icon } from '../components/ui.jsx';
import { useActualizar } from '../useActualizar.js';
import { fechaCorta } from '../utils.js';

const Tarjeta = ({ icono, titulo, valor, nota, i = 0 }) => (
  <div className="card card-hover animate-fade-up p-5 h-full" style={{ animationDelay: `${i * 60}ms` }}>
    <Icon name={icono} className="text-primary text-3xl" />
    <p className="text-3xl font-extrabold mt-1">{valor}</p>
    <p className="font-semibold">{titulo}</p>
    {nota && <p className="text-xs text-on-surface-variant mt-1">{nota}</p>}
  </div>
);

export default function AdminPanel() {
  const [m, setM] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [error, setError] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [errCsv, setErrCsv] = useState('');
  const bajarCsv = async () => {
    setErrCsv('');
    const p = new URLSearchParams(); if (desde) p.set('desde', desde); if (hasta) p.set('hasta', hasta);
    try { await descargar(`/admin/reports/donations.csv?${p}`, 'rescatapp_donaciones.csv'); } catch (e) { setErrCsv(e.message); }
  };

  const cargar = useCallback(() => Promise.all([api('/admin/metrics'), api('/admin/donations')])
    .then(([a, b]) => { setM(a); setRecientes(b.donaciones); })
    .catch((e) => setError(e.message)), []);
  useEffect(() => { cargar(); }, [cargar]);
  useActualizar(cargar, 20000);

  // Reporte imprimible: pide los datos del rango elegido y abre el cuadro de impresión (Guardar como PDF)
  const [reporte, setReporte] = useState(null);
  const imprimir = async () => {
    setErrCsv('');
    const p = new URLSearchParams(); if (desde) p.set('desde', desde); if (hasta) p.set('hasta', hasta);
    try {
      const r = await api(`/admin/donations?${p}`);
      setReporte({ ...r, desde, hasta, generado: new Date() });
      setTimeout(() => window.print(), 400);
    } catch (e) { setErrCsv(e.message); }
  };

  if (error) return <Alerta>{error}</Alerta>;
  if (!m) return <Cargando />;

  const pendientes = m.organizaciones_por_validacion.find((o) => o.estado === 'pendiente')?.total || 0;
  const aprobadas = m.organizaciones_por_validacion.find((o) => o.estado === 'aprobada')?.total || 0;
  const maxSemana = Math.max(1, ...m.kilos_por_semana.map((s) => s.kilos));
  const maxCat = Math.max(1, ...m.kilos_por_categoria.map((c) => c.kilos));

  return (
    <>
    <div className="space-y-6 print:hidden">
      <div>
        <h1 className="text-2xl font-extrabold">Panel de control</h1>
        <p className="text-on-surface-variant">Indicadores calculados con los datos reales de la plataforma.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta i={0} icono="scale" titulo="Kilos rescatados" valor={<Contador valor={m.kilos_rescatados} decimales={m.kilos_rescatados % 1 ? 1 : 0} sufijo=" kg" />} nota="Donaciones ya recogidas" />
        <Tarjeta i={1} icono="local_shipping" titulo="Entregas completadas" valor={<Contador valor={m.entregas_completadas} />} />
        <Tarjeta i={2} icono="storefront" titulo="Donantes activos" valor={<Contador valor={m.donantes_con_publicaciones} />} />
        <Link to="/admin/organizaciones" className="block"><Tarjeta i={3} icono="pending_actions" titulo="Por validar" valor={<Contador valor={pendientes} />} nota={`${aprobadas} organizaciones aprobadas`} /></Link>
      </div>

      {m.impacto && (
        <section className="card p-5 bg-gradient-to-br from-primary-container/15 to-transparent animate-fade-up">
          <h2 className="font-bold text-lg flex items-center gap-2"><Icon name="eco" className="text-primary" />Impacto estimado</h2>
          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            <div><p className="text-3xl font-extrabold"><Contador valor={m.impacto.comidas_equivalentes} /></p><p className="text-xs text-on-surface-variant">comidas equivalentes*</p></div>
            <div><p className="text-3xl font-extrabold"><Contador valor={m.impacto.co2e_evitado_kg} decimales={1} /></p><p className="text-xs text-on-surface-variant">kg CO₂e evitados*</p></div>
            <div><p className="text-3xl font-extrabold"><Contador valor={m.entregas_completadas} /></p><p className="text-xs text-on-surface-variant">entregas</p></div>
          </div>
          <p className="text-[11px] text-outline mt-3">* Estimaciones con promedios mundiales, no mediciones propias. {m.fuentes_impacto?.co2e} {m.fuentes_impacto?.comida}</p>
        </section>
      )}

      <section className="card p-5 no-print space-y-3">
        <h2 className="font-bold text-lg flex items-center gap-2"><Icon name="download" className="text-primary" />Reportes</h2>
        <Alerta>{errCsv}</Alerta>
        <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
          <label className="block"><span className="block text-sm font-semibold mb-1">Desde</span><input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
          <label className="block"><span className="block text-sm font-semibold mb-1">Hasta</span><input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
          <button className="btn-primary" onClick={bajarCsv}><Icon name="table_view" /> Descargar CSV</button>
          <button className="btn-ghost" onClick={imprimir}><Icon name="print" /> Imprimir / PDF</button>
        </div>
        <p className="text-xs text-on-surface-variant">El CSV abre directo en Excel. El PDF imprime solo el reporte del rango elegido. Sin fechas incluye todo el historial.</p>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="font-bold text-lg mb-4">Kilos rescatados por semana (últimas 4)</h2>
          {m.kilos_por_semana.length === 0 ? <p className="text-sm text-on-surface-variant">Aún no hay entregas completadas.</p> : (
            <div className="flex items-end gap-4 h-44">
              {m.kilos_por_semana.map((s) => (
                <div key={s.semana} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-xs font-bold">{s.kilos} kg</span>
                  <div className="w-full max-w-[72px] bg-primary-container rounded-t-lg transition-all duration-700" style={{ height: `${(s.kilos / maxSemana) * 100}%`, minHeight: 4 }} />
                  <span className="text-[11px] text-on-surface-variant mt-1">Sem. {new Date(s.semana).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card p-5">
          <h2 className="font-bold text-lg mb-4">Rescate por categoría</h2>
          {m.kilos_por_categoria.length === 0 ? <p className="text-sm text-on-surface-variant">Aún no hay entregas completadas.</p> : (
            <div className="space-y-3">
              {m.kilos_por_categoria.map((c) => (
                <div key={c.categoria}>
                  <div className="flex justify-between text-sm"><span>{c.categoria}</span><b>{c.kilos} kg</b></div>
                  <div className="h-3 rounded-full bg-surface-container"><div className="h-3 rounded-full bg-primary-container" style={{ width: `${(c.kilos / maxCat) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card p-5 overflow-x-auto">
        <h2 className="font-bold text-lg mb-3">Últimas donaciones registradas</h2>
        <table className="w-full text-sm min-w-[640px]">
          <thead><tr className="text-left text-on-surface-variant border-b border-outline-variant">
            <th className="py-2">Alimento</th><th>Donante</th><th>Receptor</th><th>Kilos</th><th>Publicada</th><th>Estado</th></tr></thead>
          <tbody>
            {recientes.map((d) => (
              <tr key={d.id_donacion} className="border-b border-outline-variant/40">
                <td className="py-2 font-semibold">{d.titulo}</td><td>{d.donante}</td><td>{d.receptor || '—'}</td>
                <td>{d.kilos}</td><td>{fechaCorta(d.fecha_publicacion)}</td><td><Chip estado={d.estado} /></td>
              </tr>
            ))}
            {recientes.length === 0 && <tr><td colSpan={6} className="py-4 text-on-surface-variant">Sin donaciones todavía.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
    {reporte && <ReporteImpresion r={reporte} />}
    </>
  );
}

const NEGRO = { color: '#111', background: '#fff' };
const fmt = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
// Hoja que solo aparece al imprimir (colores fijos en blanco y negro, aunque la app esté en modo oscuro)
function ReporteImpresion({ r }) {
  const rs = r.resumen;
  const rango = r.desde || r.hasta ? `${r.desde ? fmt(`${r.desde}T12:00:00`) : 'inicio'} al ${r.hasta ? fmt(`${r.hasta}T12:00:00`) : 'hoy'}` : 'Todo el historial';
  const th = { textAlign: 'left', borderBottom: '2px solid #111', padding: '4px 6px', fontSize: 12 };
  const td = { borderBottom: '1px solid #ccc', padding: '4px 6px', fontSize: 12 };
  return (
    <div className="hidden print:block" style={{ ...NEGRO, fontFamily: 'Inter, Arial, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Reporte de rescate de alimentos – RescatApp Oaxaca</h1>
      <p style={{ margin: '4px 0 0', fontSize: 13 }}>Periodo (por fecha de publicación): <b>{rango}</b></p>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#555' }}>Generado el {fechaCorta(r.generado)} · {r.total} donaciones registradas</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody><tr>
          {[['Kilos rescatados', `${rs.kilos_rescatados} kg`], ['Entregas completadas', rs.entregas], ['Comidas equivalentes*', rs.impacto.comidas_equivalentes], ['CO₂e evitado*', `${rs.impacto.co2e_evitado_kg} kg`]].map(([t, v]) => (
            <td key={t} style={{ border: '1px solid #111', padding: 8, textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div><div style={{ fontSize: 11 }}>{t}</div></td>
          ))}
        </tr></tbody>
      </table>

      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>Kilos rescatados por categoría</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={th}>Categoría</th><th style={th}>Kilos</th></tr></thead>
            <tbody>{rs.por_categoria.map((c) => <tr key={c.categoria}><td style={td}>{c.categoria}</td><td style={td}>{c.kilos}</td></tr>)}
              {rs.por_categoria.length === 0 && <tr><td style={td} colSpan={2}>Sin entregas completadas en el periodo.</td></tr>}</tbody></table>
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>Donaciones por estado</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={th}>Estado</th><th style={th}>Total</th></tr></thead>
            <tbody>{rs.por_estado.map((c) => <tr key={c.estado}><td style={td}>{c.estado}</td><td style={td}>{c.total}</td></tr>)}</tbody></table>
        </div>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 700 }}>Detalle de donaciones</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={th}>Alimento</th><th style={th}>Donante</th><th style={th}>Receptor</th><th style={th}>Kilos</th><th style={th}>Publicada</th><th style={th}>Estado</th></tr></thead>
        <tbody>{r.donaciones.map((d) => (
          <tr key={d.id_donacion} style={{ pageBreakInside: 'avoid' }}><td style={td}>{d.titulo}</td><td style={td}>{d.donante}</td><td style={td}>{d.receptor || '—'}</td>
            <td style={td}>{d.kilos}</td><td style={td}>{fechaCorta(d.fecha_publicacion)}</td><td style={td}>{d.estado}</td></tr>))}
          {r.donaciones.length === 0 && <tr><td style={td} colSpan={6}>Sin donaciones en el periodo.</td></tr>}</tbody>
      </table>
      <p style={{ fontSize: 10, color: '#555', marginTop: 12 }}>* Estimaciones con promedios mundiales (420 g por comida, WRAP; 2.5 kg CO₂e por kg, FAO 2013), no mediciones propias. Los kilos y entregas son datos registrados en la plataforma.</p>
    </div>
  );
}
