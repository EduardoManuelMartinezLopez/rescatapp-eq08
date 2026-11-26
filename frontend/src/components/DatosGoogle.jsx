import { useState } from 'react';
import { validarDireccion, validarNombre, validarPassword, validarTelefono, validarUbicacion } from '../reglas.js';
import { TEXTO_ROL } from '../lib/roles.js';
import { Alerta, Campo, CampoPassword, CampoTelefono, Icon, IndicadorPassword, Modal } from './ui.jsx';
import { ContenidoPrivacidad } from '../pages/Privacidad.jsx';
import SelectorUbicacion from './SelectorUbicacion.jsx';

// Segundo paso al crear una cuenta con Google: se piden los mismos datos de contacto que en el registro,
// con los textos propios del rol elegido (negocio donante u organización receptora).
export default function DatosGoogle({ rol, perfil, onEnviar, onVolver, error, ocupado }) {
  const T = TEXTO_ROL[rol];
  const [f, setF] = useState({ nombre: perfil?.nombre || '', telefono: '', direccion: '', password: '', password2: '', acepta: false });
  const [punto, setPunto] = useState(null);
  const [errs, setErrs] = useState({});
  const [verAviso, setVerAviso] = useState(false);
  const quitar = (k) => setErrs((p) => { const q = { ...p }; delete q[k]; return q; });

  const conPassword = f.password !== '' || f.password2 !== '';

  function enviar(e) {
    e.preventDefault();
    const m = {};
    const n = validarNombre(f.nombre); if (n) m.nombre = n;
    const t = validarTelefono(f.telefono, true); if (t) m.telefono = t;
    const d = validarDireccion(f.direccion) || validarUbicacion(punto?.[0], punto?.[1]); if (d) m.direccion = d;
    // La contraseña es opcional: si se deja vacía, la cuenta entra solo con el botón de Google
    if (conPassword) {
      const pw = validarPassword(f.password, { correo: perfil?.correo, nombre: f.nombre }); if (pw.length) m.password = pw[0];
      if (!f.password2) m.password2 = 'Repite la contraseña.'; else if (f.password2 !== f.password) m.password2 = 'Las contraseñas no coinciden.';
    }
    if (!f.acepta) m.acepta = 'Debes aceptar el aviso de privacidad y los términos para crear tu cuenta.';
    setErrs(m);
    if (Object.keys(m).length) return;
    onEnviar({ nombre: f.nombre, telefono: f.telefono, direccion: f.direccion, latitud: punto[0], longitud: punto[1], ...(conPassword ? { password: f.password } : {}), acepta_terminos: true });
  }

  return (
    <form onSubmit={enviar} noValidate className="w-full max-w-md space-y-4 animate-pop">
      <div>
        <h2 className="text-2xl font-extrabold">Completa tus datos</h2>
        <p className="text-on-surface-variant text-sm">Hola, <b>{perfil?.nombre}</b>. Falta poco para crear tu cuenta de {rol === 'donante' ? 'negocio donante' : 'organización receptora'}.</p>
      </div>
      {T.aviso && <p className="text-sm rounded-xl bg-primary-container/15 p-3 flex gap-2"><Icon name="info" className="text-primary" />{T.aviso}</p>}
      <Alerta>{error}</Alerta>
      <Campo etiqueta={T.nombre} error={errs.nombre}>
        <input className="input" maxLength={100} value={f.nombre} placeholder={T.placeholder} autoComplete="organization"
          onChange={(e) => { setF({ ...f, nombre: e.target.value }); quitar('nombre'); }} />
      </Campo>
      <Campo etiqueta={T.telefono} ayuda={T.ayudaTelefono} error={errs.telefono}>
        <CampoTelefono value={f.telefono} onChange={(v) => { setF((x) => ({ ...x, telefono: v })); quitar('telefono'); }} />
      </Campo>
      <div>
        <span className="block text-sm font-semibold mb-1">{T.direccion}</span>
        <SelectorUbicacion requerida={false} alto={220} direccion={f.direccion}
          onDireccion={(v) => { setF((x) => ({ ...x, direccion: v })); quitar('direccion'); }}
          punto={punto} onPunto={(v) => { setPunto(v); if (v) quitar('direccion'); }} />
        {errs.direccion && <p role="alert" className="text-xs font-semibold text-error mt-1">{errs.direccion}</p>}
        <p className="text-xs text-on-surface-variant mt-1">{T.ayudaDireccion}</p>
      </div>
      <div>
        <Campo etiqueta="Crea una contraseña (opcional)" ayuda={`Con ella también podrás entrar con ${perfil?.correo || 'tu correo'} y tu navegador podrá recordarla. Si la dejas vacía, entrarás solo con el botón de Google.`} error={errs.password}>
          <CampoPassword name="new-password" id="google-password" autoComplete="new-password" required={false} value={f.password}
            onChange={(e) => { setF({ ...f, password: e.target.value }); quitar('password'); }} />
        </Campo>
        {f.password && <IndicadorPassword password={f.password} ctx={{ correo: perfil?.correo, nombre: f.nombre }} />}
      </div>
      <Campo etiqueta="Repite la contraseña" error={errs.password2}>
        <CampoPassword name="new-password-confirm" id="google-password2" autoComplete="new-password" required={false} value={f.password2}
          onChange={(e) => { setF({ ...f, password2: e.target.value }); quitar('password2'); }} />
      </Campo>
      <div>
        <label className="flex gap-3 items-start cursor-pointer">
          <input type="checkbox" className="mt-1 w-6 h-6 accent-primary shrink-0" checked={f.acepta}
            onChange={(e) => { setF({ ...f, acepta: e.target.checked }); quitar('acepta'); }} />
          <span className="text-sm">He leído y acepto el <button type="button" onClick={() => setVerAviso(true)} className="font-bold text-primary underline">aviso de privacidad y los términos de uso</button>.</span>
        </label>
        {errs.acepta && <p role="alert" className="text-xs font-semibold text-error mt-1">{errs.acepta}</p>}
      </div>
      <button className="btn-primary w-full" disabled={ocupado}>{ocupado ? 'Creando…' : conPassword ? 'Crear cuenta' : 'Omitir contraseña y crear cuenta'}</button>
      <button type="button" className="text-sm font-semibold text-primary" onClick={onVolver}>Cancelar</button>
      {verAviso && (
        <Modal titulo="Aviso de privacidad y términos" onCerrar={() => setVerAviso(false)}>
          <div className="space-y-4 text-sm">
            <ContenidoPrivacidad />
            <button type="button" className="btn-primary w-full" onClick={() => { setVerAviso(false); setF((x) => ({ ...x, acepta: true })); quitar('acepta'); }}>Entendido, acepto</button>
            <button type="button" className="btn-ghost w-full" onClick={() => setVerAviso(false)}>Cerrar</button>
          </div>
        </Modal>
      )}
    </form>
  );
}
