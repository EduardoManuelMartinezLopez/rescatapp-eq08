import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTema } from '../context/TemaContext.jsx';
import { usePwa } from '../components/usePwa.js';
import { Alerta, Campo, CampoPassword, CampoTelefono, Estrellas, Icon } from '../components/ui.jsx';
import SelectorUbicacion from '../components/SelectorUbicacion.jsx';
import Impacto from '../components/Impacto.jsx';
import { fechaCorta } from '../utils.js';

const ROL = { receptor: 'Organización receptora', donante: 'Negocio donante', admin: 'Administrador' };

export default function Perfil() {
  const { usuario, setUsuario, refrescarUsuario } = useAuth();
  const { tema, alternar } = useTema();
  const pwa = usePwa();
  const [f, setF] = useState({ nombre: usuario.nombre || '', telefono: usuario.telefono || '', direccion: usuario.direccion || '' });
  const [msg, setMsg] = useState(null);
  const [p, setP] = useState({ actual: '', nueva: '', repetir: '' });
  const [msgP, setMsgP] = useState(null);
  const [cal, setCal] = useState(null);
  const [punto, setPunto] = useState(null);

  useEffect(() => {
    refrescarUsuario?.().catch?.(() => {});
    api(`/ratings/user/${usuario.id_usuario}`).then(setCal).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(e) {
    e.preventDefault(); setMsg(null);
    try {
      const d = await api('/auth/me', { method: 'PATCH', body: f });
      setUsuario({ ...usuario, ...d.usuario }); setMsg({ tipo: 'ok', texto: d.mensaje });
    } catch (err) { setMsg({ tipo: 'error', texto: err.message }); }
  }

  async function cambiarPassword(e) {
    e.preventDefault(); setMsgP(null);
    if (p.nueva !== p.repetir) return setMsgP({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
    try {
      const d = await api('/auth/password', { method: 'PATCH', body: { actual: p.actual, nueva: p.nueva } });
      setMsgP({ tipo: 'ok', texto: d.mensaje }); setP({ actual: '', nueva: '', repetir: '' });
      setUsuario({ ...usuario, password_definida: true });
    } catch (err) { setMsgP({ tipo: 'error', texto: err.message }); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container grid place-items-center text-2xl font-extrabold">{usuario.nombre.charAt(0).toUpperCase()}</div>
        <div>
          <h1 className="text-2xl font-extrabold">{usuario.nombre}</h1>
          <p className="text-on-surface-variant text-sm">{ROL[usuario.rol]} · {usuario.correo}</p>
          {usuario.rol !== 'admin' && cal && <Estrellas promedio={cal.promedio} total={Number(cal.total)} />}
        </div>
      </div>

      {usuario.rol === 'receptor' && usuario.estado_validacion !== 'aprobada' && (
        <Alerta tipo="aviso">Tu organización está <b>{usuario.estado_validacion}</b>. Un administrador debe aprobarla para que puedas apartar alimentos.</Alerta>
      )}
      {usuario.rol !== 'admin' && <Impacto />}

      <form onSubmit={guardar} className="card p-5 space-y-4">
        <h2 className="font-bold text-lg">Mis datos</h2>
        <Alerta tipo={msg?.tipo}>{msg?.texto}</Alerta>
        <Campo etiqueta="Nombre"><input className="input" required minLength={3} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
        <Campo etiqueta="Teléfono" ayuda="Se comparte solo tras apartar o recibir una donación."><CampoTelefono value={f.telefono} onChange={(v) => setF((x) => ({ ...x, telefono: v }))} /></Campo>
        <div><span className="block text-sm font-semibold mb-1">Dirección</span>
          <SelectorUbicacion plegable requerida={false} alto={240} direccion={f.direccion} onDireccion={(v) => setF((x) => ({ ...x, direccion: v }))} punto={punto} onPunto={setPunto} /></div>
        <button className="btn-primary w-full">Guardar cambios</button>
      </form>

      <form onSubmit={cambiarPassword} className="card p-5 space-y-4">
        <h2 className="font-bold text-lg">{usuario.password_definida === false ? 'Crear una contraseña' : 'Cambiar contraseña'}</h2>
        {usuario.password_definida === false && <p className="text-sm text-on-surface-variant">Entraste con Google. Si quieres, crea una contraseña para también iniciar sesión con tu correo.</p>}
        <Alerta tipo={msgP?.tipo}>{msgP?.texto}</Alerta>
        {usuario.password_definida !== false && (
          <Campo etiqueta="Contraseña actual"><CampoPassword value={p.actual} onChange={(e) => setP({ ...p, actual: e.target.value })} /></Campo>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Campo etiqueta="Nueva contraseña"><CampoPassword minLength={8} autoComplete="new-password" value={p.nueva} onChange={(e) => setP({ ...p, nueva: e.target.value })} /></Campo>
          <Campo etiqueta="Repite la nueva"><CampoPassword minLength={8} autoComplete="new-password" value={p.repetir} onChange={(e) => setP({ ...p, repetir: e.target.value })} /></Campo>
        </div>
        <button className="btn-ghost w-full">Actualizar contraseña</button>
      </form>

      <section className="card p-5 space-y-3">
        <h2 className="font-bold text-lg">Preferencias</h2>
        <button type="button" onClick={alternar} className="btn-ghost w-full justify-between">
          <span className="flex items-center gap-2"><Icon name={tema === 'oscuro' ? 'dark_mode' : 'light_mode'} />Modo {tema === 'oscuro' ? 'oscuro' : 'claro'}</span>
          <span className="text-sm text-on-surface-variant">Cambiar</span>
        </button>
        {pwa.puedeInstalar && <button type="button" onClick={pwa.instalar} className="btn-primary w-full"><Icon name="install_mobile" /> Instalar RescatApp en este dispositivo</button>}
        {pwa.instalada && <p className="text-sm text-primary flex gap-1"><Icon name="check_circle" />App instalada.</p>}
      </section>

      {cal?.recientes?.length > 0 && (
        <section className="card p-5 space-y-3">
          <h2 className="font-bold text-lg">Calificaciones recientes</h2>
          {cal.recientes.map((r, i) => (
            <div key={i} className="border-t border-outline-variant/50 pt-2 first:border-0 first:pt-0">
              <div className="flex justify-between text-sm"><b>{r.autor}</b><Estrellas promedio={r.estrellas} /></div>
              {r.comentario && <p className="text-sm text-on-surface-variant">{r.comentario}</p>}
              <p className="text-xs text-outline">{fechaCorta(r.fecha)}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
