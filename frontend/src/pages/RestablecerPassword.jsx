import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { validarPassword } from '../reglas.js';
import { useTema } from '../context/TemaContext.jsx';
import { Alerta, BotonTema, CampoPassword, Icon, IndicadorPassword } from '../components/ui.jsx';

export default function RestablecerPassword() {
  const { tema, alternar } = useTema();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault(); setError('');
    const malas = validarPassword(pw);
    if (malas.length) return setError(malas[0]);
    if (pw !== pw2) return setError('Las contraseñas no coinciden.');
    setEnviando(true);
    try { await api('/auth/reset', { method: 'POST', body: { token, password: pw } }); setListo(true); }
    catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <BotonTema tema={tema} alternar={alternar} />
      <div className="card w-full max-w-md p-8 space-y-5 animate-fade-up">
        <div className="text-center"><Icon name={listo ? 'check_circle' : 'password'} className="text-primary text-5xl" />
          <h1 className="text-2xl font-extrabold mt-1">{listo ? '¡Contraseña actualizada!' : 'Crea tu nueva contraseña'}</h1></div>
        {listo ? (
          <Link to="/login" className="btn-primary w-full">Iniciar sesión</Link>
        ) : !token ? (
          <><Alerta>El enlace no es válido. Solicita uno nuevo.</Alerta><Link to="/olvide" className="btn-ghost w-full">Solicitar enlace</Link></>
        ) : (
          <form onSubmit={enviar} noValidate className="space-y-4">
            <Alerta>{error}</Alerta>
            <div><CampoPassword autoComplete="new-password" placeholder="Nueva contraseña" value={pw} onChange={(e) => setPw(e.target.value)} />
              <IndicadorPassword password={pw} /></div>
            <CampoPassword autoComplete="new-password" placeholder="Repite la contraseña" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            <button className="btn-primary w-full" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar contraseña'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
