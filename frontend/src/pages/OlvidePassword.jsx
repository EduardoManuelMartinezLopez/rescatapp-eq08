import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useTema } from '../context/TemaContext.jsx';
import { Alerta, BotonTema, Icon } from '../components/ui.jsx';

export default function OlvidePassword() {
  const { tema, alternar } = useTema();
  const [correo, setCorreo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resp, setResp] = useState(null);
  const [error, setError] = useState('');

  async function enviar(e) {
    e.preventDefault(); setError(''); setEnviando(true);
    try { setResp(await api('/auth/forgot', { method: 'POST', body: { correo } })); }
    catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <BotonTema tema={tema} alternar={alternar} />
      <div className="card w-full max-w-md p-8 space-y-5 animate-fade-up">
        <div className="text-center"><Icon name="lock_reset" className="text-primary text-5xl" />
          <h1 className="text-2xl font-extrabold mt-1">Recupera tu contraseña</h1>
          <p className="text-on-surface-variant text-sm mt-1">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</p></div>
        {resp ? (
          <div className="space-y-3 animate-pop">
            <Alerta tipo="ok">{resp.mensaje}</Alerta>
            {resp.enlace_dev && (
              <div className="rounded-xl border border-dashed border-secondary p-3 text-sm space-y-1">
                <b className="text-secondary">Modo desarrollo</b>
                <p className="text-on-surface-variant">No hay servidor de correo configurado, así que aquí está el enlace:</p>
                <a className="underline text-primary break-all" href={resp.enlace_dev}>{resp.enlace_dev}</a>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <Alerta>{error}</Alerta>
            <input className="input" type="email" required autoComplete="email" placeholder="tu@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            <button className="btn-primary w-full" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar enlace'}</button>
          </form>
        )}
        <p className="text-center text-sm"><Link to="/login" className="font-bold text-primary underline">Volver a iniciar sesión</Link></p>
      </div>
    </div>
  );
}
