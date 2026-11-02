import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, rutaInicial } from '../context/AuthContext.jsx';
import { useTema } from '../context/TemaContext.jsx';
import { Alerta, BotonTema, Campo, CampoPassword, CampoTelefono, Icon } from '../components/ui.jsx';
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
  const [f, setF] = useState({ rol: 'donante', nombre: '', correo: '', telefono: '', direccion: '', password: '' });
  const [error, setError] = useState('');
  const [punto, setPunto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError(''); setEnviando(true);
    try {
      const u = await registrar(f);
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
      <form onSubmit={enviar} className="card w-full max-w-xl p-8 space-y-5 animate-fade-up">
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
        <Campo etiqueta="Nombre del negocio u organización"><input className="input" required minLength={3} value={f.nombre} onChange={set('nombre')} placeholder="Ej. Panadería San Martín" /></Campo>
        <Campo etiqueta="Correo electrónico"><input className="input" type="email" required value={f.correo} onChange={set('correo')} /></Campo>
        <div className="grid gap-4">
          <Campo etiqueta="Teléfono de contacto" ayuda="Solo se comparte con quien reserve o reciba tu donación."><CampoTelefono value={f.telefono} onChange={(v) => setF((x) => ({ ...x, telefono: v }))} /></Campo>
          <div><span className="block text-sm font-semibold mb-1">Dirección</span>
          <SelectorUbicacion requerida={false} alto={240} direccion={f.direccion} onDireccion={(v) => setF((x) => ({ ...x, direccion: v }))} punto={punto} onPunto={setPunto} /></div>
        </div>
        <Campo etiqueta="Contraseña" ayuda="Mínimo 8 caracteres."><CampoPassword minLength={8} autoComplete="new-password" value={f.password} onChange={set('password')} /></Campo>
        <p className="text-xs text-on-surface-variant flex gap-2"><Icon name="verified_user" className="text-primary" />Toda donación es gratuita y está destinada exclusivamente al consumo solidario. RescatApp no maneja pagos.</p>
        <button className="btn-primary w-full" disabled={enviando}>{enviando ? 'Creando…' : 'Crear cuenta'}</button>
        <p className="text-center text-sm">¿Ya tienes cuenta? <Link to="/login" className="font-bold text-primary underline">Inicia sesión</Link></p>
      </form>
    </div>
  );
}
