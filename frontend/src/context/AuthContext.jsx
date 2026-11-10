import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, guardarToken, leerToken } from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(!!leerToken());

  // Al abrir la página, si hay token guardado, recuperamos al usuario
  useEffect(() => {
    if (!leerToken()) return;
    api('/auth/me')
      .then((d) => setUsuario(d.usuario))
      .catch(() => guardarToken(null))
      .finally(() => setCargando(false));
  }, []);

  // Verifica credenciales SIN abrir la sesión todavía (la pantalla de login anima el globo antes de entrar)
  const iniciarSesion = useCallback((correo, password) => api('/auth/login', { method: 'POST', body: { correo, password } }), []);

  // Abre la sesión con la respuesta del servidor ({ token, usuario })
  const aceptarSesion = useCallback((d) => { guardarToken(d.token); setUsuario(d.usuario); return d.usuario; }, []);

  const registrar = useCallback(async (datos) => aceptarSesion(await api('/auth/register', { method: 'POST', body: datos })), [aceptarSesion]);

  const refrescarUsuario = useCallback(async () => { const d = await api('/auth/me'); setUsuario(d.usuario); return d.usuario; }, []);

  const cerrarSesion = useCallback(() => { guardarToken(null); setUsuario(null); }, []);

  return (
    <AuthContext.Provider value={{ usuario, setUsuario, cargando, iniciarSesion, aceptarSesion, registrar, refrescarUsuario, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export const rutaInicial = (rol) => ({ receptor: '/mapa', donante: '/mis-donaciones', admin: '/admin' }[rol] || '/login');
