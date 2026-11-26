import { useEffect, useState } from 'react';
import { validarDireccion, validarNombre, validarPassword, validarTelefono, validarUbicacion } from '../reglas.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTema } from '../context/TemaContext.jsx';
import { usePwa } from '../components/usePwa.js';
import { Alerta, Campo, CampoPassword, CampoTelefono, Estrellas, Icon, IndicadorPassword } from '../components/ui.jsx';
import SelectorUbicacion from '../components/SelectorUbicacion.jsx';
import Impacto from '../components/Impacto.jsx';
import { fechaCorta } from '../utils.js';
import { guardarCredencial } from '../lib/credenciales.js';

const ROL = { receptor: 'Organización receptora', donante: 'Negocio donante', admin: 'Administrador' };

export default function Perfil() {
  const { usuario, setUsuario, refrescarUsuario } = useAuth();
  const { tema, alternar } = useTema();
  const pwa = usePwa();
  const [f, setF] = useState({ nombre: usuario.nombre || '', telefono: usuario.telefono || '', direccion: usuario.direccion || '' });
  const [msg, setMsg] = useState(null);
  const [errs, setErrs] = useState({}); // errores junto a cada campo (igual que en el registro)
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
    // Mismas reglas que el servidor
    const esAdmin = usuario.rol === 'admin';
    const e2 = {};
    const n = validarNombre(f.nombre); if (n) e2.nombre = n;
    const t = validarTelefono(f.telefono, !esAdmin); if (t) e2.telefono = t;
    const d = (!esAdmin || f.direccion) ? validarDireccion(f.direccion) : null; if (d) e2.direccion = d;
    if (!e2.direccion && f.direccion && f.direccion !== (usuario.direccion || '')) { const u = validarUbicacion(punto?.[0], punto?.[1]); if (u) e2.direccion = u; }
    setErrs(e2);
    if (Object.keys(e2).length) return setMsg({ tipo: 'error', texto: 'Revisa los campos marcados en rojo.' });
    try {
      const d = await api('/auth/me', { method: 'PATCH', body: { ...f, ...(punto ? { latitud: punto[0], longitud: punto[1] } : {}) } });
      setUsuario({ ...usuario, ...d.usuario }); setMsg({ tipo: 'ok', texto: d.mensaje });
    } catch (err) {
      // El servidor también puede rechazar el teléfono (por ejemplo, si ya lo usa otra cuenta): se muestra junto al campo
      if (/tel[eé]fono/i.test(err.message)) { setErrs({ telefono: err.message }); setMsg({ tipo: 'error', texto: 'Revisa los campos marcados en rojo.' }); }
      else setMsg({ tipo: 'error', texto: err.message });
    }
  }

  async function cambiarPassword(e) {
    e.preventDefault(); setMsgP(null);
    const malas = validarPassword(p.nueva, usuario);
    if (malas.length) return setMsgP({ tipo: 'error', texto: malas[0] });
    if (p.nueva !== p.repetir) return setMsgP({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
    try {
      const d = await api('/auth/password', { method: 'PATCH', body: { actual: p.actual, nueva: p.nueva } });
      guardarCredencial(usuario.correo, p.nueva, usuario.nombre); // el navegador ofrece guardar la contraseña nueva
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

      <form onSubmit={guardar} noValidate className="card p-5 space-y-4">
        <h2 className="font-bold text-lg">Mis datos</h2>
        <Alerta tipo={msg?.tipo}>{msg?.texto}</Alerta>
        <p className="text-xs text-on-surface-variant -mt-2">Los campos marcados con * son obligatorios.</p>
        <Campo etiqueta="Nombre *" error={errs.nombre}><input className="input" maxLength={100} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
        <Campo etiqueta={usuario.rol === 'admin' ? 'Teléfono' : 'Teléfono *'} ayuda="Se comparte solo tras apartar o recibir una donación." error={errs.telefono}><CampoTelefono value={f.telefono} onChange={(v) => setF((x) => ({ ...x, telefono: v }))} /></Campo>
        <div><span className="block text-sm font-semibold mb-1">{usuario.rol === 'admin' ? 'Dirección' : 'Dirección *'}</span>
          <SelectorUbicacion plegable requerida={false} alto={240} direccion={f.direccion} onDireccion={(v) => setF((x) => ({ ...x, direccion: v }))} punto={punto} onPunto={setPunto} />
          {errs.direccion && <p role="alert" className="text-xs font-semibold text-error mt-1">{errs.direccion}</p>}</div>
        <button className="btn-primary w-full">Guardar cambios</button>
      </form>

      <form onSubmit={cambiarPassword} noValidate className="card p-5 space-y-4">
        <h2 className="font-bold text-lg">{usuario.password_definida === false ? 'Crear una contraseña' : 'Cambiar contraseña'}</h2>
        {usuario.password_definida === false && <p className="text-sm text-on-surface-variant">Entraste con Google. Si quieres, crea una contraseña para también iniciar sesión con tu correo.</p>}
        <Alerta tipo={msgP?.tipo}>{msgP?.texto}</Alerta>
        {usuario.password_definida !== false && (
          <Campo etiqueta="Contraseña actual"><CampoPassword value={p.actual} onChange={(e) => setP({ ...p, actual: e.target.value })} /></Campo>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Campo etiqueta="Nueva contraseña"><CampoPassword autoComplete="new-password" value={p.nueva} onChange={(e) => setP({ ...p, nueva: e.target.value })} /></Campo>
          <Campo etiqueta="Repite la nueva"><CampoPassword autoComplete="new-password" value={p.repetir} onChange={(e) => setP({ ...p, repetir: e.target.value })} /></Campo>
        </div>
        <IndicadorPassword password={p.nueva} ctx={usuario} />
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
