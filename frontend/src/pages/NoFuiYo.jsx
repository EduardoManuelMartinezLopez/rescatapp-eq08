import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useTema } from '../context/TemaContext.jsx';
import { Alerta, BotonTema, Icon } from '../components/ui.jsx';

// Pantalla a la que llega quien recibió el correo de confirmación sin haberse registrado («Yo no creé esta cuenta»)
export default function NoFuiYo() {
  const { tema, alternar } = useTema();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [estado, setEstado] = useState(token ? 'pregunta' : 'error'); // pregunta | ok | error
  const [msg, setMsg] = useState(token ? '' : 'El enlace no es válido.');
  const [enviando, setEnviando] = useState(false);

  async function eliminar() {
    setEnviando(true);
    try { const d = await api('/auth/discard', { method: 'POST', body: { token } }); setEstado('ok'); setMsg(d.mensaje); }
    catch (e) { setEstado('error'); setMsg(e.message); }
    finally { setEnviando(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <BotonTema tema={tema} alternar={alternar} />
      <div className="card w-full max-w-md p-8 space-y-5 text-center animate-fade-up">
        <Icon name={estado === 'ok' ? 'task_alt' : estado === 'error' ? 'error' : 'help'} className={`text-6xl ${estado === 'error' ? 'text-error' : 'text-primary'}`} />
        <h1 className="text-2xl font-extrabold">{estado === 'ok' ? 'Cuenta eliminada' : estado === 'error' ? 'No se pudo eliminar' : '¿No creaste esta cuenta?'}</h1>
        {estado === 'pregunta' && <p className="text-on-surface-variant">Alguien usó tu correo para registrarse en RescatApp. Si no fuiste tú, elimina esa cuenta ahora. Esta acción no se puede deshacer.</p>}
        {msg && <Alerta tipo={estado === 'ok' ? 'ok' : 'error'}>{msg}</Alerta>}
        {estado === 'pregunta' && <button className="btn-danger w-full" onClick={eliminar} disabled={enviando}>{enviando ? 'Eliminando…' : 'Sí, no fui yo: eliminar la cuenta'}</button>}
        <Link to="/" className={estado === 'pregunta' ? 'btn-ghost w-full' : 'btn-primary w-full'}>{estado === 'pregunta' ? 'No, conservarla' : 'Ir al inicio'}</Link>
      </div>
    </div>
  );
}
