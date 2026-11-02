import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Alerta, Cargando, Chip, FotoDonacion, Icon, Vacio } from '../components/ui.jsx';
import CalificarModal from '../components/CalificarModal.jsx';
import Impacto from '../components/Impacto.jsx';
import { useActualizar } from '../useActualizar.js';
import { fechaCorta, tiempoRestante, verHorario, waLink } from '../utils.js';

export default function MisDonaciones() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todas');
  const [aviso, setAviso] = useState(null);
  const [calificando, setCalificando] = useState(null);

  const cargar = useCallback(async () => {
    try { setLista((await api('/donations/mine')).donaciones); }
    catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useActualizar(cargar, 15000);

  async function accion(promesa) {
    try { setAviso({ tipo: 'ok', texto: (await promesa).mensaje }); }
    catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    cargar();
  }
  const confirmar = (d) => accion(api(`/reservations/${d.id_reserva}/pickup`, { method: 'PATCH' }));
  const retirar = (d) => window.confirm('¿Retirar esta donación?') && accion(api(`/donations/${d.id_donacion}`, { method: 'DELETE' }));

  const visibles = lista.filter((d) => filtro === 'todas' || d.estado === filtro);
  const kilos = lista.filter((d) => d.estado === 'recogida').reduce((s, d) => s + d.kilos, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Mis donaciones</h1>
          <p className="text-on-surface-variant">{lista.length} {lista.length === 1 ? 'donación' : 'donaciones'} · {kilos} kg ya rescatados</p>
        </div>
        <Link to="/nueva-donacion" className="btn-primary"><Icon name="add" /> Nueva donación</Link>
      </div>
      <Alerta tipo={aviso?.tipo}>{aviso?.texto}</Alerta>
      {kilos > 0 && <Impacto titulo="Tu impacto como donante" />}
      <div className="flex gap-2 flex-wrap">
        {['todas', 'publicada', 'reservada', 'recogida', 'expirada'].map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className={`px-4 min-h-[44px] rounded-full font-semibold capitalize ${filtro === f ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-lowest border border-outline-variant'}`}>{f}</button>
        ))}
      </div>
      {cargando ? <Cargando /> : visibles.length === 0 ? (
        <Vacio icono="volunteer_activism" titulo="Aún no hay donaciones aquí" texto="Publica tus excedentes y una organización los recogerá." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visibles.map((d, i) => (
            <article key={d.id_donacion} style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }} className="card card-hover animate-fade-up p-5 space-y-2">
              <FotoDonacion id={d.id_donacion} tiene={d.tiene_foto} />
              <div className="flex justify-between items-start gap-2">
                <p className="text-xs font-bold text-primary uppercase">{d.categoria}</p>
                <Chip estado={d.estado} />
              </div>
              <h2 className="text-lg font-bold">{d.titulo}</h2>
              <p className="text-sm text-on-surface-variant">{d.kilos} kg · {d.direccion}</p>
              {d.estado === 'publicada' && <p className="text-sm font-bold text-secondary">Caduca en {tiempoRestante(d.fecha_caducidad)}</p>}
              {d.estado === 'reservada' && <p className="text-sm">Apartada por <b>{d.receptor_nombre}</b>. Horario: {verHorario(d.horario_recoleccion) || '—'}</p>}
              {d.estado === 'recogida' && <p className="text-sm text-on-surface-variant">Recogida por {d.receptor_nombre}</p>}
              {d.estado === 'expirada' && <p className="text-sm text-on-surface-variant">Venció el {fechaCorta(d.fecha_caducidad)}</p>}
              {d.estado === 'reservada' && d.estado_reserva === 'activa' && waLink(d.receptor_telefono, `Hola, te escribo de RescatApp sobre "${d.titulo}".`) && (
                <a className="btn-ghost w-full" href={waLink(d.receptor_telefono, `Hola, te escribo de RescatApp sobre "${d.titulo}".`)} target="_blank" rel="noreferrer"><Icon name="chat" /> Escribir por WhatsApp</a>
              )}
              {d.estado === 'recogida' && d.id_reserva && (d.calificada
                ? <p className="text-sm text-primary flex gap-1"><Icon name="check_circle" className="text-base" />Ya calificaste a esta organización</p>
                : <button className="btn-ghost w-full" onClick={() => setCalificando(d)}><Icon name="star" /> Calificar a la organización</button>)}
              <div className="flex gap-2 pt-1">
                {d.estado === 'reservada' && d.estado_reserva === 'activa' && <button className="btn-primary flex-1" onClick={() => confirmar(d)}><Icon name="check_circle" /> Confirmar recolección</button>}
                {d.estado === 'publicada' && <Link to={`/editar-donacion/${d.id_donacion}`} className="btn-ghost flex-1"><Icon name="edit" /> Editar</Link>}
                {d.estado === 'publicada' && <button className="btn-ghost flex-1" onClick={() => retirar(d)}>Retirar</button>}
              </div>
            </article>
          ))}
        </div>
      )}
      {calificando && <CalificarModal reserva={calificando.id_reserva} a={calificando.receptor_nombre} onCerrar={() => setCalificando(null)}
        onListo={() => { setCalificando(null); setAviso({ tipo: 'ok', texto: '¡Gracias por tu calificación!' }); cargar(); }} />}
    </div>
  );
}
