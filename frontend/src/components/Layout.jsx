import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
