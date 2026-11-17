import { Link } from 'react-router-dom';
import { useTema } from '../context/TemaContext.jsx';
import { BotonTema, Icon } from '../components/ui.jsx';

// Página 404 amigable
export default function NotFound() {
  const { tema, alternar } = useTema();
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <BotonTema tema={tema} alternar={alternar} />
      <div className="card w-full max-w-md p-8 text-center space-y-4 animate-fade-up">
        <Icon name="travel_explore" className="text-primary text-6xl" />
        <h1 className="text-3xl font-extrabold">404</h1>
        <p className="font-bold text-lg">No encontramos esta página</p>
        <p className="text-on-surface-variant">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
        <Link to="/" className="btn-primary w-full">Volver al inicio</Link>
      </div>
    </div>
  );
}
