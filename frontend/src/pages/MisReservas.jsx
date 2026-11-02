import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alerta, Cargando, Chip, FotoDonacion, Icon, Vacio } from '../components/ui.jsx';
import CalificarModal from '../components/CalificarModal.jsx';
import Impacto from '../components/Impacto.jsx';
import { useActualizar } from '../useActualizar.js';
import { fechaCorta, rutaLink, tiempoRestante, verHorario, waLink } from '../utils.js';

export default function MisReservas() {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todas');
  const [aviso, setAviso] = useState(null);
  const [calificando, setCalificando] = useState(null);

  const cargar = useCallback(async () => {
    try { setReservas((await api('/reservations/mine')).reservas); }
    catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useActualizar(cargar, 15000);

  async function cancelar(r) {
    if (!window.confirm('¿Cancelar esta reserva? La donación volverá a estar disponible para otras organizaciones.')) return;
    try { setAviso({ tipo: 'ok', texto: (await api(`/reservations/${r.id_reserva}/cancel`, { method: 'PATCH' })).mensaje }); }
    catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    cargar();
  }

  const visibles = reservas.filter((r) => filtro === 'todas' || r.estado === filtro);
  const activas = reservas.filter((r) => r.estado === 'activa').length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Mis reservas</h1>
        <p className="text-on-surface-variant">{activas} {activas === 1 ? 'activa' : 'activas'} · {reservas.length} en total</p>
      </div>
      <Alerta tipo={aviso?.tipo}>{aviso?.texto}</Alerta>
      {reservas.some((r) => r.estado === 'completada') && <Impacto titulo="Lo que has rescatado" />}
      <div className="flex gap-2 flex-wrap">
        {['todas', 'activa', 'completada', 'cancelada'].map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className={`px-4 min-h-[44px] rounded-full font-semibold capitalize ${filtro === f ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-lowest border border-outline-variant'}`}>{f}</button>
        ))}
      </div>
      {cargando ? <Cargando /> : visibles.length === 0 ? (
        <Vacio icono="inventory_2" titulo="Sin reservas" texto="Cuando apartes una donación en el mapa, aparecerá aquí." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visibles.map((r, i) => (
            <article key={r.id_reserva} style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }} className="card card-hover animate-fade-up p-5 space-y-2">
              <FotoDonacion id={r.id_donacion} tiene={r.tiene_foto} />
              <div className="flex justify-between items-start gap-2">
                <p className="text-xs font-bold text-primary uppercase">{r.donante_nombre}</p>
                <Chip estado={r.estado} />
              </div>
              <h2 className="text-lg font-bold">{r.titulo}</h2>
              <p className="text-sm text-on-surface-variant">{r.categoria} · {r.kilos} kg</p>
              <p className="text-sm flex gap-1"><Icon name="location_on" className="text-base text-primary" />{r.direccion}</p>
              {r.horario_recoleccion && <p className="text-sm flex gap-1"><Icon name="schedule" className="text-base text-primary" />Recoger: {verHorario(r.horario_recoleccion)}</p>}
              {r.estado === 'activa' && (
                <>
                  <p className="text-sm font-bold text-secondary">Caduca en {tiempoRestante(r.fecha_caducidad)}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <a className="btn-ghost" href={rutaLink(r.latitud, r.longitud)} target="_blank" rel="noreferrer"><Icon name="directions" /> Cómo llegar</a>
                    {waLink(r.donante_telefono, `Hola, soy de RescatApp. Voy por "${r.titulo}".`)
                      ? <a className="btn-ghost" href={waLink(r.donante_telefono, `Hola, soy de RescatApp. Voy por "${r.titulo}".`)} target="_blank" rel="noreferrer"><Icon name="chat" /> WhatsApp</a>
                      : <span className="btn-ghost opacity-50 pointer-events-none">Sin teléfono</span>}
                  </div>
                  <button className="btn-danger w-full" onClick={() => cancelar(r)}>Cancelar reserva</button>
                </>
              )}
              {r.estado === 'completada' && <p className="text-sm text-on-surface-variant">Recogida el {fechaCorta(r.fecha_recogida)}</p>}
              {r.estado === 'completada' && (r.calificada
                ? <p className="text-sm text-primary flex gap-1"><Icon name="check_circle" className="text-base" />Ya calificaste a este donante</p>
                : <button className="btn-ghost w-full" onClick={() => setCalificando(r)}><Icon name="star" /> Calificar al donante</button>)}
              <p className="text-xs text-outline">Apartada el {fechaCorta(r.fecha_reserva)}</p>
            </article>
          ))}
        </div>
      )}
      {calificando && <CalificarModal reserva={calificando.id_reserva} a={calificando.donante_nombre} onCerrar={() => setCalificando(null)}
        onListo={() => { setCalificando(null); setAviso({ tipo: 'ok', texto: '¡Gracias por tu calificación!' }); cargar(); }} />}
    </div>
  );
}
