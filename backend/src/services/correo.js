// Envío de correos con SMTP (nodemailer).
// Si no hay SMTP configurado, el correo se "simula" imprimiéndolo en la terminal.
const nodemailer = require('nodemailer');

let transporte = null;

function smtpConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function obtenerTransporte() {
  if (transporte) return transporte;
  const puerto = parseInt(process.env.SMTP_PORT || '465', 10);
  transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: puerto,
    secure: puerto === 465, // 465 = TLS directo; 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return transporte;
}

const escapar = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Mensaje HTML sencillo con un botón; el texto plano se envía también por compatibilidad.
function plantillaHtml({ titulo, parrafos, boton, pie }) {
  const ps = parrafos.map((p) => `<p style="margin:0 0 14px;line-height:1.5">${escapar(p)}</p>`).join('');
  const btn = boton
    ? `<p style="margin:22px 0"><a href="${escapar(boton.url)}" style="background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:bold">${escapar(boton.texto)}</a></p>
       <p style="margin:0 0 14px;font-size:13px;color:#555">Si el botón no funciona, copia este enlace en tu navegador:<br><span style="word-break:break-all">${escapar(boton.url)}</span></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<div style="max-width:520px;margin:24px auto;background:#fff;border-radius:12px;padding:28px">
<h2 style="margin:0 0 16px;color:#15803d">RescatApp</h2>
<h3 style="margin:0 0 16px">${escapar(titulo)}</h3>${ps}${btn}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0 12px">
<p style="margin:0;font-size:12px;color:#6b7280">${escapar(pie || 'Rescate de excedentes de alimentos en Oaxaca de Juárez.')}</p>
</div></body></html>`;
}

async function enviarCorreo({ para, asunto, texto, html }) {
  if (!smtpConfigurado()) {
    console.log(`\n[CORREO SIMULADO]\nPara: ${para}\nAsunto: ${asunto}\n${texto}\n`);
    return false;
  }
  await obtenerTransporte().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: para, subject: asunto, text: texto, html,
  });
  return true;
}

// Comprueba la conexión y las credenciales SMTP sin enviar nada.
async function verificarSmtp() {
  if (!smtpConfigurado()) throw new Error('Faltan SMTP_HOST, SMTP_USER o SMTP_PASS en el archivo .env.');
  await obtenerTransporte().verify();
  return true;
}

module.exports = { enviarCorreo, verificarSmtp, smtpConfigurado, plantillaHtml };
