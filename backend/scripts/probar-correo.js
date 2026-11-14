// Uso: npm run correo:probar -- destino@correo.com
// Verifica la conexión SMTP del archivo .env y, si se indica un destino, envía un correo de prueba.
require('dotenv').config();
const { verificarSmtp, enviarCorreo, plantillaHtml } = require('../src/services/correo');

(async () => {
  try {
    await verificarSmtp();
    console.log('Conexión SMTP correcta.');
    const destino = process.argv[2];
    if (destino) {
      await enviarCorreo({
        para: destino, asunto: 'Prueba de correo de RescatApp',
        texto: 'Si recibes este mensaje, el envío de correos de RescatApp funciona.',
        html: plantillaHtml({ titulo: 'Prueba de correo', parrafos: ['Si recibes este mensaje, el envío de correos de RescatApp funciona.'] }),
      });
      console.log('Correo de prueba enviado a', destino);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
