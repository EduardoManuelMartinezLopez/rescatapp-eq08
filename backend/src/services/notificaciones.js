// Crea un aviso dentro de la app. "db" puede ser el pool o un cliente de transacción.
async function notificar(db, idUsuario, tipo, mensaje, enlace = null) {
  await db.query(
    'INSERT INTO notificaciones (id_usuario, tipo, mensaje, enlace) VALUES ($1,$2,$3,$4)',
    [idUsuario, tipo, mensaje, enlace]);
}
module.exports = { notificar };
