// Envío de correos. Si no hay SMTP configurado, el correo se "simula" imprimiéndolo en la terminal.
async function enviarCorreo({ para, asunto, texto }) {
  if (!process.env.SMTP_HOST) {
    console.log(`\n[CORREO SIMULADO]\nPara: ${para}\nAsunto: ${asunto}\n${texto}\n`);
    return false;
  }
  const nodemailer = require('nodemailer');
  const puerto = parseInt(process.env.SMTP_PORT || '465', 10);
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: puerto, secure: puerto === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporte.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: para, subject: asunto, text: texto });
  return true;
}
module.exports = { enviarCorreo };
