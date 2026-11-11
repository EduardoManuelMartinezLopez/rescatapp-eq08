// Pruebas automáticas de la API (runner nativo de Node: no requiere instalar nada extra).
// Usan una base SEPARADA (rescatapp_test) para no ensuciar la base de demostración.
// Preparación (una sola vez): crear la base "rescatapp_test" y ejecutar en ella database/rescatapp_database.sql
// Ejecutar:  npm test
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME_TEST || 'rescatapp_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-pruebas';
process.env.DEV_SHOW_RESET_LINK = 'true';
process.env.GOOGLE_CLIENT_ID = '';
process.env.SMTP_HOST = '';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const pool = require('../src/db');

let server, base;
const sufijo = Date.now();
const futuro = (horas = 6) => new Date(Date.now() + horas * 3600 * 1000).toISOString();

async function api(metodo, ruta, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(base + ruta, { method: metodo, headers, body: body ? JSON.stringify(body) : undefined });
  const tipo = r.headers.get('content-type') || '';
  const datos = tipo.includes('json') ? await r.json() : tipo.startsWith('text/') ? await r.text() : Buffer.from(await r.arrayBuffer());
  return { status: r.status, datos, tipo };
}
const login = async (correo, password = 'Demo1234!') => (await api('POST', '/api/auth/login', { body: { correo, password } })).datos.token;
const donacionBase = (extra = {}) => ({
  titulo: 'Pan de prueba automática', categoria: 'Pan y repostería', kilos: 5, direccion: 'Centro, Oaxaca de Juárez',
  latitud: 17.06, longitud: -96.72, horario_recoleccion: '8 pm a 9 pm', acepta_buena_fe: true, fecha_caducidad: futuro(), ...extra,
});

let tAdmin, tDonante, tRec1, tRec2;

before(async () => {
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  tAdmin = await login('admin@rescatapp.test');
  tDonante = await login('panaderia@rescatapp.test');
  tRec1 = await login('esperanza@rescatapp.test');
  tRec2 = await login('banco@rescatapp.test');
});
after(async () => { await new Promise((r) => server.close(r)); await pool.end(); });

describe('Autenticación', () => {
  const correo = `auto${sufijo}@rescatapp.test`;
  test('registro válido responde 201 y no expone el hash', async () => {
    const r = await api('POST', '/api/auth/register', { body: { nombre: 'Negocio Auto', correo, password: 'Prueba1234', rol: 'donante' } });
    assert.equal(r.status, 201);
    assert.ok(r.datos.token);
    assert.ok(!JSON.stringify(r.datos).includes('password_hash'));
  });
  test('correo duplicado responde 409', async () => {
    const r = await api('POST', '/api/auth/register', { body: { nombre: 'Negocio Auto', correo, password: 'Prueba1234', rol: 'donante' } });
    assert.equal(r.status, 409);
  });
  test('datos inválidos responden 400', async () => {
    const r = await api('POST', '/api/auth/register', { body: { nombre: 'A', correo: 'x', password: '1', rol: 'admin' } });
    assert.equal(r.status, 400);
  });
  test('login con contraseña incorrecta responde 401', async () => {
    const r = await api('POST', '/api/auth/login', { body: { correo: 'admin@rescatapp.test', password: 'mala' } });
    assert.equal(r.status, 401);
  });
  test('sin token responde 401 y con token falso también', async () => {
    assert.equal((await api('GET', '/api/auth/me')).status, 401);
    assert.equal((await api('GET', '/api/auth/me', { token: 'abc.def.ghi' })).status, 401);
  });
  test('Google sin configurar responde 503', async () => {
    assert.equal((await api('POST', '/api/auth/google', { body: { credential: 'x' } })).status, 503);
  });
});

describe('Recuperar contraseña y perfil', () => {
  const correo = `reset${sufijo}@rescatapp.test`;
  let enlace;
  test('forgot no revela si el correo existe', async () => {
    const a = await api('POST', '/api/auth/register', { body: { nombre: 'Persona Reset', correo, password: 'Vieja12345', rol: 'donante' } });
    assert.equal(a.status, 201);
    const existe = await api('POST', '/api/auth/forgot', { body: { correo } });
    const noExiste = await api('POST', '/api/auth/forgot', { body: { correo: `nadie${sufijo}@rescatapp.test` } });
    assert.equal(existe.status, 200);
    assert.equal(noExiste.status, 200);
    assert.equal(existe.datos.mensaje, noExiste.datos.mensaje);
    assert.ok(existe.datos.enlace_dev);
    assert.equal(noExiste.datos.enlace_dev, undefined);
    enlace = existe.datos.enlace_dev;
  });
  test('reset con token inválido responde 400', async () => {
    assert.equal((await api('POST', '/api/auth/reset', { body: { token: 'no-es-token', password: 'Nueva12345' } })).status, 400);
  });
  test('reset válido cambia la contraseña y el token no se reutiliza', async () => {
    const token = new URL(enlace).searchParams.get('token');
    assert.equal((await api('POST', '/api/auth/reset', { body: { token, password: 'corta' } })).status, 400);
    assert.equal((await api('POST', '/api/auth/reset', { body: { token, password: 'Nueva12345' } })).status, 200);
    assert.equal((await api('POST', '/api/auth/reset', { body: { token, password: 'Otra123456' } })).status, 400);
    assert.equal((await api('POST', '/api/auth/login', { body: { correo, password: 'Vieja12345' } })).status, 401);
    assert.equal((await api('POST', '/api/auth/login', { body: { correo, password: 'Nueva12345' } })).status, 200);
  });
  test('perfil: actualizar datos y cambiar contraseña', async () => {
    const t = await login(correo, 'Nueva12345');
    const p = await api('PATCH', '/api/auth/me', { token: t, body: { nombre: 'Persona Actualizada', telefono: '951 123 4567', direccion: 'Calle 1' } });
    assert.equal(p.status, 200);
    assert.equal(p.datos.usuario.nombre, 'Persona Actualizada');
    assert.equal((await api('PATCH', '/api/auth/me', { token: t, body: { nombre: 'X' } })).status, 400);
    assert.equal((await api('PATCH', '/api/auth/password', { token: t, body: { actual: 'incorrecta', nueva: 'Cambiada12345' } })).status, 401);
    assert.equal((await api('PATCH', '/api/auth/password', { token: t, body: { actual: 'Nueva12345', nueva: 'Cambiada12345' } })).status, 200);
  });
});

describe('Donaciones, fotos y reservas', () => {
  test('validaciones de publicación', async () => {
    assert.equal((await api('POST', '/api/donations/publish', { token: tDonante, body: donacionBase({ fecha_caducidad: new Date(Date.now() - 3600e3).toISOString() }) })).status, 400);
    assert.equal((await api('POST', '/api/donations/publish', { token: tDonante, body: donacionBase({ acepta_buena_fe: false }) })).status, 400);
    assert.equal((await api('POST', '/api/donations/publish', { token: tDonante, body: donacionBase({ kilos: 0 }) })).status, 400);
    assert.equal((await api('POST', '/api/donations/publish', { token: tRec1, body: donacionBase() })).status, 403);
    assert.equal((await api('POST', '/api/donations/publish', { token: tDonante, body: donacionBase({ foto: 'data:text/html;base64,AAAA' }) })).status, 400);
  });
  test('editar una donación publicada (y no la de otro ni una reservada)', async () => {
    const r = await api('POST', '/api/donations/publish', { token: tDonante, body: donacionBase() });
    const id = r.datos.donacion.id_donacion;
    const e = await api('PATCH', `/api/donations/${id}`, { token: tDonante, body: donacionBase({ titulo: 'Título editado', kilos: 7 }) });
    assert.equal(e.status, 200);
    assert.equal(e.datos.donacion.titulo, 'Título editado');
    assert.equal(Number(e.datos.donacion.kilos), 7);
    assert.equal((await api('PATCH', `/api/donations/${id}`, { token: tDonante, body: donacionBase({ kilos: 0 }) })).status, 400);
    assert.equal((await api('PATCH', `/api/donations/${id}`, { token: tRec1, body: donacionBase() })).status, 403);
    assert.equal((await api('PATCH', '/api/donations/99999999', { token: tDonante, body: donacionBase() })).status, 404);
  });
  test('publicar con foto y descargarla sin token', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const r = await api('POST', '/api/donations/publish', { token: tDonante, body: donacionBase({ foto: 'data:image/png;base64,' + png.toString('base64') }) });
    assert.equal(r.status, 201);
    assert.equal(r.datos.donacion.tiene_foto, true);
    const f = await api('GET', `/api/donations/${r.datos.donacion.id_donacion}/foto`);
    assert.equal(f.status, 200);
    assert.ok(f.tipo.includes('image/png'));
    assert.ok(Buffer.compare(f.datos, png) === 0);
  });
  test('dos receptores apartan a la vez: uno gana (201) y otro recibe 409', async () => {
    const d = (await api('POST', '/api/donations/publish', { token: tDonante, body: donacionBase() })).datos.donacion;
    const [a, b] = await Promise.all([
      api('POST', '/api/reservations/book', { token: tRec1, body: { id_donacion: d.id_donacion } }),
      api('POST', '/api/reservations/book', { token: tRec2, body: { id_donacion: d.id_donacion } }),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  });
  test('un receptor sin validar no puede apartar (403)', async () => {
    const correo = `pend${sufijo}@rescatapp.test`;
    const reg = await api('POST', '/api/auth/register', { body: { nombre: 'Org Pendiente', correo, password: 'Prueba1234', rol: 'receptor' } });
    assert.equal(reg.datos.usuario.estado_validacion, 'pendiente');
    const d = (await api('POST', '/api/donations/publish', { token: tDonante, body: donacionBase() })).datos.donacion;
    assert.equal((await api('POST', '/api/reservations/book', { token: reg.datos.token, body: { id_donacion: d.id_donacion } })).status, 403);
  });
  test('una donación vencida deja de estar disponible y pasa a expirada', async () => {
    const d = (await api('POST', '/api/donations/publish', { token: tDonante, body: donacionBase({ titulo: 'Vence pronto', fecha_caducidad: new Date(Date.now() + 1500).toISOString() }) })).datos.donacion;
    await new Promise((r) => setTimeout(r, 2000));
    const lista = await api('GET', '/api/donations', { token: tRec1 });
    assert.ok(!lista.datos.donaciones.some((x) => x.id_donacion === d.id_donacion));
    assert.equal((await api('POST', '/api/reservations/book', { token: tRec1, body: { id_donacion: d.id_donacion } })).status, 409);
    const mias = await api('GET', '/api/donations/mine', { token: tDonante });
    assert.equal(mias.datos.donaciones.find((x) => x.id_donacion === d.id_donacion).estado, 'expirada');
  });
});

describe('Recolección, calificaciones y notificaciones', () => {
  let reserva, donacion;
  test('flujo completo: publicar, apartar, confirmar y calificar', async () => {
    donacion = (await api('POST', '/api/donations/publish', { token: tDonante, body: donacionBase({ titulo: 'Flujo completo' }) })).datos.donacion;
    // Los receptores aprobados reciben aviso de nueva donación
    const avisos = await api('GET', '/api/notifications', { token: tRec1 });
    assert.ok(avisos.datos.notificaciones.some((n) => n.tipo === 'nueva_donacion'));

    const b = await api('POST', '/api/reservations/book', { token: tRec1, body: { id_donacion: donacion.id_donacion } });
    assert.equal(b.status, 201);
    reserva = b.datos.reserva;
    // El donante recibe aviso y no puede calificar antes de la recolección
    assert.ok((await api('GET', '/api/notifications', { token: tDonante })).datos.notificaciones.some((n) => n.tipo === 'reservada'));
    assert.equal((await api('POST', '/api/ratings', { token: tRec1, body: { id_reserva: reserva.id_reserva, estrellas: 5 } })).status, 409);
    // Solo el dueño confirma
    assert.equal((await api('PATCH', `/api/reservations/${reserva.id_reserva}/pickup`, { token: tRec1 })).status, 403);
    assert.equal((await api('PATCH', `/api/reservations/${reserva.id_reserva}/pickup`, { token: tDonante })).status, 200);
    assert.equal((await api('PATCH', `/api/reservations/${reserva.id_reserva}/pickup`, { token: tDonante })).status, 409);
  });
  test('calificaciones: validaciones, una por autor y promedio', async () => {
    assert.equal((await api('POST', '/api/ratings', { token: tRec1, body: { id_reserva: reserva.id_reserva, estrellas: 9 } })).status, 400);
    assert.equal((await api('POST', '/api/ratings', { token: tRec2, body: { id_reserva: reserva.id_reserva, estrellas: 5 } })).status, 403);
    assert.equal((await api('POST', '/api/ratings', { token: tRec1, body: { id_reserva: reserva.id_reserva, estrellas: 5, comentario: 'Todo bien' } })).status, 201);
    assert.equal((await api('POST', '/api/ratings', { token: tRec1, body: { id_reserva: reserva.id_reserva, estrellas: 4 } })).status, 409);
    assert.equal((await api('POST', '/api/ratings', { token: tDonante, body: { id_reserva: reserva.id_reserva, estrellas: 4 } })).status, 201);
    const yo = (await api('GET', '/api/auth/me', { token: tDonante })).datos.usuario;
    const resumen = await api('GET', `/api/ratings/user/${yo.id_usuario}`, { token: tRec1 });
    assert.equal(resumen.status, 200);
    assert.ok(Number(resumen.datos.total) >= 1);
  });
  test('marcar notificaciones como leídas', async () => {
    assert.equal((await api('PATCH', '/api/notifications/read-all', { token: tRec1 })).status, 200);
    assert.equal((await api('GET', '/api/notifications', { token: tRec1 })).datos.no_leidas, 0);
  });
  test('impacto del usuario es coherente', async () => {
    const r = await api('GET', '/api/impact/mine', { token: tDonante });
    assert.equal(r.status, 200);
    assert.ok(r.datos.kilos >= 5);
    assert.equal(r.datos.comidas_equivalentes, Math.round(r.datos.kilos / 0.42));
  });
});

describe('Administrador', () => {
  test('métricas e impacto: solo para el admin', async () => {
    assert.equal((await api('GET', '/api/admin/metrics', { token: tDonante })).status, 403);
    const m = await api('GET', '/api/admin/metrics', { token: tAdmin });
    assert.equal(m.status, 200);
    assert.equal(typeof m.datos.kilos_rescatados, 'number');
    assert.ok(m.datos.impacto && m.datos.fuentes_impacto);
  });
  test('aprobar una organización le envía notificación', async () => {
    const correo = `aprob${sufijo}@rescatapp.test`;
    const reg = await api('POST', '/api/auth/register', { body: { nombre: 'Org Por Aprobar', correo, password: 'Prueba1234', rol: 'receptor' } });
    const id = reg.datos.usuario.id_usuario;
    assert.equal((await api('PATCH', `/api/admin/organizations/${id}`, { token: tAdmin, body: { estado_validacion: 'quizas' } })).status, 400);
    assert.equal((await api('PATCH', `/api/admin/organizations/${id}`, { token: tAdmin, body: { estado_validacion: 'aprobada' } })).status, 200);
    const n = await api('GET', '/api/notifications', { token: reg.datos.token });
    assert.ok(n.datos.notificaciones.some((x) => x.tipo === 'validacion'));
  });
    test('reporte CSV con BOM y encabezados', async () => {
    assert.equal((await api('GET', '/api/admin/reports/donations.csv', { token: tDonante })).status, 403);
    const r = await fetch(base + '/api/admin/reports/donations.csv?desde=2020-01-01', {
      headers: { Authorization: `Bearer ${tAdmin}` },
    });
    assert.equal(r.status, 200);
    assert.ok((r.headers.get('content-type') || '').includes('text/csv'));
    const bytes = Buffer.from(await r.arrayBuffer());
    assert.ok(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])));
    assert.ok(bytes.toString('utf8').slice(1).startsWith('ID,Alimento'));
  });
});
