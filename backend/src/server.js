const app = require('./app');
const pool = require('./db');
const { expirarVencidas } = require('./services/expiracion');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await pool.query('SELECT 1'); // comprueba la conexión a PostgreSQL
    console.log('✔ Conectado a PostgreSQL');
  } catch (err) {
    console.error('✘ No se pudo conectar a PostgreSQL. Revisa tu archivo .env:', err.message);
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`✔ API de RescatApp en http://localhost:${PORT}`));
  // Cada minuto marca como expiradas las donaciones vencidas
  setInterval(() => expirarVencidas().catch((e) => console.error('Error al expirar:', e.message)), 60 * 1000);
})();
