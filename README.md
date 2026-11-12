# RescatApp

Plataforma web para rescatar excedentes de alimentos en Oaxaca de Juárez (ODS 2: Hambre cero y ODS 12: Producción y consumo responsables).
Conecta **donantes** (negocios), **receptores** (comedores y bancos de alimentos validados) y **administradores**.

Proyecto integrador – Gestión de Proyectos de Software (SCG-1009) – Instituto Tecnológico de Oaxaca – Equipo 8, grupo 8SC.
Autor: Eduardo Manuel Martinez Lopez. Docente: Adelina Martinez Nieto.

**Aplicación en línea:** https://18-190-146-42.sslip.io

## Funcionalidades
- Registro e inicio de sesión con correo y contraseña, o con Google. Recuperación de contraseña.
- Tres roles con permisos distintos: donante, receptor y administrador.
- Donante: publica, edita y cancela donaciones con foto, cantidad, horario y ubicación en mapa.
- Receptor: consulta el listado y el mapa de donaciones disponibles, las reserva y califica al donante.
- Reserva sin duplicados: si dos receptores reservan a la vez, solo uno la obtiene (transacción con bloqueo de fila).
- Las donaciones vencidas pasan a "expirada" automáticamente (revisión cada minuto).
- Notificaciones dentro de la aplicación y por correo.
- Panel de administración: valida receptores, gestiona usuarios y exporta reportes en CSV.
- Panel de impacto: kilos rescatados y número de donaciones.

## Tecnologías
| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, React-Leaflet (mapas) |
| Backend | Node.js, Express, pg, jsonwebtoken (JWT, 8 h), bcryptjs, nodemailer, cors, dotenv |
| Base de datos | PostgreSQL 16 (6 tablas) |
| Pruebas | node:test (23 pruebas automáticas) y colección de Postman |
| Despliegue | AWS EC2 (Ubuntu 24.04), nginx, Let's Encrypt, PM2 |
| Control de versiones | Git y GitHub (Projects para el tablero de tareas) |

## Metodología
Programación Extrema (XP) con 5 iteraciones de una semana (26 de octubre al 27 de noviembre de 2026). El cronograma, las historias de usuario y los costos están en la documentación del proyecto.

## Estructura
| Carpeta | Contenido |
|---|---|
| `database/` | Script SQL de PostgreSQL (6 tablas, restricciones y datos de demostración) |
| `backend/` | API REST (Node.js + Express), pruebas automáticas y colección de Postman |
| `frontend/` | Aplicación web (React + Vite + Tailwind) |
| `docs/` | Documentación y páginas públicas (privacidad y términos) |

## Base de datos
Seis tablas: `usuarios`, `donaciones`, `reservas`, `calificaciones`, `notificaciones` y `password_resets`. Todas las relaciones son de uno a muchos. Un índice único parcial (`uq_reserva_vigente`) impide que una donación tenga más de una reserva vigente.

## API
29 rutas bajo `/api`, más `GET /api/health` para comprobar que el servicio responde.

| Módulo | Rutas |
|---|---|
| `auth` | 8 (registro, inicio de sesión, Google, recuperación y perfil) |
| `donaciones` | 6 |
| `reservas` | 4 |
| `calificaciones` | 2 |
| `notificaciones` | 3 |
| `impacto` | 1 |
| `admin` | 5 |

Las rutas privadas exigen un token JWT y validan el rol del usuario.

## Requisitos
- Node.js 18 o superior (en producción se usa Node 20)
- PostgreSQL 14 o superior

## Instalación y ejecución local

### 1. Base de datos
1. Crear la base `rescatapp` en PostgreSQL.
2. Ejecutar el script `database/rescatapp_database.sql`.

### 2. Backend
```bash
cd backend
npm install
```
Copiar `.env.example` como `.env` y llenar los valores (base de datos, `JWT_SECRET`, etc.). El archivo `.env` nunca se sube a GitHub.
```bash
npm start
```
La API queda en `http://localhost:3000/api` (comprobación: `GET /api/health`).

### 3. Frontend
```bash
cd frontend
npm install
```
Crear `frontend/.env` con `VITE_GOOGLE_CLIENT_ID=<tu ID de cliente de Google>` (opcional, solo para iniciar sesión con Google).
```bash
npm run dev
```
La aplicación abre en `http://localhost:5173`. En desarrollo, Vite envía las llamadas `/api` al backend en el puerto 3000.

## Pruebas
- Automáticas: `cd backend` y `npm test`. Son 23 pruebas que usan la base `rescatapp_test`, que debe crearse antes con el mismo script SQL.
- API: importar `backend/postman` en Postman y ejecutar la colección.

## Despliegue en producción
La aplicación corre en una instancia AWS EC2 (región us-east-2, Ubuntu 24.04, t3.small) con IP elástica:

- **nginx** sirve el frontend compilado (`npm run build`) desde `/var/www/rescatapp` y redirige `/api/` al backend en `127.0.0.1:3000`.
- **PM2** mantiene el backend (`rescatapp-api`) y lo reinicia con el sistema.
- **PostgreSQL 16** local en la misma instancia.
- **HTTPS** con certificado de Let's Encrypt (certbot) sobre el dominio `18-190-146-42.sslip.io`.

En producción `DEV_SHOW_RESET_LINK` debe estar en `false`, y `JWT_SECRET` y las credenciales de la base deben ser propias y no coincidir con las de desarrollo.

## Limitaciones conocidas
- El envío de correos (recuperación de contraseña y avisos) requiere configurar el servidor SMTP en el `.env`; en el despliegue actual no está activo.
- Las métricas de usabilidad (SUS) y de tiempo de respuesta quedan pendientes de medición.

## Estado
Proyecto terminado, probado y desplegado en la nube. Entrega: 27 de noviembre de 2026.
