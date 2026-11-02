import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, rutaInicial } from '../context/AuthContext.jsx';
import { useTema } from '../context/TemaContext.jsx';
import { Alerta, BotonTema, CampoPassword, Icon } from '../components/ui.jsx';
import Globo from '../components/Globo.jsx';
import BotonGoogle from '../components/BotonGoogle.jsx';

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const LEYENDA = { reposo: 'Oaxaca de Juárez', cargando: 'Conectando…', listo: '¡Bienvenido!' };

export default function Login() {
  const { iniciarSesion, aceptarSesion } = useAuth();
  const { tema, alternar } = useTema();
  const nav = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('reposo'); // estado del globo: reposo | cargando | listo
  const [googlePendiente, setGooglePendiente] = useState(null);

  // El globo gira rápido mientras se verifica, se detiene mirando a Oaxaca y entonces se abre la sesión
  async function entrar(obtener) {
    setError(''); setEstado('cargando');
    try {
      const [d] = await Promise.all([obtener(), pausa(900)]);
      if (d.necesita_rol) { setEstado('reposo'); setGooglePendiente({ credential: d.credential, perfil: d.perfil }); return; }
      setEstado('listo'); await pausa(1000);
      const u = aceptarSesion(d);
      nav(rutaInicial(u.rol), { replace: true });
    } catch (err) { setEstado('reposo'); setError(err.message); }
  }

  const enviar = (e) => { e.preventDefault(); entrar(() => iniciarSesion(correo, password)); };
  const conGoogle = useCallback((credential) => {
    entrar(async () => {
      const d = await api('/auth/google', { method: 'POST', body: { credential } });
      return d.necesita_rol ? { ...d, credential } : d;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const elegirRol = (rol) => {
    const { credential } = googlePendiente; setGooglePendiente(null);
    entrar(() => api('/auth/google', { method: 'POST', body: { credential, rol } }));
  };
  const ocupado = estado !== 'reposo';

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <BotonTema tema={tema} alternar={alternar} />
      <section className="bg-surface-container-low flex flex-col items-center justify-center gap-5 px-6 py-8 lg:py-0">
        <div className="flex items-center gap-2 text-primary"><Icon name="volunteer_activism" className="text-[28px]" /><span className="text-xl font-extrabold">RescatApp</span></div>
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 lg:w-[min(34vw,420px)] lg:h-[min(34vw,420px)]">
          <Globo estado={estado} />
        </div>
        <p className="text-sm font-semibold text-on-surface-variant flex items-center gap-1 h-5"><Icon name="location_on" className="!text-[18px] text-primary" />{LEYENDA[estado]}</p>
        <div className="text-center max-w-sm">
          <h1 className="text-2xl lg:text-3xl font-extrabold">Rescata comida, alimenta comunidad.</h1>
          <p className="hidden lg:block mt-2 text-on-surface-variant">Conectamos negocios con excedentes y organizaciones que los necesitan, sin costo y sin intermediarios.</p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        {googlePendiente ? (
          <div className="w-full max-w-sm space-y-4 animate-pop">
            <h2 className="text-2xl font-extrabold">Un último paso</h2>
            <p className="text-on-surface-variant">Hola, <b>{googlePendiente.perfil.nombre}</b>. ¿Cómo participarás en RescatApp?</p>
            <button className="btn-primary w-full" onClick={() => elegirRol('donante')}><Icon name="storefront" /> Soy negocio donante</button>
            <button className="btn-ghost w-full" onClick={() => elegirRol('receptor')}><Icon name="diversity_1" /> Soy comedor u organización</button>
            <p className="text-xs text-on-surface-variant">Las organizaciones receptoras deben ser validadas por un administrador antes de apartar alimentos.</p>
            <button className="text-sm font-semibold text-primary" onClick={() => setGooglePendiente(null)}>Cancelar</button>
          </div>
        ) : (
          <form onSubmit={enviar} className="w-full max-w-sm space-y-5 animate-fade-up">
            <div>
              <h2 className="text-2xl font-extrabold">Iniciar sesión</h2>
              <p className="text-on-surface-variant text-sm">Accede para compartir o apartar alimentos.</p>
            </div>
            <Alerta>{error}</Alerta>
            <label className="block">
              <span className="block text-sm font-semibold mb-1">Correo electrónico</span>
              <input className="input" type="email" required autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" />
            </label>
            <div>
              <span className="flex justify-between text-sm font-semibold mb-1">Contraseña <Link to="/olvide" className="text-primary">¿La olvidaste?</Link></span>
              <CampoPassword value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary w-full" disabled={ocupado}>
              {estado === 'listo' ? <><Icon name="check_circle" /> ¡Bienvenido!</> : estado === 'cargando' ? 'Conectando…' : 'Iniciar sesión'}
            </button>
            <BotonGoogle onCredencial={conGoogle} onError={setError} />
            <p className="text-center text-sm">¿No tienes cuenta? <Link to="/registro" className="font-bold text-primary underline">Regístrate</Link></p>
          </form>
        )}
      </section>
    </div>
  );
}
