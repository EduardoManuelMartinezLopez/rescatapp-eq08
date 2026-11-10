# RescatApp

Plataforma web para rescatar excedentes de alimentos en Oaxaca de Juárez (ODS 2: Hambre cero y ODS 12: Producción y consumo responsables).
Conecta **donantes** (negocios), **receptores** (comedores y bancos de alimentos validados) y **administradores**.

Proyecto integrador – Gestión de Proyectos de Software (SCG-1009) – Instituto Tecnológico de Oaxaca – Equipo 8.
Autor: Eduardo Manuel Martinez Lopez.

## Funcionalidades
- Registro e inicio de sesión con correo y contraseña, o con Google. Recuperación de contraseña.
- Tres roles con permisos distintos: donante, receptor y administrador.
- Donante: publica, edita y cancela donaciones con foto, cantidad, horario y ubicación en mapa.
- Receptor: consulta el listado y el mapa de donaciones disponibles, las reserva y califica al donante.
- Reserva sin duplicados: si dos receptores reservan a la vez, solo uno la obtiene (transacción con bloqueo de fila).
- Las donaciones vencidas pasan a "expirada" automáticamente.
- Notificaciones dentro de la aplicación y por correo.
- Panel de administración: valida receptores, gestiona usuarios y exporta reportes en CSV.
- Panel de impacto: kilos rescatados y número de donaciones.

## Tecnologías
| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React-Leaflet |
| Backend | Node.js, Express, pg, JWT, bcryptjs |
| Base de datos | PostgreSQL |
| Pruebas | node:test (automáticas) y Postman (API) |

## Estructura
| Carpeta | Contenido |
|---|---|
| `database/` | Script SQL de PostgreSQL (6 tablas, restricciones y datos de demostración) |
| `backend/` | API REST (Node.js + Express), pruebas automáticas y colección de Postman |
| `frontend/` | Aplicación web (React + Vite + Tailwind) |
| `docs/` | Documentación y páginas públicas (privacidad y términos) |

## Requisitos
- Node.js 18 o superior
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
La aplicación abre en `http://localhost:5173`.

## Pruebas
- Automáticas: `cd backend` y `npm test` (usan la base `rescatapp_test`).
- API: importar `backend/postman` en Postman y ejecutar la colección.

## Estado
Proyecto terminado y probado en entorno local. Pendiente para subir a un servidor, Entrega: 30 de noviembre de 2026.
