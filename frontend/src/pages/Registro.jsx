import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { validarCorreo, validarDireccion, validarNombre, validarPassword, validarTelefono, validarUbicacion } from '../reglas.js';
import { api } from '../api.js';
import { useAuth, rutaInicial } from '../context/AuthContext.jsx';
import { useTema } from '../context/TemaContext.jsx';
import { Alerta, BotonTema, Campo, CampoPassword, CampoTelefono, Icon, IndicadorPassword, Modal } from '../components/ui.jsx';
import { ContenidoPrivacidad } from './Privacidad.jsx';
import SelectorUbicacion from '../components/SelectorUbicacion.jsx';
import BotonGoogle from '../components/BotonGoogle.jsx';

const ROLES = [
  { v: 'donante', t: 'Soy negocio donante', d: 'Panadería, restaurante, mercado… Publicas tus excedentes.', i: 'storefront' },
  { v: 'receptor', t: 'Soy comedor u organización', d: 'Recibes alimento. Un administrador validará tu organización.', i: 'diversity_1' },
];

export default function Registro() {
  const { registrar, aceptarSesion } = useAuth();
  const nav = useNavigate();
  const { tema, alternar } = useTema();
  const [f, setF] = useState({ rol: 'donante', nombre: '', correo: '', telefono: '', direccion: '', password: '', password2: '', acepta: false });
  const [errs, setErrs] = useState({});
  const [verAviso, setVerAviso] = useState(false);
  const [error, setError] = useState('');
  const [punto, setPunto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Revisa todos los campos con las MISMAS reglas que el servidor y muestra el mensaje junto a cada uno
  function revisar(x = f) {
    const e = {};
    const n = validarNombre(x.nombre); if (n) e.nombre = n;
    const c = validarCorreo(x.correo); if (c) e.correo = c;
    const t = validarTelefono(x.telefono, true); if (t) e.telefono = t;
    const d = validarDireccion(x.direccion) || validarUbicacion(punto?.[0], punto?.[1]); if (d) e.direccion = d;
    const p = validarPassword(x.password, { correo: x.correo, nombre: x.nombre }); if (p.length) e.password = p[0];
    if (!x.password2) e.password2 = 'Repite la contraseña.'; else if (x.password2 !== x.password) e.password2 = 'Las contraseñas no coinciden.';
    if (!x.acepta) e.acepta = 'Debes aceptar el aviso de privacidad y los términos para crear tu cuenta.';
    return e;
  }
  const alSalir = (k) => () => setErrs((p) => { const n = revisar()[k]; const q = { ...p }; if (n) q[k] = n; else delete q[k]; return q; });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    const malos = revisar(); setErrs(malos);
    const primero = ['nombre', 'correo', 'telefono', 'direccion', 'password', 'password2', 'acepta'].find((k) => malos[k]);
    if (primero) {
      setError('Revisa los campos marcados en rojo.');
      // Lleva a la persona al primer campo con error y lo selecciona
      setTimeout(() => {
        const el = document.getElementById(`r-${primero}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.querySelector('input,select')?.focus({ preventScroll: true });
      }, 50);
      return;
    }
    setEnviando(true);
    try {
      const { password2, acepta, ...resto } = f;
      const u = await registrar({ ...resto, acepta_terminos: acepta, latitud: punto[0], longitud: punto[1] });
      nav(rutaInicial(u.rol), { replace: true });
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  // Con Google se usa el rol elegido arriba
  const conGoogle = useCallback(async (credential) => {
    setError('');
    try {
      const d = await api('/auth/google', { method: 'POST', body: { credential, rol: f.rol } });
      nav(rutaInicial(aceptarSesion(d).rol), { replace: true });
    } catch (err) { setError(err.message); }
  }, [f.rol, aceptarSesion, nav]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <BotonTema tema={tema} alternar={alternar} />
      <form onSubmit={enviar} noValidate className="card w-full max-w-xl p-8 space-y-5 animate-fade-up">
        <div>
          <h1 className="text-3xl font-extrabold text-primary">Crea tu cuenta</h1>
          <p className="text-on-surface-variant">Únete a la red solidaria de rescate de alimentos en Oaxaca.</p>
        </div>
        <Alerta>{error}</Alerta>
        <fieldset className="grid sm:grid-cols-2 gap-3">
          <legend className="text-sm font-semibold mb-2">Elige tu participación</legend>
          {ROLES.map((r) => (
            <label key={r.v} className={`cursor-pointer rounded-2xl border-2 p-4 flex gap-3 transition ${f.rol === r.v ? 'border-primary bg-primary-container/15' : 'border-outline-variant hover:bg-surface-container-low'}`}>
              <input type="radio" name="rol" className="sr-only" checked={f.rol === r.v} onChange={() => setF({ ...f, rol: r.v })} />
              <Icon name={r.i} className="text-primary text-3xl" />
              <span><b className="block">{r.t}</b><span className="text-sm text-on-surface-variant">{r.d}</span></span>
            </label>
          ))}
        </fieldset>
        <BotonGoogle onCredencial={conGoogle} onError={setError} />
        <div id="r-nombre"><Campo etiqueta="Nombre del negocio u organización" error={errs.nombre}><input className="input" maxLength={100} value={f.nombre} onChange={set('nombre')} onBlur={alSalir('nombre')} placeholder="Ej. Panadería San Martín" autoComplete="organization" /></Campo></div>
        <div id="r-correo"><Campo etiqueta="Correo electrónico" error={errs.correo}><input className="input" type="email" name="email" id="registro-email" inputMode="email" maxLength={254} autoComplete="username" value={f.correo} onChange={set('correo')} onBlur={alSalir('correo')} placeholder="nombre@correo.com" /></Campo></div>
        <div className="grid gap-4">
          <div id="r-telefono"><Campo etiqueta="Teléfono de contacto" ayuda="Solo se comparte con quien reserve o reciba tu donación." error={errs.telefono}><CampoTelefono value={f.telefono} onChange={(v) => setF((x) => ({ ...x, telefono: v }))} /></Campo></div>
          <div id="r-direccion"><span className="block text-sm font-semibold mb-1">Dirección</span>
          <SelectorUbicacion requerida={false} alto={240} direccion={f.direccion} onDireccion={(v) => { setF((x) => ({ ...x, direccion: v })); setErrs((p) => { const q = { ...p }; delete q.direccion; return q; }); }} punto={punto} onPunto={(v) => { setPunto(v); if (v) setErrs((p) => { const q = { ...p }; delete q.direccion; return q; }); }} />
          {errs.direccion && <p role="alert" className="text-xs font-semibold text-error mt-1">{errs.direccion}</p>}
          <p className="text-xs text-on-surface-variant mt-1">Obligatoria: elige una sugerencia de la lista o toca el mapa para confirmar que el lugar existe.</p></div>
        </div>
        <div id="r-password">
          <Campo etiqueta="Contraseña" error={errs.password}><CampoPassword name="new-password" id="registro-password" autoComplete="new-password" required={false} value={f.password} onChange={set('password')} onBlur={alSalir('password')} /></Campo>
          <IndicadorPassword password={f.password} ctx={{ correo: f.correo, nombre: f.nombre }} />
        </div>
        <div id="r-password2"><Campo etiqueta="Repite la contraseña" error={errs.password2}><CampoPassword name="new-password-confirm" id="registro-password2" autoComplete="new-password" required={false} value={f.password2} onChange={set('password2')} onBlur={alSalir('password2')} /></Campo></div>
        <div id="r-acepta">
          <label className="flex gap-3 items-start cursor-pointer">
            <input type="checkbox" className="mt-1 w-6 h-6 accent-primary shrink-0" checked={f.acepta} onChange={(e) => { setF({ ...f, acepta: e.target.checked }); setErrs((p) => { const q = { ...p }; delete q.acepta; return q; }); }} />
            <span className="text-sm">He leído y acepto el <button type="button" onClick={() => setVerAviso(true)} className="font-bold text-primary underline">aviso de privacidad y los términos de uso</button>.</span>
          </label>
          {errs.acepta && <p role="alert" className="text-xs font-semibold text-error mt-1">{errs.acepta}</p>}
        </div>
        <p className="text-xs text-on-surface-variant flex gap-2"><Icon name="verified_user" className="text-primary" />Toda donación es gratuita y está destinada exclusivamente al consumo solidario. RescatApp no maneja pagos.</p>
        <button className="btn-primary w-full" disabled={enviando}>{enviando ? 'Creando…' : 'Crear cuenta'}</button>
        <p className="text-center text-sm">¿Ya tienes cuenta? <Link to="/login" className="font-bold text-primary underline">Inicia sesión</Link></p>
      </form>
      {verAviso && (
        <Modal titulo="Aviso de privacidad y términos" onCerrar={() => setVerAviso(false)}>
          <div className="space-y-4 text-sm">
            <ContenidoPrivacidad />
            <button type="button" className="btn-primary w-full" onClick={() => { setVerAviso(false); setF((x) => ({ ...x, acepta: true })); setErrs((p) => { const q = { ...p }; delete q.acepta; return q; }); }}>Entendido, acepto</button>
            <button type="button" className="btn-ghost w-full" onClick={() => setVerAviso(false)}>Cerrar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
