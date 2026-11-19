// Pide al navegador (Chrome/Edge) que ofrezca guardar el correo y la contraseña.
// Se llama justo después de registrarse o de iniciar sesión con contraseña.
// En navegadores sin soporte no hace nada y no afecta al flujo.
export function guardarCredencial(correo, password, nombre) {
  try {
    if (window.PasswordCredential && navigator.credentials?.store) {
      const cred = new window.PasswordCredential({ id: correo, password, name: nombre || correo });
      navigator.credentials.store(cred).catch(() => {});
    }
  } catch { /* sin soporte: se ignora */ }
}
