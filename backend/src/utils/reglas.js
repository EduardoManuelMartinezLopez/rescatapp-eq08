// Reglas de validación SIN dependencias. El mismo archivo se copia al frontend (frontend/src/reglas.js)
// para que el formulario y el servidor apliquen exactamente lo mismo.

// ---------- Correo ----------
const EMAIL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
// Errores de dedo muy comunes en el dominio
const DOMINIOS_MAL = {
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.comm': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'outloook.com': 'outlook.com',
  'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.cm': 'yahoo.com',
  'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com', 'live.con': 'live.com',
};

// Devuelve un mensaje de error o null si el correo es válido
function validarCorreo(valor) {
  const c = typeof valor === 'string' ? valor.trim() : '';
  if (!c) return 'Escribe tu correo electrónico.';
  if (c.length > 254) return 'El correo es demasiado largo (máximo 254 caracteres).';
  if (/\s/.test(c)) return 'El correo no puede tener espacios.';
  if (!EMAIL_RE.test(c) || c.includes('..') || c.split('@')[0].length > 64) return 'El correo no tiene un formato válido (ejemplo: nombre@correo.com).';
  const dominio = c.split('@')[1].toLowerCase();
  if (DOMINIOS_MAL[dominio]) return `¿Quisiste escribir @${DOMINIOS_MAL[dominio]}? Revisa el dominio del correo.`;
  return null;
}

// ---------- Nombre ----------
const NOMBRE_RE = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} .,'’&()\-/#]*$/u;
function validarNombre(valor) {
  const n = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
  if (n.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (n.length > 100) return 'El nombre es demasiado largo (máximo 100 caracteres).';
  if (!NOMBRE_RE.test(n)) return 'El nombre solo puede tener letras, números y signos comunes (. , \' & ( ) -).';
  if ((n.match(/\p{L}/gu) || []).length < 2) return 'El nombre debe incluir letras.';
  // Detecta texto sin sentido (golpes al teclado como "jkljkjkljkl" o "asdfgh")
  const bajo = sinAcentos(n).toLowerCase();
  const palabras = bajo.split(/[^a-z]+/).filter(Boolean);
  const sinSentido = /(.)\1{3,}/.test(bajo) || /asdf|qwer|zxcv|sdfg|hjkl|jkl[jk]|wasd|xcvb/.test(bajo) || /[bcdfghjklmnpqrstvwxyz]{6,}/.test(bajo)
    || palabras.some((w) => w.length >= 5 && !/[aeiouy]/.test(w));
  if (sinSentido) return 'Escribe el nombre real de tu negocio u organización.';
  return null;
}

// ---------- Teléfono ----------
// Acepta "+52 9511234567", "9511234567" o formatos con espacios y guiones. Devuelve error o null.
// Con obligatorio = true, el teléfono no puede ir vacío.
function validarTelefono(valor, obligatorio = false) {
  const t = typeof valor === 'string' ? valor.trim() : '';
  if (!t) return obligatorio ? 'Escribe un teléfono de contacto.' : null;
  if (!/^[0-9+()\-\s]{7,25}$/.test(t)) return 'El teléfono solo puede tener números, espacios, guiones y el signo +.';
  const digitos = t.replace(/\D/g, '');
  if (digitos.length < 7 || digitos.length > 15) return 'El teléfono debe tener entre 7 y 15 dígitos.';
  if (/^(\d)\1+$/.test(digitos) || /^(0123456789|1234567890|9876543210)$/.test(digitos.slice(-10))) return 'El teléfono no es válido.';
  // México (+52 o sin lada): 10 dígitos
  const nacional = t.startsWith('+52') ? digitos.slice(2) : (t.startsWith('+') ? null : digitos);
  if (nacional !== null && nacional.length !== 10) return 'El teléfono debe tener 10 dígitos (ej. 9511234567).';
  return null;
}

// ---------- Dirección y ubicación ----------
// Zona permitida: estado de Oaxaca (aprox.)
const ZONA = { latMin: 15.5, latMax: 18.8, lngMin: -98.6, lngMax: -93.7 };
function validarDireccion(valor) {
  const d = typeof valor === 'string' ? limpiarTexto(valor, 500).replace(/\s+/g, ' ') : '';
  if (d.length < 5) return 'Escribe la dirección (mínimo 5 caracteres).';
  if (d.length > 200) return 'La dirección es demasiado larga (máximo 200 caracteres).';
  if (/@|https?:|www\./i.test(d)) return 'Escribe una dirección real (calle, colonia…), no un correo ni un enlace.';
  if ((d.match(/\p{L}/gu) || []).length < 3) return 'La dirección debe incluir el nombre de la calle o colonia.';
  return null;
}
// La ubicación debe ser un punto real marcado en el mapa dentro de Oaxaca
function validarUbicacion(lat, lng) {
  const a = Number(lat), b = Number(lng);
  if (lat === undefined || lat === null || lat === '' || lng === undefined || lng === null || lng === '' || !Number.isFinite(a) || !Number.isFinite(b)) {
    return 'Elige la ubicación en el mapa: busca la dirección y selecciónala de la lista, o toca el mapa.';
  }
  if (a < ZONA.latMin || a > ZONA.latMax || b < ZONA.lngMin || b > ZONA.lngMax) return 'La ubicación debe estar en el estado de Oaxaca.';
  return null;
}

// ---------- Contraseña ----------
const COMUNES = new Set([
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234', '12121212', '123123123', '1q2w3e4r',
  'password', 'password1', 'passw0rd', 'qwertyui', 'qwerty123', 'qwertyuiop', 'asdfghjk', 'zxcvbnm1', 'abc12345', 'abcd1234',
  'contrasena', 'contrasena1', 'contrasena123', 'miContrasena'.toLowerCase(), 'iloveyou', 'letmein1', 'welcome1', 'admin123',
  'administrador', 'rescatapp', 'rescatapp1', 'rescatapp123', 'oaxaca123', 'mexico123', 'bienvenido', 'bienvenido1', 'superman',
  'princesa', 'princesa1', 'futbol123', 'chivas123', 'america123', 'pumas1234', 'te amo 123', 'teamo1234', 'monkey123', 'dragon123',
]);
// Palabras base que, aun con números o símbolos pegados, son fáciles de adivinar (Password1, Admin2024!)
const BASES = ['password', 'contrasena', 'qwerty', 'admin', 'administrador', 'rescatapp', 'oaxaca', 'welcome', 'letmein', 'iloveyou', 'bienvenido'];

const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const normalizar = (s) => sinAcentos(String(s)).toLowerCase();

function esSecuencia(p) {
  if (p.length < 4) return false;
  if (/^(.)\1+$/.test(p)) return true; // aaaaaaaa, 11111111
  const abc = 'abcdefghijklmnopqrstuvwxyz', num = '0123456789', teclado = 'qwertyuiopasdfghjklzxcvbnm';
  return [abc, num, teclado].some((s) => s.includes(p) || [...s].reverse().join('').includes(p));
}

function esComun(pw) {
  const n = normalizar(pw);
  const solo = n.replace(/[^a-z0-9]/g, '');
  if (COMUNES.has(n) || COMUNES.has(solo) || esSecuencia(n) || esSecuencia(solo)) return true;
  const letras = solo.replace(/[0-9]+$/, '');
  return BASES.some((b) => letras === b) && solo.length <= letras.length + 6;
}

// ¿Contiene la contraseña el usuario del correo o alguna palabra del nombre?
function contieneDatosPersonales(pw, ctx = {}) {
  const n = normalizar(pw).replace(/[^a-z0-9]/g, '');
  const trozos = [];
  if (ctx.correo) trozos.push(normalizar(String(ctx.correo).split('@')[0]).replace(/[^a-z0-9]/g, ''));
  if (ctx.nombre) trozos.push(...normalizar(ctx.nombre).split(/[^a-z0-9]+/));
  return trozos.some((t) => t.length >= 4 && n.includes(t));
}

// Lista de reglas con su estado (la usa el formulario para mostrar la lista de requisitos en vivo)
function reglasPassword(valor, ctx = {}) {
  const pw = typeof valor === 'string' ? valor : '';
  const reglas = [
    { id: 'largo', texto: 'Al menos 8 caracteres', ok: pw.length >= 8 },
    { id: 'mayus', texto: 'Una letra mayúscula', ok: /\p{Lu}/u.test(pw) },
    { id: 'minus', texto: 'Una letra minúscula', ok: /\p{Ll}/u.test(pw) },
    { id: 'numero', texto: 'Un número', ok: /\d/.test(pw) },
    { id: 'comun', texto: 'No es una contraseña común (como 12345678 o Password1)', ok: pw.length > 0 && !esComun(pw) },
  ];
  if (ctx.correo || ctx.nombre) {
    reglas.push({ id: 'personal', texto: 'No contiene tu correo ni tu nombre', ok: pw.length > 0 && !contieneDatosPersonales(pw, ctx) });
  }
  return reglas;
}

// Mensajes de error (vacío = contraseña válida)
function validarPassword(valor, ctx = {}) {
  if (typeof valor !== 'string' || !valor) return ['Escribe una contraseña.'];
  const e = [];
  if (valor.length > 72) e.push('La contraseña es demasiado larga (máximo 72 caracteres).');
  const r = Object.fromEntries(reglasPassword(valor, ctx).map((x) => [x.id, x.ok]));
  if (!r.largo) e.push('La contraseña debe tener al menos 8 caracteres.');
  if (!r.mayus) e.push('La contraseña debe incluir una letra mayúscula.');
  if (!r.minus) e.push('La contraseña debe incluir una letra minúscula.');
  if (!r.numero) e.push('La contraseña debe incluir un número.');
  if (r.largo && r.comun === false) e.push('Esa contraseña es muy común o fácil de adivinar. Elige otra.');
  if (r.personal === false) e.push('La contraseña no debe contener tu correo ni tu nombre.');
  return e;
}

// Nivel de fuerza para la barra: 0 débil, 1 media, 2 fuerte
function fuerzaPassword(valor, ctx = {}) {
  const pw = typeof valor === 'string' ? valor : '';
  if (!pw) return { nivel: -1, etiqueta: '' };
  if (validarPassword(pw, ctx).length) return { nivel: 0, etiqueta: 'Débil' };
  const simbolo = /[^\p{L}\d\s]/u.test(pw);
  if (pw.length >= 12 || (simbolo && pw.length >= 10)) return { nivel: 2, etiqueta: 'Fuerte' };
  return { nivel: 1, etiqueta: 'Media' };
}

// ---------- Textos libres ----------
// Quita etiquetas HTML y caracteres de control, junta espacios y recorta a "max" caracteres.
function limpiarTexto(valor, max = 500) {
  if (typeof valor !== 'string') return '';
  return valor
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

module.exports = {
  EMAIL_RE, validarCorreo, validarNombre, validarTelefono, validarDireccion, validarUbicacion,
  reglasPassword, validarPassword, fuerzaPassword, esComun, contieneDatosPersonales, limpiarTexto,
};
