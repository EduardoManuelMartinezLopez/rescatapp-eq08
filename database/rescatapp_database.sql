-- =====================================================================
-- RescatApp - Equipo 8
-- Script de base de datos (PostgreSQL)
-- Cómo usarlo:
--   1) Crea la base de datos:   CREATE DATABASE rescatapp;
--   2) Conéctate a "rescatapp" y ejecuta TODO este archivo.
-- Es seguro volver a ejecutarlo: borra y vuelve a crear las tablas.
-- =====================================================================

-- Necesario para generar los hashes bcrypt de los usuarios de demostración
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS calificaciones   CASCADE;
DROP TABLE IF EXISTS notificaciones   CASCADE;
DROP TABLE IF EXISTS password_resets  CASCADE;
DROP TABLE IF EXISTS reservas   CASCADE;
DROP TABLE IF EXISTS donaciones CASCADE;
DROP TABLE IF EXISTS usuarios   CASCADE;

-- ---------------------------------------------------------------------
-- 1) USUARIOS  (donante, receptor, administrador)
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id_usuario        SERIAL PRIMARY KEY,
    nombre            VARCHAR(120) NOT NULL,                 -- negocio u organización
    correo            VARCHAR(150) NOT NULL UNIQUE,
    password_hash     VARCHAR(100) NOT NULL,                 -- bcrypt, nunca la contraseña real
    rol               VARCHAR(15)  NOT NULL
                      CHECK (rol IN ('donante', 'receptor', 'admin')),
    telefono          VARCHAR(20),
    direccion         VARCHAR(255),
    -- RD-04: las organizaciones receptoras deben ser aprobadas por un administrador
    estado_validacion VARCHAR(10)  NOT NULL DEFAULT 'pendiente'
                      CHECK (estado_validacion IN ('pendiente', 'aprobada', 'rechazada')),
    fecha_registro    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- v2: inicio de sesión con Google y recuperación de contraseña
    google_id         VARCHAR(64)  UNIQUE,
    password_definida BOOLEAN      NOT NULL DEFAULT TRUE   -- FALSE si la cuenta se creó con Google
);

-- ---------------------------------------------------------------------
-- 2) DONACIONES
-- ---------------------------------------------------------------------
CREATE TABLE donaciones (
    id_donacion        SERIAL PRIMARY KEY,
    id_donante         INTEGER      NOT NULL
                       REFERENCES usuarios (id_usuario) ON DELETE RESTRICT,
    titulo             VARCHAR(120) NOT NULL,
    descripcion        TEXT,
    categoria          VARCHAR(40)  NOT NULL
                       CHECK (categoria IN ('Pan y repostería', 'Comida preparada',
                                            'Frutas y verduras', 'Lácteos',
                                            'Abarrotes', 'Otro')),
    kilos              NUMERIC(8,2) NOT NULL CHECK (kilos > 0),     -- RD-01: no hay precios
    direccion          VARCHAR(255) NOT NULL,
    latitud            NUMERIC(9,6) NOT NULL CHECK (latitud  BETWEEN -90  AND 90),
    longitud           NUMERIC(9,6) NOT NULL CHECK (longitud BETWEEN -180 AND 180),
    horario_recoleccion VARCHAR(80),
    acepta_buena_fe    BOOLEAN      NOT NULL CHECK (acepta_buena_fe = TRUE),
    fecha_publicacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- RD-03: la fecha de caducidad es obligatoria y debe ser posterior a la publicación
    fecha_caducidad    TIMESTAMPTZ  NOT NULL,
    estado             VARCHAR(10)  NOT NULL DEFAULT 'publicada'
                       CHECK (estado IN ('publicada', 'reservada', 'recogida', 'expirada')),
    -- v2: foto opcional (la sube el donante; se redimensiona en el navegador)
    foto               BYTEA,
    foto_tipo          VARCHAR(20),
    CONSTRAINT ck_caducidad_posterior CHECK (fecha_caducidad > fecha_publicacion)
);

-- ---------------------------------------------------------------------
-- 3) RESERVAS
-- ---------------------------------------------------------------------
CREATE TABLE reservas (
    id_reserva     SERIAL PRIMARY KEY,
    id_donacion    INTEGER NOT NULL
                   REFERENCES donaciones (id_donacion) ON DELETE RESTRICT,
    id_receptor    INTEGER NOT NULL
                   REFERENCES usuarios (id_usuario) ON DELETE RESTRICT,
    estado         VARCHAR(12) NOT NULL DEFAULT 'activa'
                   CHECK (estado IN ('activa', 'completada', 'cancelada')),
    fecha_reserva  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_recogida TIMESTAMPTZ,
    aviso_enviado  BOOLEAN NOT NULL DEFAULT FALSE      -- v2: ya se avisó que la reserva vence pronto
);

-- Una donación NO puede tener dos reservas vigentes (evita reservas duplicadas)
CREATE UNIQUE INDEX uq_reserva_vigente
    ON reservas (id_donacion)
    WHERE estado IN ('activa', 'completada');

-- ---------------------------------------------------------------------
-- 4) v2: RECUPERACIÓN DE CONTRASEÑA (solo se guarda el hash del token)
-- ---------------------------------------------------------------------
CREATE TABLE password_resets (
    id_reset    SERIAL PRIMARY KEY,
    id_usuario  INTEGER  NOT NULL REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    token_hash  CHAR(64) NOT NULL UNIQUE,
    expira      TIMESTAMPTZ NOT NULL,
    usado       BOOLEAN  NOT NULL DEFAULT FALSE,
    creado      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5) v2: NOTIFICACIONES DENTRO DE LA APP
-- ---------------------------------------------------------------------
CREATE TABLE notificaciones (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario      INTEGER NOT NULL REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    tipo            VARCHAR(30) NOT NULL,
    mensaje         TEXT NOT NULL,
    enlace          VARCHAR(120),
    leida           BOOLEAN NOT NULL DEFAULT FALSE,
    fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 6) v2: CALIFICACIONES (una por autor y por reserva completada)
-- ---------------------------------------------------------------------
CREATE TABLE calificaciones (
    id_calificacion SERIAL PRIMARY KEY,
    id_reserva      INTEGER NOT NULL REFERENCES reservas (id_reserva) ON DELETE CASCADE,
    id_autor        INTEGER NOT NULL REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    id_destino      INTEGER NOT NULL REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    estrellas       SMALLINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
    comentario      VARCHAR(300),
    fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_calificacion UNIQUE (id_reserva, id_autor),
    CONSTRAINT ck_no_autocalificar CHECK (id_autor <> id_destino)
);

-- ---------------------------------------------------------------------
-- ÍNDICES (RNF-01: consultas rápidas del mapa y los paneles)
-- ---------------------------------------------------------------------
CREATE INDEX idx_donaciones_estado     ON donaciones (estado);
CREATE INDEX idx_donaciones_caducidad  ON donaciones (fecha_caducidad);
CREATE INDEX idx_donaciones_donante    ON donaciones (id_donante);
CREATE INDEX idx_reservas_receptor     ON reservas   (id_receptor);
CREATE INDEX idx_notif_usuario         ON notificaciones (id_usuario, leida, fecha DESC);
CREATE INDEX idx_calif_destino         ON calificaciones (id_destino);

-- =====================================================================
-- DATOS DE DEMOSTRACIÓN (ficticios, solo para probar el sistema)
-- Contraseña de TODOS los usuarios demo:  Demo1234!
-- =====================================================================
INSERT INTO usuarios (nombre, correo, password_hash, rol, telefono, direccion, estado_validacion) VALUES
 ('Administrador RescatApp',        'admin@rescatapp.test',
    crypt('Demo1234!', gen_salt('bf', 10)), 'admin',    '9510000000', 'Oaxaca de Juárez, Oax.',                'aprobada'),
 ('Panadería La Espiga (demo)',     'panaderia@rescatapp.test',
    crypt('Demo1234!', gen_salt('bf', 10)), 'donante',  '9511111111', 'Centro, Oaxaca de Juárez, Oax.',        'aprobada'),
 ('Restaurante El Fogón (demo)',    'fogon@rescatapp.test',
    crypt('Demo1234!', gen_salt('bf', 10)), 'donante',  '9512222222', 'Col. Reforma, Oaxaca de Juárez, Oax.',  'aprobada'),
 ('Comedor Comunitario Esperanza (demo)', 'esperanza@rescatapp.test',
    crypt('Demo1234!', gen_salt('bf', 10)), 'receptor', '9513333333', 'Col. Jardín, Oaxaca de Juárez, Oax.',   'aprobada'),
 ('Banco de Alimentos Oaxaca (demo)',     'banco@rescatapp.test',
    crypt('Demo1234!', gen_salt('bf', 10)), 'receptor', '9514444444', 'Centro, Oaxaca de Juárez, Oax.',        'aprobada'),
 ('Albergue Casa Nueva (demo)',     'albergue@rescatapp.test',
    crypt('Demo1234!', gen_salt('bf', 10)), 'receptor', '9515555555', 'Col. Volcanes, Oaxaca de Juárez, Oax.', 'pendiente');

-- Coordenadas aproximadas dentro de Oaxaca de Juárez (solo para la demostración)
INSERT INTO donaciones (id_donante, titulo, descripcion, categoria, kilos, direccion, latitud, longitud,
                        horario_recoleccion, acepta_buena_fe, fecha_caducidad, estado) VALUES
 (2, 'Pan del día sin vender',        'Bolillos y conchas del día',            'Pan y repostería',   12.50,
     'Centro, Oaxaca de Juárez', 17.060600, -96.725300, '8:00 pm a 9:00 pm',  TRUE, NOW() + INTERVAL '10 hours', 'publicada'),
 (2, 'Pasteles de la vitrina',        'Rebanadas y pasteles enteros',          'Pan y repostería',    6.00,
     'Centro, Oaxaca de Juárez', 17.061200, -96.726000, '7:30 pm a 8:30 pm',  TRUE, NOW() + INTERVAL '1 day',    'publicada'),
 (3, 'Comida preparada del buffet',   'Arroz, guisados y tortillas',           'Comida preparada',   20.00,
     'Col. Reforma, Oaxaca de Juárez', 17.074000, -96.713000, '4:00 pm a 5:00 pm', TRUE, NOW() + INTERVAL '5 hours', 'publicada'),
 (3, 'Verdura fresca de la semana',   'Jitomate, cebolla y calabaza',          'Frutas y verduras',  15.75,
     'Col. Reforma, Oaxaca de Juárez', 17.073000, -96.714000, '3:00 pm a 6:00 pm', TRUE, NOW() + INTERVAL '2 days',  'publicada'),
 (2, 'Leche y yogurt próximos a caducar', 'Productos sellados y refrigerados', 'Lácteos',             8.00,
     'Centro, Oaxaca de Juárez', 17.059800, -96.724500, '6:00 pm a 7:00 pm',  TRUE, NOW() + INTERVAL '3 days',   'publicada');

-- ---------------------------------------------------------------------
-- Verificación rápida
-- ---------------------------------------------------------------------
SELECT 'usuarios' AS tabla, COUNT(*) AS registros FROM usuarios
UNION ALL SELECT 'donaciones', COUNT(*) FROM donaciones
UNION ALL SELECT 'reservas',   COUNT(*) FROM reservas
UNION ALL SELECT 'notificaciones', COUNT(*) FROM notificaciones
UNION ALL SELECT 'calificaciones', COUNT(*) FROM calificaciones;
