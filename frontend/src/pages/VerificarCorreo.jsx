import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTema } from '../context/TemaContext.jsx';
import { Alerta, BotonTema, Icon } from '../components/ui.jsx';

// Pantalla a la que llega la persona al abrir el enlace de confirmación de su correo
export default function VerificarCorreo() {
  const { tema, alternar } = useTema();
  const { usuario, setUsuario } = useAuth();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [estado, setEstado] = useState(token ? 'cargando' : 'error');
  const [msg, setMsg] = useState(token ? '' : 'El enlace no es válido.');

  useEffect(() => {
    if (!token) return;
    api('/auth/verify', { method: 'POST', body: { token } })
      .then((d) => { setEstado('ok'); setMsg(d.mensaje); if (usuario) setUsuario({ ...usuario, correo_verificado: true }); })
      .catch((e) => { setEstado('error'); setMsg(e.message); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <BotonTema tema={tema} alternar={alternar} />
      <div className="card w-full max-w-md p-8 space-y-5 text-center animate-fade-up">
        <Icon name={estado === 'ok' ? 'mark_email_read' : estado === 'error' ? 'error' : 'hourglass_top'} className={`text-6xl ${estado === 'error' ? 'text-error' : 'text-primary'}`} />
        <h1 className="text-2xl font-extrabold">{estado === 'ok' ? '¡Correo confirmado!' : estado === 'error' ? 'No se pudo confirmar' : 'Confirmando tu correo…'}</h1>
        {msg && <Alerta tipo={estado === 'ok' ? 'ok' : 'error'}>{msg}</Alerta>}
        <Link to="/" className="btn-primary w-full">Continuar</Link>
      </div>
    </div>
  );
}
