import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, rutaInicial } from './context/AuthContext.jsx';
import { Cargando } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import OlvidePassword from './pages/OlvidePassword.jsx';
import RestablecerPassword from './pages/RestablecerPassword.jsx';
import Perfil from './pages/Perfil.jsx';
import Mapa from './pages/Mapa.jsx';
import MisReservas from './pages/MisReservas.jsx';
import MisDonaciones from './pages/MisDonaciones.jsx';
import NuevaDonacion from './pages/NuevaDonacion.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import AdminOrganizaciones from './pages/AdminOrganizaciones.jsx';

// Solo deja pasar a usuarios con sesión y con el rol correcto
function Protegida({ roles, children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!roles.includes(usuario.rol)) return <Navigate to={rutaInicial(usuario.rol)} replace />;
  return children;
}

function Inicio() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Cargando />;
  return <Navigate to={usuario ? rutaInicial(usuario.rol) : '/login'} replace />;
}

export default function App() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div className="p-6 max-w-6xl mx-auto"><Cargando /></div>;
  const publica = (el) => (usuario ? <Navigate to={rutaInicial(usuario.rol)} replace /> : el);
  return (
    <Routes>
      <Route path="/login" element={publica(<Login />)} />
      <Route path="/registro" element={publica(<Registro />)} />
      <Route path="/olvide" element={<OlvidePassword />} />
      <Route path="/restablecer" element={<RestablecerPassword />} />
      <Route element={usuario ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/mapa" element={<Protegida roles={['receptor']}><Mapa /></Protegida>} />
        <Route path="/mis-reservas" element={<Protegida roles={['receptor']}><MisReservas /></Protegida>} />
        <Route path="/mis-donaciones" element={<Protegida roles={['donante']}><MisDonaciones /></Protegida>} />
        <Route path="/nueva-donacion" element={<Protegida roles={['donante']}><NuevaDonacion /></Protegida>} />
        <Route path="/editar-donacion/:id" element={<Protegida roles={['donante']}><NuevaDonacion /></Protegida>} />
        <Route path="/admin" element={<Protegida roles={['admin']}><AdminPanel /></Protegida>} />
        <Route path="/admin/organizaciones" element={<Protegida roles={['admin']}><AdminOrganizaciones /></Protegida>} />
      </Route>
      <Route path="*" element={<Inicio />} />
    </Routes>
  );
}
