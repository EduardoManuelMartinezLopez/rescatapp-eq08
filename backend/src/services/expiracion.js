const pool = require('../db');

// Se ejecuta cada minuto y antes de listar:
//  1) avisa a los receptores cuya reserva vence en menos de 1 hora (una sola vez),
//  2) avisa y marca como "expirada" toda donación vencida no recogida y cancela su reserva activa.
// El candado (advisory lock) evita avisos duplicados si dos ejecuciones coinciden.
async function expirarVencidas() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(7001)');

    await client.query(`
      WITH por_vencer AS (
        UPDATE reservas r SET aviso_enviado = TRUE
          FROM donaciones d
         WHERE d.id_donacion = r.id_donacion AND r.estado = 'activa' AND r.aviso_enviado = FALSE
           AND d.fecha_caducidad > NOW() AND d.fecha_caducidad <= NOW() + INTERVAL '1 hour'
        RETURNING r.id_receptor, d.titulo)
      INSERT INTO notificaciones (id_usuario, tipo, mensaje, enlace)
      SELECT id_receptor, 'por_vencer', 'Tu reserva "' || titulo || '" vence en menos de 1 hora.', '/mis-reservas'
        FROM por_vencer`);

    await client.query(`
      INSERT INTO notificaciones (id_usuario, tipo, mensaje, enlace)
      SELECT d.id_donante, 'expirada', 'Tu donación "' || d.titulo || '" venció sin ser recogida.', '/mis-donaciones'
        FROM donaciones d WHERE d.estado IN ('publicada','reservada') AND d.fecha_caducidad <= NOW()`);
    await client.query(`
      INSERT INTO notificaciones (id_usuario, tipo, mensaje, enlace)
      SELECT r.id_receptor, 'expirada', 'Tu reserva "' || d.titulo || '" venció y fue cancelada.', '/mis-reservas'
        FROM reservas r JOIN donaciones d ON d.id_donacion = r.id_donacion
       WHERE r.estado = 'activa' AND d.estado IN ('publicada','reservada') AND d.fecha_caducidad <= NOW()`);

    await client.query(`
      UPDATE reservas SET estado = 'cancelada'
       WHERE estado = 'activa'
         AND id_donacion IN (SELECT id_donacion FROM donaciones
                              WHERE estado IN ('publicada','reservada') AND fecha_caducidad <= NOW())`);
    const r = await client.query(`
      UPDATE donaciones SET estado = 'expirada'
       WHERE estado IN ('publicada','reservada') AND fecha_caducidad <= NOW()`);
    await client.query('COMMIT');
    return r.rowCount;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
module.exports = { expirarVencidas };
