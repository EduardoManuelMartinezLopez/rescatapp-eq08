import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTema } from '../context/TemaContext.jsx';
import { Icon } from './ui.jsx';
import Campana from './Campana.jsx';

const MENU = {
  receptor: [
    { a: '/mapa', t: 'Mapa', i: 'map' },
    { a: '/mis-reservas', t: 'Mis reservas', i: 'inventory_2' },
    { a: '/perfil', t: 'Perfil', i: 'account_circle' },
  ],
  donante: [
    { a: '/mis-donaciones', t: 'Mis donaciones', i: 'volunteer_activism' },
    { a: '/nueva-donacion', t: 'Publicar', i: 'add_circle' },
    { a: '/perfil', t: 'Perfil', i: 'account_circle' },
  ],
  admin: [
    { a: '/admin', t: 'Panel', i: 'dashboard' },
    { a: '/admin/organizaciones', t: 'Organizaciones', i: 'verified_user' },
    { a: '/perfil', t: 'Perfil', i: 'account_circle' },
  ],
};
const ROL = { receptor: 'Receptor comunitario', donante: 'Donante', admin: 'Administrador' };

// Avisos globales: sin conexión y correo sin confirmar
function Avisos() {
  const { usuario, setUsuario } = useAuth();
  const [enLinea, setEnLinea] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    const on = () => setEnLinea(true), off = () => setEnLinea(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  // Si confirmó el correo en otra pestaña, se actualiza al volver a esta
  useEffect(() => {
    if (usuario.correo_verificado !== false) return undefined;
    const revisar = () => api('/auth/me').then((d) => { if (d.usuario.correo_verificado) setUsuario(d.usuario); }).catch(() => {});
    window.addEventListener('focus', revisar);
    return () => window.removeEventListener('focus', revisar);
  }, [usuario.correo_verificado, setUsuario]);
  async function reenviar() {
    setEnviando(true);
    try { setMsg((await api('/auth/resend-verification', { method: 'POST' })).mensaje); } catch (e) { setMsg(e.message); }
    finally { setEnviando(false); }
  }
  return (
    <>
      {!enLinea && (
        <div role="alert" className="no-print bg-error text-on-error text-sm font-semibold text-center px-4 py-2 flex items-center justify-center gap-2">
          <Icon name="wifi_off" className="text-[18px]" />Sin conexión a internet. Algunas funciones no estarán disponibles hasta que regrese.
        </div>
      )}
      {usuario.correo_verificado === false && (
        <div className="no-print bg-secondary-container/40 text-on-surface text-sm px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1"><Icon name="mark_email_unread" className="text-[18px] text-secondary" />{msg || 'Confirma tu correo: te enviamos un enlace a tu bandeja de entrada.'}</span>
          <button type="button" onClick={reenviar} disabled={enviando} className="font-bold text-primary underline disabled:opacity-50">{enviando ? 'Enviando…' : 'Reenviar enlace'}</button>
        </div>
      )}
    </>
  );
}

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const { tema, alternar } = useTema();
  const nav = useNavigate();
  const loc = useLocation();
  const items = MENU[usuario.rol] || [];
  const salir = () => { cerrarSesion(); nav('/login'); };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print sticky top-0 z-[1000] bg-surface-container-lowest/95 backdrop-blur border-b border-outline-variant/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 mr-auto">
            <Icon name="volunteer_activism" className="text-primary text-[28px]" />
            <div className="leading-tight">
              <p className="font-extrabold text-primary">RescatApp</p>
              <p className="text-[11px] text-on-surface-variant">Oaxaca de Juárez</p>
            </div>
          </Link>
          <nav className="hidden md:flex gap-1">
            {items.map((m) => (
              <NavLink key={m.a} to={m.a} end className={({ isActive }) =>
                `px-4 py-2 rounded-xl font-semibold transition ${isActive ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container'}`}>
                {m.t}
              </NavLink>
            ))}
          </nav>
          <div className="text-right hidden lg:block leading-tight">
            <p className="text-sm font-semibold max-w-[180px] truncate">{usuario.nombre}</p>
            <p className="text-xs text-on-surface-variant">{ROL[usuario.rol]}</p>
          </div>
          <Campana />
          <button onClick={alternar} className="w-11 h-11 rounded-xl hover:bg-surface-container grid place-items-center" aria-label={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
            <Icon name={tema === 'oscuro' ? 'light_mode' : 'dark_mode'} className="text-[24px]" />
          </button>
          <button onClick={salir} className="btn-ghost !min-h-[44px] !px-3" title="Cerrar sesión">
            <Icon name="logout" /><span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <Avisos />

      {/* "key" reinicia la animación de entrada en cada pantalla */}
      <main key={loc.pathname} className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 pb-24 md:pb-8 animate-fade-up"><Outlet /></main>

      {/* Barra inferior para celular (touch targets ≥ 48 px) */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-[1000] bg-surface-container-lowest border-t border-outline-variant/60 flex">
        {items.map((m) => (
          <NavLink key={m.a} to={m.a} end className={({ isActive }) =>
            `flex-1 min-h-[56px] flex flex-col items-center justify-center text-xs font-semibold transition ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
            <Icon name={m.i} />{m.t}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
