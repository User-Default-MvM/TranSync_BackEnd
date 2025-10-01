-- =====================================================
-- MIGRACIÓN WAZE-STYLE - NUEVAS TABLAS PARA NAVEGACIÓN GPS
-- =====================================================

USE railway;

-- =====================================================
-- TABLA 1: UBICACIONES DE USUARIO (GESTIÓN AVANZADA DE GEOLOCALIZACIÓN)
-- =====================================================

CREATE TABLE IF NOT EXISTS ubicaciones_usuario (
    idUbicacion SERIAL PRIMARY KEY,
    idUsuario INT NOT NULL,
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    precisionMetros DECIMAL(8, 2),
    velocidadKmh DECIMAL(5, 2),
    rumboGrados DECIMAL(5, 2),
    fechaHora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fuenteUbicacion VARCHAR(20) DEFAULT 'GPS', -- GPS, NETWORK, PASSIVE
    dispositivoInfo JSONB,
    FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE CASCADE
);

-- Índices para ubicaciones de usuario
CREATE INDEX IF NOT EXISTS idx_ubicaciones_usuario_fecha ON ubicaciones_usuario(fechaHora);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_usuario_usuario_fecha ON ubicaciones_usuario(idUsuario, fechaHora DESC);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_usuario_coordenadas ON ubicaciones_usuario(latitud, longitud);

-- =====================================================
-- TABLA 2: PUNTOS DE INTERÉS (PARADAS Y LUGARES IMPORTANTES)
-- =====================================================

CREATE TABLE IF NOT EXISTS puntos_interes (
    idPoi SERIAL PRIMARY KEY,
    nombrePoi VARCHAR(100) NOT NULL,
    tipoPoi VARCHAR(50) NOT NULL, -- ESTACION, TERMINAL, PARADERO, COMERCIO
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    descripcion TEXT,
    horarioApertura TIME,
    horarioCierre TIME,
    telefono VARCHAR(20),
    sitioWeb VARCHAR(255),
    idRutaAsociada INT,
    datosAdicionales JSONB,
    FOREIGN KEY (idRutaAsociada) REFERENCES Rutas(idRuta) ON DELETE CASCADE
);

-- Índices para puntos de interés
CREATE INDEX IF NOT EXISTS idx_puntos_interes_tipo_ubicacion ON puntos_interes(tipoPoi, latitud, longitud);
CREATE INDEX IF NOT EXISTS idx_puntos_interes_ruta ON puntos_interes(idRutaAsociada);
CREATE INDEX IF NOT EXISTS idx_puntos_interes_coordenadas ON puntos_interes(latitud, longitud);

-- =====================================================
-- TABLA 3: NOTIFICACIONES DE RUTA (SISTEMA DE NOTIFICACIONES EN TIEMPO REAL)
-- =====================================================

CREATE TABLE IF NOT EXISTS notificaciones_ruta (
    idNotificacion SERIAL PRIMARY KEY,
    idRuta INT NOT NULL,
    tipoNotificacion VARCHAR(50) NOT NULL, -- TRAFICO, DEMORA, DESVIO, EMERGENCIA
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    prioridad VARCHAR(20) DEFAULT 'NORMAL', -- BAJA, NORMAL, ALTA, CRITICA
    ubicacionAfectada JSONB, -- Coordenadas del área afectada
    tiempoInicio TIMESTAMP,
    tiempoFin TIMESTAMP,
    activa BOOLEAN DEFAULT true,
    fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idRuta) REFERENCES Rutas(idRuta) ON DELETE CASCADE
);

-- Índices para notificaciones de ruta
CREATE INDEX IF NOT EXISTS idx_notificaciones_ruta_activa ON notificaciones_ruta(idRuta, activa, tiempoInicio);
CREATE INDEX IF NOT EXISTS idx_notificaciones_ruta_tipo ON notificaciones_ruta(tipoNotificacion, activa);
CREATE INDEX IF NOT EXISTS idx_notificaciones_ruta_prioridad ON notificaciones_ruta(prioridad, activa);

-- =====================================================
-- TABLA 4: ANALYTICS DE USO DE RUTAS (MÉTRICAS AVANZADAS)
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_ruta_uso (
    idRegistro SERIAL PRIMARY KEY,
    idRuta INT NOT NULL,
    idUsuario INT,
    origenUbicacion JSONB,
    destinoUbicacion JSONB,
    distanciaRealKm DECIMAL(8, 3),
    tiempoRealMin INT,
    tiempoEstimadoMin INT,
    calificacionViaje INT CHECK (calificacionViaje >= 1 AND calificacionViaje <= 5),
    comentarios TEXT,
    fechaHoraInicio TIMESTAMP,
    fechaHoraFin TIMESTAMP,
    FOREIGN KEY (idRuta) REFERENCES Rutas(idRuta) ON DELETE CASCADE,
    FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE SET NULL
);

-- Índices para analytics
CREATE INDEX IF NOT EXISTS idx_analytics_ruta_fecha ON analytics_ruta_uso(idRuta, fechaHoraInicio);
CREATE INDEX IF NOT EXISTS idx_analytics_usuario_patrones ON analytics_ruta_uso(idUsuario, fechaHoraInicio);
CREATE INDEX IF NOT EXISTS idx_analytics_calificacion ON analytics_ruta_uso(calificacionViaje);

-- =====================================================
-- TABLA 5: AUDITORÍA DE UBICACIONES (SEGURIDAD Y PRIVACIDAD)
-- =====================================================

CREATE TABLE IF NOT EXISTS auditoria_ubicaciones (
    idAuditoria SERIAL PRIMARY KEY,
    idUsuario INT,
    accion VARCHAR(50) NOT NULL,
    ubicacionOriginal JSONB,
    ubicacionNueva JSONB,
    ipUsuario INET,
    userAgent TEXT,
    fechaHora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE SET NULL
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_fecha ON auditoria_ubicaciones(idUsuario, fechaHora);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion_fecha ON auditoria_ubicaciones(accion, fechaHora);

-- =====================================================
-- MEJORAS A TABLAS EXISTENTES
-- =====================================================

-- Mejoras a tabla Rutas
ALTER TABLE Rutas ADD COLUMN IF NOT EXISTS coordenadasRuta JSONB;
ALTER TABLE Rutas ADD COLUMN IF NOT EXISTS distanciaKm DECIMAL(8, 3);
ALTER TABLE Rutas ADD COLUMN IF NOT EXISTS tiempoEstimadoMin INT;
ALTER TABLE Rutas ADD COLUMN IF NOT EXISTS usoContador INT DEFAULT 0;
ALTER TABLE Rutas ADD COLUMN IF NOT EXISTS calificacionPromedio DECIMAL(3, 2);
ALTER TABLE Rutas ADD COLUMN IF NOT EXISTS datosTrafico JSONB;

-- Mejoras a tabla Vehiculos (para ubicación en tiempo real)
ALTER TABLE Vehiculos ADD COLUMN IF NOT EXISTS latitudActual DECIMAL(10, 8);
ALTER TABLE Vehiculos ADD COLUMN IF NOT EXISTS longitudActual DECIMAL(11, 8);
ALTER TABLE Vehiculos ADD COLUMN IF NOT EXISTS ultimaUbicacion TIMESTAMP;
ALTER TABLE Vehiculos ADD COLUMN IF NOT EXISTS velocidadActual DECIMAL(5, 2);
ALTER TABLE Vehiculos ADD COLUMN IF NOT EXISTS rumboActual DECIMAL(5, 2);

-- Índices adicionales para tablas existentes
CREATE INDEX IF NOT EXISTS idx_rutas_estado_ubicacion ON Rutas(estRuta, coordenadasRuta);
CREATE INDEX IF NOT EXISTS idx_vehiculos_estado_ubicacion ON Vehiculos(estVehiculo, latitudActual, longitudActual);

-- =====================================================
-- DATOS DE PRUEBA PARA NUEVAS FUNCIONALIDADES
-- =====================================================

-- Insertar puntos de interés de ejemplo
INSERT IGNORE INTO puntos_interes (nombrePoi, tipoPoi, latitud, longitud, descripcion, telefono, idRutaAsociada) VALUES
('Terminal Norte Bogotá', 'TERMINAL', 4.7589, -74.0501, 'Terminal principal de transporte del norte de Bogotá', '6015550001', 1),
('Centro Internacional Bogotá', 'TERMINAL', 4.6482, -74.0648, 'Centro financiero y empresarial de Bogotá', '6015550002', 1),
('Terminal Sur Medellín', 'TERMINAL', 6.2308, -75.5906, 'Terminal de transporte del sur de Medellín', '6045550003', 2),
('Aeropuerto José María Córdova', 'TERMINAL', 6.1670, -75.4231, 'Aeropuerto internacional de Medellín', '6045550004', 2),
('Portal Norte', 'ESTACION', 4.7628, -74.0456, 'Estación de TransMilenio Portal Norte', '6015550005', 6),
('Portal Sur', 'ESTACION', 4.5806, -74.1289, 'Estación de TransMilenio Portal Sur', '6015550006', 6);

-- Insertar ubicaciones de prueba para usuarios
INSERT IGNORE INTO ubicaciones_usuario (idUsuario, latitud, longitud, precisionMetros, velocidadKmh, fuenteUbicacion) VALUES
(1, 4.6482, -74.0648, 5.0, 0.0, 'GPS'),
(2, 4.7589, -74.0501, 3.5, 45.2, 'GPS'),
(3, 6.2308, -75.5906, 8.2, 0.0, 'NETWORK');

-- Insertar notificaciones de ejemplo
INSERT IGNORE INTO notificaciones_ruta (idRuta, tipoNotificacion, titulo, mensaje, prioridad, activa) VALUES
(1, 'TRAFICO', 'Tráfico pesado en ruta Norte-Centro', 'Se reporta tráfico pesado entre la Calle 80 y la Calle 68. Considere 15 minutos adicionales.', 'ALTA', true),
(2, 'DEMORA', 'Demora en ruta Medellín-Rionegro', 'El vuelo de llegada tiene 30 minutos de retraso. Ajuste su tiempo de llegada.', 'NORMAL', true),
(6, 'DESVIO', 'Desvío programado Portal Norte', 'Por obras en la Avenida Boyacá, la ruta se desvía por la Calle 170.', 'NORMAL', true);

-- Insertar datos de analytics de ejemplo
INSERT IGNORE INTO analytics_ruta_uso (idRuta, idUsuario, origenUbicacion, destinoUbicacion, distanciaRealKm, tiempoRealMin, tiempoEstimadoMin, calificacionViaje, fechaHoraInicio, fechaHoraFin) VALUES
(1, 1, '{"lat": 4.7589, "lng": -74.0501}', '{"lat": 4.6482, "lng": -74.0648}', 15.5, 45, 40, 4, '2025-01-15 08:00:00', '2025-01-15 08:45:00'),
(2, 2, '{"lat": 6.2308, "lng": -75.5906}', '{"lat": 6.1670, "lng": -75.4231}', 25.3, 90, 85, 5, '2025-01-15 06:30:00', '2025-01-15 08:00:00'),
(6, 3, '{"lat": 4.7628, "lng": -74.0456}', '{"lat": 4.5806, "lng": -74.1289}', 22.1, 75, 70, 3, '2025-01-15 07:15:00', '2025-01-15 08:30:00');

-- =====================================================
-- FUNCIONES ÚTILES PARA CÁLCULOS GEOGRÁFICOS
-- =====================================================

-- Función para calcular distancia entre dos puntos (Haversine)
DELIMITER //

CREATE OR REPLACE FUNCTION calcular_distancia_haversine(
    lat1 DECIMAL(10, 8),
    lng1 DECIMAL(11, 8),
    lat2 DECIMAL(10, 8),
    lng2 DECIMAL(11, 8)
) RETURNS DECIMAL(8, 3)
DETERMINISTIC
BEGIN
    DECLARE R DECIMAL(10, 3) DEFAULT 6371; -- Radio de la Tierra en km
    DECLARE dLat DECIMAL(10, 8);
    DECLARE dLng DECIMAL(11, 8);
    DECLARE a DECIMAL(10, 8);
    DECLARE c DECIMAL(10, 8);

    SET dLat = RADIANS(lat2 - lat1);
    SET dLng = RADIANS(lng2 - lng1);

    SET a = SIN(dLat/2) * SIN(dLat/2) +
            COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
            SIN(dLng/2) * SIN(dLng/2);

    SET c = 2 * ATAN2(SQRT(a), SQRT(1-a));

    RETURN R * c;
END //

DELIMITER ;

-- Función para validar coordenadas GPS
DELIMITER //

CREATE OR REPLACE FUNCTION validar_coordenadas(
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8)
) RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    RETURN lat >= -90 AND lat <= 90 AND lng >= -180 AND lng <= 180;
END //

DELIMITER ;

-- =====================================================
-- VISTAS ÚTILES PARA CONSULTAS FRECUENTES
-- =====================================================

-- Vista para rutas con métricas de uso
CREATE OR REPLACE VIEW vista_rutas_metricas AS
SELECT
    r.idRuta,
    r.nomRuta,
    r.oriRuta,
    r.desRuta,
    r.distanciaKm,
    r.tiempoEstimadoMin,
    r.usoContador,
    r.calificacionPromedio,
    COUNT(aru.idRegistro) as total_viajes,
    AVG(aru.calificacionViaje) as calificacion_actual,
    AVG(aru.tiempoRealMin) as tiempo_promedio_real
FROM Rutas r
LEFT JOIN analytics_ruta_uso aru ON r.idRuta = aru.idRuta
GROUP BY r.idRuta;

-- Vista para ubicaciones recientes de usuarios
CREATE OR REPLACE VIEW vista_ubicaciones_recientes AS
SELECT
    uu.idUsuario,
    u.nomUsuario,
    uu.latitud,
    uu.longitud,
    uu.precisionMetros,
    uu.velocidadKmh,
    uu.fechaHora as ultima_ubicacion,
    TIMESTAMPDIFF(MINUTE, uu.fechaHora, NOW()) as minutos_desde_ultima
FROM ubicaciones_usuario uu
INNER JOIN Usuarios u ON uu.idUsuario = u.idUsuario
WHERE uu.fechaHora = (
    SELECT MAX(fechaHora)
    FROM ubicaciones_usuario uu2
    WHERE uu2.idUsuario = uu.idUsuario
);

-- Vista para notificaciones activas por ruta
CREATE OR REPLACE VIEW vista_notificaciones_activas AS
SELECT
    nr.idNotificacion,
    nr.idRuta,
    r.nomRuta,
    nr.tipoNotificacion,
    nr.titulo,
    nr.mensaje,
    nr.prioridad,
    nr.fechaCreacion,
    nr.tiempoInicio,
    nr.tiempoFin
FROM notificaciones_ruta nr
INNER JOIN Rutas r ON nr.idRuta = r.idRuta
WHERE nr.activa = true
AND (nr.tiempoInicio IS NULL OR nr.tiempoInicio <= NOW())
AND (nr.tiempoFin IS NULL OR nr.tiempoFin >= NOW());

-- =====================================================
-- DATOS ADICIONALES DE PRUEBA
-- =====================================================

-- Actualizar rutas existentes con coordenadas aproximadas
UPDATE Rutas SET
    coordenadasRuta = JSON_ARRAY(
        JSON_OBJECT('lat', 4.7589, 'lng', -74.0501),
        JSON_OBJECT('lat', 4.7200, 'lng', -74.0550),
        JSON_OBJECT('lat', 4.6800, 'lng', -74.0600),
        JSON_OBJECT('lat', 4.6482, 'lng', -74.0648)
    ),
    distanciaKm = 15.5,
    tiempoEstimadoMin = 40
WHERE idRuta = 1;

UPDATE Rutas SET
    coordenadasRuta = JSON_ARRAY(
        JSON_OBJECT('lat', 6.2308, 'lng', -75.5906),
        JSON_OBJECT('lat', 6.2000, 'lng', -75.5000),
        JSON_OBJECT('lat', 6.1800, 'lng', -75.4500),
        JSON_OBJECT('lat', 6.1670, 'lng', -75.4231)
    ),
    distanciaKm = 25.3,
    tiempoEstimadoMin = 85
WHERE idRuta = 2;

UPDATE Rutas SET
    coordenadasRuta = JSON_ARRAY(
        JSON_OBJECT('lat', 4.7628, 'lng', -74.0456),
        JSON_OBJECT('lat', 4.7200, 'lng', -74.0500),
        JSON_OBJECT('lat', 4.6500, 'lng', -74.0800),
        JSON_OBJECT('lat', 4.5806, 'lng', -74.1289)
    ),
    distanciaKm = 22.1,
    tiempoEstimadoMin = 70
WHERE idRuta = 6;

-- Insertar más puntos de interés
INSERT IGNORE INTO puntos_interes (nombrePoi, tipoPoi, latitud, longitud, descripcion, telefono, horarioApertura, horarioCierre) VALUES
('Centro Comercial Andino', 'COMERCIO', 4.6675, -74.0544, 'Centro comercial exclusivo en el norte de Bogotá', '6015551001', '10:00:00', '22:00:00'),
('Universidad Externado', 'COMERCIO', 4.5967, -74.0708, 'Universidad histórica en el centro de Bogotá', '6015552001', '07:00:00', '20:00:00'),
('Parque de la 93', 'COMERCIO', 4.6769, -74.0481, 'Zona comercial y gastronómica', '6015553001', '08:00:00', '23:00:00');

-- Insertar auditoría de ejemplo
INSERT IGNORE INTO auditoria_ubicaciones (idUsuario, accion, ubicacionOriginal, ubicacionNueva, ipUsuario) VALUES
(1, 'UBICACION_ACTUALIZADA', '{"lat": 4.6480, "lng": -74.0640}', '{"lat": 4.6482, "lng": -74.0648}', '192.168.1.100'),
(2, 'UBICACION_ELIMINADA', '{"lat": 4.7585, "lng": -74.0500}', NULL, '192.168.1.101');

SELECT '✅ Migración Waze-Style completada exitosamente' as resultado;