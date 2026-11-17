import { Link } from 'react-router-dom';
import { useTema } from '../context/TemaContext.jsx';
import { BotonTema, Icon } from '../components/ui.jsx';

export const SECCIONES = [
  ['Quiénes somos', 'RescatApp es una plataforma académica (proyecto escolar del Instituto Tecnológico de Oaxaca) que conecta negocios con excedentes de alimentos con comedores, albergues y organizaciones de Oaxaca de Juárez. No maneja pagos ni vende alimentos.'],
  ['Qué datos recopilamos', 'Nombre del negocio u organización, correo electrónico, contraseña (se guarda cifrada, nunca en texto claro), teléfono y dirección de contacto (opcionales), así como las donaciones, reservas y calificaciones que registras en la plataforma.'],
  ['Para qué los usamos', 'Para crear tu cuenta, mostrar tus donaciones a quien puede recogerlas, coordinar la recolección, enviarte avisos (por ejemplo, confirmar tu correo o recuperar tu contraseña) y calcular estadísticas de impacto sin datos personales.'],
  ['Con quién se comparten', 'Tu teléfono y dirección solo los ve la persona u organización con la que coordinas una donación. No vendemos ni cedemos tus datos a terceros.'],
  ['Tus derechos', 'Puedes consultar y corregir tus datos desde tu perfil, y pedir que tu cuenta sea eliminada escribiendo al responsable del proyecto. Puedes cambiar tu contraseña en cualquier momento.'],
  ['Términos de uso', 'Toda donación es gratuita y destinada exclusivamente al consumo solidario. El donante declara de buena fe que el alimento es apto para consumo y la organización receptora se compromete a darle un uso solidario. Está prohibido publicar información falsa, alimentos en mal estado o usar la plataforma con fines de lucro. Las cuentas que incumplan estas reglas pueden ser suspendidas por un administrador.'],
  ['Seguridad', 'Usamos conexión cifrada (HTTPS), contraseñas protegidas con bcrypt, límites de intentos de acceso y cierre de sesión por inactividad.'],
];

// Texto del aviso (se usa en la página /privacidad y en la ventana emergente del registro)
export function ContenidoPrivacidad() {
  return SECCIONES.map(([t, d]) => (
    <section key={t}><h2 className="font-bold text-lg">{t}</h2><p className="text-on-surface-variant leading-relaxed">{d}</p></section>
  ));
}

export default function Privacidad() {
  const { tema, alternar } = useTema();
  return (
    <div className="min-h-screen p-4">
      <BotonTema tema={tema} alternar={alternar} />
      <article className="card max-w-2xl mx-auto p-8 space-y-5 my-6 animate-fade-up">
        <div className="flex items-center gap-3"><Icon name="shield" className="text-primary text-4xl" />
          <h1 className="text-2xl font-extrabold">Aviso de privacidad y términos de uso</h1></div>
        <p className="text-sm text-on-surface-variant">Proyecto académico RescatApp · Oaxaca de Juárez, Oaxaca.</p>
        <ContenidoPrivacidad />
        <button type="button" onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = '/'))} className="btn-primary w-full">Entendido</button>
        <p className="text-center text-sm"><Link to="/" className="underline text-primary">Ir al inicio</Link></p>
      </article>
    </div>
  );
}
