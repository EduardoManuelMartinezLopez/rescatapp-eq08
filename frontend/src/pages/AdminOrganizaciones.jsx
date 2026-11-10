import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alerta, Cargando, Chip, Estrellas, Vacio } from '../components/ui.jsx';
import { useActualizar } from '../useActualizar.js';
import { fechaCorta } from '../utils.js';

export default function AdminOrganizaciones() {
  const [estado, setEstado] = useState('pendiente');
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try { setLista((await api(`/admin/organizations?estado=${estado}`)).organizaciones); }
    catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    finally { setCargando(false); }
  }, [estado]);
  useEffect(() => { setCargando(true); cargar(); }, [cargar]);
  useActualizar(cargar, 15000);

  async function cambiar(o, nuevo) {
    try {
      await api(`/admin/organizations/${o.id_usuario}`, { method: 'PATCH', body: { estado_validacion: nuevo } });
      setAviso({ tipo: 'ok', texto: `${o.nombre}: ${nuevo}.` });
    } catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
    cargar();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Validación de organizaciones</h1>
        <p className="text-on-surface-variant">Revisa que sean comedores, albergues o bancos de alimentos reales antes de aprobarlos (RD-04).</p>
      </div>
      <Alerta tipo={aviso?.tipo}>{aviso?.texto}</Alerta>
      <div className="flex gap-2 flex-wrap">
        {['pendiente', 'aprobada', 'rechazada'].map((e) => (
          <button key={e} onClick={() => setEstado(e)} className={`px-4 min-h-[44px] rounded-full font-semibold capitalize ${estado === e ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-lowest border border-outline-variant'}`}>{e}s</button>
        ))}
      </div>
      {cargando ? <Cargando /> : lista.length === 0 ? <Vacio icono="verified_user" titulo={`No hay organizaciones ${estado}s`} /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {lista.map((o) => (
            <article key={o.id_usuario} className="card card-hover animate-fade-up p-5 space-y-2">
              <div className="flex justify-between gap-2"><h2 className="font-bold text-lg">{o.nombre}</h2><Chip estado={o.estado_validacion} /></div>
              <p className="text-sm">{o.correo}</p>
              <p className="text-sm text-on-surface-variant">{o.telefono || 'Sin teléfono'} · {o.direccion || 'Sin dirección'}</p>
              <Estrellas promedio={o.promedio} />
              <p className="text-xs text-outline">Registrada el {fechaCorta(o.fecha_registro)}</p>
              <div className="flex gap-2 pt-1">
                {o.estado_validacion !== 'aprobada' && <button className="btn-primary flex-1" onClick={() => cambiar(o, 'aprobada')}>Aprobar</button>}
                {o.estado_validacion !== 'rechazada' && <button className="btn-danger flex-1" onClick={() => cambiar(o, 'rechazada')}>Rechazar</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
