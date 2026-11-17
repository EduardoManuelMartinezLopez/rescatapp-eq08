// Limitador de intentos en memoria (suficiente para un solo servidor con PM2 en modo "fork").
// Guarda marcas de tiempo por clave y las olvida al pasar la ventana.
function crearLimitador({ max, ventanaMs }) {
  const mapa = new Map();
  const vigentes = (clave, ahora) => {
    const arr = (mapa.get(clave) || []).filter((t) => ahora - t < ventanaMs);
    if (arr.length) mapa.set(clave, arr); else mapa.delete(clave);
    return arr;
  };
  return {
    // ¿Está bloqueada la clave? Devuelve los segundos que faltan (0 = libre)
    bloqueado(clave, ahora = Date.now()) {
      const arr = vigentes(clave, ahora);
      return arr.length >= max ? Math.ceil((arr[0] + ventanaMs - ahora) / 1000) : 0;
    },
    registrar(clave, ahora = Date.now()) { vigentes(clave, ahora); mapa.set(clave, [...(mapa.get(clave) || []), ahora]); },
    reiniciar(clave) { mapa.delete(clave); },
    limpiarTodo() { mapa.clear(); },
  };
}

const minutos = (s) => Math.max(1, Math.ceil(s / 60));

// Limita las peticiones (cuenten o no como error) por IP. Responde 429 con mensaje claro.
function limitarPeticiones({ max, ventanaMs, mensaje }) {
  const lim = crearLimitador({ max, ventanaMs });
  const mw = (req, res, next) => {
    const clave = req.ip || 'desconocida';
    const espera = lim.bloqueado(clave);
    if (espera) {
      res.set('Retry-After', String(espera));
      return res.status(429).json({ error: `${mensaje} Intenta de nuevo en ${minutos(espera)} minuto(s).` });
    }
    lim.registrar(clave);
    next();
  };
  mw.limpiar = lim.limpiarTodo;
  return mw;
}

module.exports = { crearLimitador, limitarPeticiones, minutos };
