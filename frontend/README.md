# RescatApp – Frontend

React 18 + Vite + Tailwind CSS 3 + React Router + React-Leaflet (OpenStreetMap).
El diseño sale de Stitch (`docs/diseno/stitch`).

## Puesta en marcha
1. Tener el backend corriendo en http://localhost:3000 (ver `backend/README.md`).
2. `cd frontend`
3. `npm install`
4. `npm run dev` → abrir http://localhost:5173

Vite redirige las llamadas `/api` al backend (ver `vite.config.js`), por eso no hay problemas de CORS.

## Pantallas
| Ruta | Rol | Pantalla |
|---|---|---|
| /login | público | Acceso con globo animado y botón de Google |
| /registro | público | Crear cuenta (también con Google) |
| /olvide, /restablecer | público | Recuperar contraseña |
| /perfil | todos | Datos, cambiar contraseña, modo oscuro, instalar app, calificaciones |
| /mapa | receptor | Mapa + lista + fotos + apartar + "Cómo llegar" |
| /mis-reservas | receptor | Reservas, WhatsApp, calificar donante, impacto |
| /mis-donaciones | donante | Seguimiento, confirmar recolección, calificar organización |
| /nueva-donacion | donante | Publicar con foto y punto en el mapa |
| /admin | admin | Métricas reales, impacto estimado, reporte CSV / PDF |
| /admin/organizaciones | admin | Aprobar o rechazar receptores |

## Iniciar sesión con Google (opcional)
1. Crea `frontend/.env` (copia `.env.example`) con `VITE_GOOGLE_CLIENT_ID=tu-id.apps.googleusercontent.com`.
2. Pon el mismo ID en `GOOGLE_CLIENT_ID` del `backend/.env`.
3. En Google Cloud, el cliente OAuth debe tener `http://localhost:5173` en "Orígenes autorizados de JavaScript".
4. Reinicia `npm run dev`. Sin ID, el botón no se muestra.

## App instalable (PWA)
El service worker solo se activa en la versión de producción: `npm run build` y `npm run preview`, luego "Instalar" en el navegador.

## Producción
`npm run build` genera la carpeta `dist/`.
