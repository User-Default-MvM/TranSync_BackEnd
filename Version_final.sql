-- Usar la base de datos railway proporcionada por Railway
USE railway;

-- =====================================================
-- TABLAS PRINCIPALES DEL SISTEMA
-- =====================================================

-- -----------------------------------------------------
-- Tabla: Roles
-- Tabla #1
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Roles (
    idRol INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    nomRol VARCHAR(50) NOT NULL UNIQUE
);

-- -----------------------------------------------------
-- Tabla: Empresas
-- Tabla #2
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Empresas (
    -- Identificador único de la Empresa.
    idEmpresa INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -- Nombre de la Empresa.
    nomEmpresa VARCHAR(100) NOT NULL,
    -- NIT de la Empresa (único).
    nitEmpresa VARCHAR(20) NOT NULL UNIQUE,
    -- Dirección de la Empresa.
    dirEmpresa VARCHAR(100) NOT NULL,
    -- Correo electrónico de contacto de la Empresa.
    emaEmpresa VARCHAR(80) NOT NULL,
    -- Teléfono de contacto de la Empresa.
    telEmpresa VARCHAR(15) NOT NULL UNIQUE,
    -- Fecha y hora en que se registra una nueva empresa en el sistema.
    fecRegEmpresa TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Tabla: Usuarios
-- Tabla #3
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Usuarios (
    -- Identificador único del Usuario.
    idUsuario INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -- Email para el login (debe ser único en todo el sistema).
    email VARCHAR(80) NOT NULL UNIQUE,
    -- Nombre(s) del Usuario.
    nomUsuario VARCHAR(80) NOT NULL,
    -- Apellido(s) del Usuario.
    apeUsuario VARCHAR(80) NOT NULL,
    -- Número de documento del Usuario.
    numDocUsuario VARCHAR(10) NOT NULL,
    telUsuario VARCHAR(15) NOT NULL,
    -- Contraseña cifrada (hash).
    passwordHash VARCHAR(255) NOT NULL,
    -- Rol del usuario que define sus permisos.
    idRol INT NOT NULL,
    -- Empresa a la que pertenece el usuario.
    idEmpresa INT NOT NULL,
    -- Los usuarios inician desactivados en el sistema hasta hacer la validación.
    estActivo BOOLEAN DEFAULT FALSE,
    -- Fecha de creación del usuario.
    fecCreUsuario TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Fecha de última modificación (se actualiza sola).
    fecUltModUsuario TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Unicidad por Empresa.
    UNIQUE(idEmpresa, email),
    UNIQUE(idEmpresa, numDocUsuario),
    -- Llave foránea: Con la tabla de Roles
    CONSTRAINT Fk_Usuarios_Roles FOREIGN KEY (idRol) REFERENCES Roles(idRol),
    -- Llave foránea: Si se borra una empresa, se borran sus usuarios.
    CONSTRAINT Fk_Usuarios_Empresas FOREIGN KEY (idEmpresa) REFERENCES Empresas(idEmpresa) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Tabla: Gestores
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS  Gestores(
    -- Identificador único del Gestor.
    idGestor INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -- Vínculo con sus credenciales en la tabla Usuarios.
    idUsuario INT NOT NULL UNIQUE,
    -- Identificador de la Empresa a la que pertenece.
    idEmpresa INT NOT NULL,
    -- Fecha de creación del registro.
    fecCreGestor TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Unicidad por Gestor.
    UNIQUE(idEmpresa, idUsuario),
    -- Llave foránea: Si se borra una empresa, se borran sus perfiles de admin.
    CONSTRAINT Fk_Gestores_Empresas FOREIGN KEY (idEmpresa) REFERENCES Empresas(idEmpresa) ON DELETE CASCADE,
    -- Llave foránea: Si se borra un usuario, se borra su perfil de admin.
    CONSTRAINT Fk_Gestores_Usuarios FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE CASCADE
);
-- -----------------------------------------------------
-- Tabla: Conductores
-- Tabla #4
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Conductores (
    -- Identificador único del Conductor.
    idConductor INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -- Vínculo opcional a Usuarios para el login en la app.
    idUsuario INT NULL UNIQUE,
    -- Tipo de licencia de conducción.
    tipLicConductor ENUM('B1', 'B2', 'B3', 'C1', 'C2', 'C3') NOT NULL,
    -- Fecha de vencimiento de la licencia.
    fecVenLicConductor DATE NOT NULL,
    -- Estado laboral del Conductor.
    estConductor ENUM('ACTIVO', 'INACTIVO', 'DIA_DESCANSO', 'INCAPACITADO', 'DE_VACACIONES') NOT NULL DEFAULT 'INACTIVO',
    -- Empresa a la que pertenece el Conductor.
    idEmpresa INT NOT NULL,
    -- Fecha de creación del registro.
    fecCreConductor TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Fecha de última modificación.
    fecUltModConductor TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Unicidad Conductores.
    UNIQUE(idEmpresa, idUsuario),
    -- Llave foránea: Si se borra la empresa, se borran sus conductores.
    CONSTRAINT Fk_Conductores_Empresas FOREIGN KEY (idEmpresa) REFERENCES Empresas(idEmpresa) ON DELETE CASCADE,
    -- Llave foránea: Si se borra el usuario, el conductor no se borra, solo se desvincula (SET NULL).
    CONSTRAINT Fk_Conductores_Usuarios FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE SET NULL
);

-- -----------------------------------------------------
-- Tabla: Vehiculos
-- Tabla #5
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Vehiculos (
    -- Identificador único del Vehículo.
    idVehiculo INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -- Número interno del Vehículo (único por empresa).
    numVehiculo VARCHAR(10) NOT NULL,
    -- Placa del Vehículo (única a nivel nacional).
    plaVehiculo VARCHAR(10) NOT NULL UNIQUE,
    -- Marca del Vehículo.
    marVehiculo VARCHAR(50) NOT NULL,
    -- Modelo del Vehículo.
    modVehiculo VARCHAR(50) NOT NULL,
    -- Año del Vehículo.
    anioVehiculo YEAR NOT NULL,
    -- Fecha de vencimiento del SOAT.
    fecVenSOAT DATE NOT NULL,
    -- Fecha de vencimiento de la Revisión Técnico-Mecánica.
    fecVenTec DATE NOT NULL,
    -- Estado actual del Vehículo.
    estVehiculo ENUM('DISPONIBLE', 'EN_RUTA', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO') NOT NULL DEFAULT 'DISPONIBLE',
    -- Empresa propietaria del Vehículo.
    idEmpresa INT NOT NULL,
    -- Conductor asignado actualmente (puede no tener uno).
    idConductorAsignado INT NULL,
    -- Fecha de creación del registro.
    fecCreVehiculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Fecha de última modificación.
    fecUltModVehiculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Restricción de unicidad para el número interno por empresa.
    UNIQUE(idEmpresa, numVehiculo),
    -- Llave foránea: Si se borra la empresa, se borran sus vehículos.
    CONSTRAINT Fk_Vehiculos_Empresas FOREIGN KEY (idEmpresa) REFERENCES Empresas(idEmpresa) ON DELETE CASCADE,
    -- Llave foránea: Si se borra el conductor, el vehículo queda sin conductor asignado.
    CONSTRAINT Fk_Vehiculos_Conductor_Asignado FOREIGN KEY (idConductorAsignado) REFERENCES Conductores(idConductor) ON DELETE SET NULL
);

-- -----------------------------------------------------
-- Tabla: Rutas
-- Tabla #6
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Rutas (
    -- Identificador único de la Ruta.
    idRuta INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -- Nombre de la Ruta (único por empresa).
    nomRuta VARCHAR(100) NOT NULL,
    -- Origen de la Ruta.
    oriRuta VARCHAR(100) NOT NULL,
    -- Destino de la Ruta.
    desRuta VARCHAR(100) NOT NULL,
    -- Empresa que opera la ruta.
    idEmpresa INT NOT NULL,
    -- Restricción de unicidad para el nombre de la ruta por empresa.
    UNIQUE(idEmpresa, nomRuta),
    -- Llave foránea: Si se borra la empresa, se borran sus rutas.
    CONSTRAINT Fk_Rutas_Empresas FOREIGN KEY (idEmpresa) REFERENCES Empresas(idEmpresa) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Tabla: Viajes
-- Tabla #7
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Viajes (
    -- Identificador único del Viaje.
    idViaje INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -- Vehículo del viaje.
    idVehiculo INT NOT NULL,
    -- Conductor del viaje.
    idConductor INT NOT NULL,
    -- Ruta del viaje.
    idRuta INT NOT NULL,
    -- Fecha y hora de salida.
    fecHorSalViaje DATETIME NOT NULL,
    -- Fecha y hora de llegada.
    fecHorLleViaje DATETIME NULL,
    -- Estado del Viaje.
    estViaje ENUM('PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'PROGRAMADO',
    -- Observaciones o novedades.
    obsViaje TEXT,
    -- Llave foránea hacia Vehiculos.
    CONSTRAINT Fk_Viajes_Vehiculos FOREIGN KEY (idVehiculo) REFERENCES Vehiculos(idVehiculo),
    -- Llave foránea hacia Conductores.
    CONSTRAINT Fk_Viajes_Conductores FOREIGN KEY (idConductor) REFERENCES Conductores(idConductor),
    -- Llave foránea hacia Rutas.
    CONSTRAINT Fk_Viajes_Rutas FOREIGN KEY (idRuta) REFERENCES Rutas(idRuta)
);

-- =====================================================
-- TABLAS DEL SISTEMA DE CHATBOT
-- =====================================================

-- -----------------------------------------------------
-- Tabla: InteraccionesChatbot
-- Tabla #8
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS InteraccionesChatbot (
    -- Identificador único de la interacción
    idInteraccion INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -- Mensaje enviado por el usuario
    mensaje TEXT NOT NULL,
    -- Respuesta generada por el chatbot
    respuesta TEXT NOT NULL,
    -- Intención detectada (opcional)
    intencion VARCHAR(50) NULL,
    -- Empresa del usuario que hizo la consulta
    idEmpresa INT NOT NULL,
    -- Usuario que hizo la consulta (puede ser NULL si no está autenticado)
    idUsuario INT NULL,
    -- Tiempo de respuesta en milisegundos
    tiempoRespuesta INT NULL,
    -- Si la respuesta fue exitosa
    exitosa BOOLEAN DEFAULT TRUE,
    -- Valoración del usuario (1-5, opcional)
    valoracion TINYINT NULL CHECK (valoracion >= 1 AND valoracion <= 5),
    -- Comentario del usuario sobre la respuesta
    comentario TEXT NULL,
    -- Dirección IP del usuario (para análisis de uso)
    ipUsuario VARCHAR(45) NULL,
    -- User Agent del navegador
    userAgent TEXT NULL,
    -- Fecha y hora de la interacción
    fechaInteraccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Fecha de última modificación (para valoraciones posteriores)
    fechaModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para mejor rendimiento
    INDEX idx_empresa (idEmpresa),
    INDEX idx_usuario (idUsuario),
    INDEX idx_fecha (fechaInteraccion),
    INDEX idx_intencion (intencion),
    INDEX idx_exitosa (exitosa),
    
    -- Claves foráneas
    CONSTRAINT Fk_InteraccionesChatbot_Empresas 
        FOREIGN KEY (idEmpresa) REFERENCES Empresas(idEmpresa) ON DELETE CASCADE,
    CONSTRAINT Fk_InteraccionesChatbot_Usuarios 
        FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE SET NULL
);

-- -----------------------------------------------------
-- Tabla: ConfiguracionChatbot (CORREGIDA)
-- Tabla #9
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS ConfiguracionChatbot (
    -- Identificador único de configuración
    idConfiguracion INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -- Empresa a la que pertenece la configuración
    idEmpresa INT NOT NULL UNIQUE,
    -- Nombre personalizado del chatbot
    nombreChatbot VARCHAR(100) NOT NULL DEFAULT 'Asistente TransSync',
    -- Mensaje de bienvenida personalizado (SIN DEFAULT)
    mensajeBienvenida TEXT NOT NULL,
    -- Mensaje para consultas no comprendidas (SIN DEFAULT)
    mensajeNoComprendido TEXT NOT NULL,
    -- Mensaje de despedida (SIN DEFAULT)
    mensajeDespedida TEXT NOT NULL,
    -- Avatar/icono del chatbot
    avatar VARCHAR(255) DEFAULT '🤖',
    -- Color primario del tema (hexadecimal)
    colorPrimario VARCHAR(7) DEFAULT '#1a237e',
    -- Color secundario del tema
    colorSecundario VARCHAR(7) DEFAULT '#3949ab',
    -- Activar/desactivar el chatbot
    activo BOOLEAN DEFAULT TRUE,
    -- Activar registro detallado de interacciones
    registroDetallado BOOLEAN DEFAULT TRUE,
    -- Tiempo máximo de respuesta esperado (segundos)
    tiempoMaximoRespuesta INT DEFAULT 30,
    -- Fecha de creación de la configuración
    fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Fecha de última modificación
    fechaModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clave foránea
    CONSTRAINT Fk_ConfiguracionChatbot_Empresas 
        FOREIGN KEY (idEmpresa) REFERENCES Empresas(idEmpresa) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Tabla: RespuestasPredefinidas
-- Tabla #10
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS RespuestasPredefinidas (
    -- Identificador único de respuesta
    idRespuesta INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -- Empresa propietaria de la respuesta
    idEmpresa INT NOT NULL,
    -- Palabras clave que activan esta respuesta (separadas por comas)
    palabrasClave TEXT NOT NULL,
    -- Categoría de la respuesta
    categoria ENUM('saludo', 'conductores', 'vehiculos', 'rutas', 'horarios', 'reportes', 'ayuda', 'despedida', 'personalizada') NOT NULL,
    -- Respuesta personalizada
    respuesta TEXT NOT NULL,
    -- Prioridad de la respuesta (mayor número = mayor prioridad)
    prioridad INT DEFAULT 1,
    -- Si está activa
    activa BOOLEAN DEFAULT TRUE,
    -- Contador de veces que se ha usado
    vecesUtilizada INT DEFAULT 0,
    -- Fecha de creación
    fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Fecha de última modificación
    fechaModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_empresa (idEmpresa),
    INDEX idx_categoria (categoria),
    INDEX idx_activa (activa),
    INDEX idx_prioridad (prioridad),
    
    -- Clave foránea
    CONSTRAINT Fk_RespuestasPredefinidas_Empresas 
        FOREIGN KEY (idEmpresa) REFERENCES Empresas(idEmpresa) ON DELETE CASCADE
);


-- INSERCION DE DATOS INICIALES PARA LAS DIFERENTES TABLAS DEL SISTEMA EN ORDEN DE DEPENDENCIA.
-- Tabla #1
-- Insercion de datos en la tabla Roles.
INSERT IGNORE INTO Roles (nomRol) VALUES
-- idRol 1.
('SUPERADMIN'),
-- idRol2.
('GESTOR'),
-- idRol 3.
('CONDUCTOR');

-- Tabla #2
INSERT IGNORE INTO Empresas (nomEmpresa, nitEmpresa, dirEmpresa, emaEmpresa, telEmpresa)
VALUES
    -- idEmpresa = 1.
    ('Expreso La Sabana S.A.S', '901234567', ' Dg. 23 #69 60, Bogotá', 'expresolasabana@gmail.com', '3021234567');

-- Tabla #3
-- Insercion de Usuarios.
INSERT IGNORE INTO Usuarios (email, nomUsuario, apeUsuario, numDocUsuario, telUsuario, passwordHash, idRol, idEmpresa, estActivo)
VALUES
    -- Password: admin123
    -- Email, nombre(s), apellido(s), numero de documento, telefono, contraseña hash, idRol, idEmpresa y estadoActivo (0=False, 1=True) del Usuario.
    -- idUsuario = 1.
    ('admintransync@gmail.com', 'Admin', 'TranSync', '1073155311', '3001234561', '$2b$12$GcePXxkduhLRPWMBrpzaTuzEIfdUAnrxo9.1MWImSHwdQ21IzovLe ', 1, 1, 1),
    -- GESTORES
    -- Password: gestor123
    -- idUsuario = 2.
    ('juan.perez@example.com', 'Juan', 'Pérez', '1098765432', '3101234567', '$2b$12$3RUd9CYsTLw0Lp5J62nZ1.Xc4lMNT0dTkJ.vV2KphE4Ee5bZhv9iC', 2, 1, 1),
    -- Password: gestor123
    -- idUsuario = 3.
    ('maria.lopez@example.com', 'María', 'López', '1122334455', '3102345678', '$2b$12$3RUd9CYsTLw0Lp5J62nZ1.Xc4lMNT0dTkJ.vV2KphE4Ee5bZhv9iC', 2, 1, 1),
    -- Password: gestor123
    -- idUsuario = 4.
    ('carlos.martinez@example.com', 'Carlos', 'Martínez', '1234567890', '3103456789', '$2b$12$3RUd9CYsTLw0Lp5J62nZ1.Xc4lMNT0dTkJ.vV2KphE4Ee5bZhv9iC', 2, 1, 1),
    -- CONDUCTORES
    -- Password: conductor123
    -- idUsuario = 5.
    ('ana.gomez@example.com', 'Ana', 'Gómez', '1010101010', '3201234567', '$2b$12$3eQPBzwtFe5a6KZbpydMEufd7fPBGgAeI7UVJkz9cCHxS07LWlBeC', 3, 1, 1),
    -- Password: conductor123
    -- idUsuario = 6.
    ('luis.fernandez@example.com', 'Luis', 'Fernández', '2020202020', '3202345678', '$2b$12$3eQPBzwtFe5a6KZbpydMEufd7fPBGgAeI7UVJkz9cCHxS07LWlBeC', 3, 1, 1),
    -- Password: conductor123
    -- idUsuario = 7.
    ('maria.rios@example.com', 'María', 'Ríos', '3030303030', '3203456789', '$2b$12$3eQPBzwtFe5a6KZbpydMEufd7fPBGgAeI7UVJkz9cCHxS07LWlBeC', 3, 1, 1),
    -- Password: conductor123
    -- idUsuario = 8.
    ('jorge.sanchez@example.com', 'Jorge', 'Sánchez', '4040404040', '3204567890', '$2b$12$3eQPBzwtFe5a6KZbpydMEufd7fPBGgAeI7UVJkz9cCHxS07LWlBeC', 3, 1, 1),
    -- Password: conductor123
    -- idUsuario = 9.
    ('isabel.moreno@example.com', 'Isabel', 'Moreno', '5050505050', '3205678901', '$2b$12$3eQPBzwtFe5a6KZbpydMEufd7fPBGgAeI7UVJkz9cCHxS07LWlBeC', 3, 1, 1);

-- Tabla #4
-- Insertar conductores de ejemplo
INSERT IGNORE INTO Conductores (idUsuario, tipLicConductor, fecVenLicConductor, estConductor, idEmpresa)
VALUES
        -- idUsuario, tipo de licencia, fecha de vencimiento de la licencia, estado del Conductor y Empresa a la que pertencece de momento solo existe una empresa 1.
        (5,'B1','2026-05-15', 'ACTIVO', 1),
        (6,'C1','2025-09-23', 'INACTIVO', 1),
        (7,'B3','2028-06-10', 'DIA_DESCANSO', 1),
        (8,'C2','2027-01-08', 'INCAPACITADO', 1),
        (9,'B1','2025-09-15', 'DE_VACACIONES', 1);

-- Tabla #5
-- Insertar rutas de ejemplo
INSERT IGNORE INTO Rutas (nomRuta, oriRuta, desRuta, idEmpresa)
VALUES
    ('Ruta Norte-Centro', 'Terminal Norte Bogotá', 'Centro Internacional Bogotá', 1),
    ('Expreso Medellín-Rionegro', 'Terminal Sur Medellín', 'Aeropuerto José María Córdova', 1),
    ('Ruta Sur-Chapinero', 'Terminal Sur Bogotá', 'Zona Rosa Chapinero', 1),
    ('Ruta Envigado-Centro', 'Envigado', 'Centro Medellín', 1),
    ('Ruta Centro-Occidente', 'Centro Bogotá', 'Terminal de Transportes', 1),
    ('Ruta Norte-Sur', 'Portal Norte', 'Portal Sur', 1);

-- Insertar vehículos de ejemplo
INSERT IGNORE INTO Vehiculos (numVehiculo, plaVehiculo, marVehiculo, modVehiculo, anioVehiculo, fecVenSOAT, fecVenTec, estVehiculo, idEmpresa)
VALUES
    -- idVehiculo = 1.
    ('BUS001', 'TSX123', 'Chevrolet', 'NPR Busetón', 2021, '2025-12-10', '2026-01-15', 'EN_RUTA', 1),
    -- idVehiculo = 2.
    ('BUS002', 'YHG456', 'Mercedes-Benz', 'OF 1721', 2020, '2025-10-05', '2025-12-12', 'EN_MANTENIMIENTO', 1),
    -- idVehiculo = 3.
    ('BUS003', 'PLM789', 'Hino', 'FC9J', 2022, '2025-11-25', '2026-01-30', 'FUERA_DE_SERVICIO', 1),
    -- idVehiculo = 4.
    ('BUS004', 'QWE012', 'Volkswagen', '9.160 OD Minibús', 2019, '2025-09-18', '2025-11-22', 'DISPONIBLE', 1),
    -- idVehiculo = 5.
    ('BUS005', 'RTY345', 'International', '4700 Serie', 2023, '2026-02-01', '2026-04-05', 'DISPONIBLE', 1);


-- Insertar viajes de ejemplo
INSERT IGNORE INTO Viajes (idVehiculo, idConductor, idRuta, fecHorSalViaje, fecHorLleViaje, estViaje, obsViaje)
VALUES
    -- Viaje 1
(1, 5, 1, '2025-09-22 08:00:00', '2025-09-22 09:00:00', 'EN_CURSO', 'Viaje de prueba con conductor activo'),

-- Viaje 2
(5, 1, 2, '2025-09-22 06:30:00', '2025-09-22 08:00:00', 'PROGRAMADO', 'Programado para mañana temprano'),

-- Viaje 3
(4, 5, 3, '2025-09-22 10:00:00', '2025-09-22 11:30:00', 'PROGRAMADO', 'Ruta Chapinero - revisión necesaria'),

-- Viaje 4
(1, 1, 4, '2025-09-21 15:00:00', '2025-09-21 16:30:00', 'FINALIZADO', 'Viaje completado sin novedades'),

-- Viaje 5
(5, 5, 5, '2025-09-23 07:00:00', '2025-09-23 08:30:00', 'PROGRAMADO', 'Asignado al BUS005 con licencia activa'),

-- Viaje 6
(4, 1, 6, '2025-09-23 14:00:00', '2025-09-23 15:45:00', 'PROGRAMADO', 'Ruta completa Norte-Sur');

-- Insertar interacciones del chatbot (10 ejemplos)
INSERT IGNORE INTO InteraccionesChatbot (mensaje, respuesta, intencion, idEmpresa, idUsuario, tiempoRespuesta, exitosa, valoracion, ipUsuario)
VALUES
    ('Hola, ¿cómo estás?', '¡Hola! Soy tu asistente de TransSync. ¿En qué puedo ayudarte hoy?', 'saludo', 1, 1, 120, 1, 5, '192.168.1.100'),
    ('¿Cuáles son los conductores disponibles?', 'Actualmente tenemos 3 conductores activos: Pedro García, María López y Juan Hernández.', 'conductores', 1, 2, 85, 1, 4, '192.168.1.101'),
    ('¿Dónde está el vehículo ABC123?', 'El vehículo ABC123 (Chevrolet Spark GT) está actualmente DISPONIBLE en la terminal.', 'vehiculos', 1, 1, 150, 1, 5, '192.168.1.102'),
    ('¿Hay rutas disponibles para mañana?', 'Sí, tenemos varias rutas programadas para mañana. ¿Te gustaría ver el horario completo?', 'rutas', 1, 3, 95, 1, 4, '192.168.1.103'),
    ('Necesito un reporte de viajes', 'Puedo generar un reporte de viajes. ¿Qué período te interesa? (día, semana, mes)', 'reportes', 1, 1, 200, 1, 5, '192.168.1.104'),
    ('¿Cómo cambio mi contraseña?', 'Para cambiar tu contraseña, ve a Configuración > Perfil > Cambiar contraseña.', 'ayuda', 1, 2, 110, 1, 3, '192.168.1.105'),
    ('Gracias por tu ayuda', '¡De nada! Siempre estoy aquí para ayudarte. ¡Que tengas un excelente día!', 'despedida', 1, 1, 75, 1, 5, '192.168.1.106'),
    ('No entiendo esta función', 'Lo siento, no pude entender tu consulta. ¿Puedes reformularla o ser más específico?', 'personalizada', 1, 3, 90, 0, 2, '192.168.1.107'),
    ('¿Cuántos vehículos tenemos?', 'Actualmente la flota cuenta con 5 vehículos activos en el sistema.', 'vehiculos', 1, 1, 130, 1, 4, '192.168.1.108'),
    ('¿Hay algún problema con el sistema?', 'El sistema está funcionando correctamente. ¿Hay algo específico que te preocupa?', 'ayuda', 1, 2, 140, 1, 4, '192.168.1.109');

-- Insertar configuración del chatbot (para cada empresa)
INSERT IGNORE INTO ConfiguracionChatbot (idEmpresa, mensajeBienvenida, mensajeNoComprendido, mensajeDespedida) VALUES
(1, '¡Hola! Soy tu asistente virtual de TransSync. ¿En qué puedo ayudarte hoy con tu flota de transporte?', 'Lo siento, no pude entender tu consulta. ¿Puedes ser más específico o reformular tu pregunta?', '¡Gracias por usar TransSync! Que tengas un excelente día.');

-- Insertar respuestas predefinidas (15 ejemplos)
INSERT IGNORE INTO RespuestasPredefinidas (idEmpresa, palabrasClave, categoria, respuesta, prioridad, activa) VALUES
(1, 'hola,saludos,buenos dias,buenas tardes,buenas noches', 'saludo', '¡Hola! Soy tu asistente virtual de TransSync. ¿En qué puedo ayudarte hoy?', 10, 1),
(1, 'conductores,choferes,pilotos,disponibles,activos', 'conductores', 'Actualmente tenemos conductores activos: Pedro García, María López, Juan Hernández, Sofia Torres y Diego Ramírez.', 9, 1),
(1, 'vehiculos,camiones,carros,flota,disponibles', 'vehiculos', 'Nuestra flota incluye: Chevrolet Spark GT (ABC123), Renault Logan (DEF456), Toyota Corolla (GHI789), Nissan Sentra (JKL012) y Mazda CX-5 (MNO345).', 9, 1),
(1, 'rutas,recorridos,trayectos,horarios,disponibles', 'rutas', 'Tenemos rutas activas: Norte-Centro, Medellín-Rionegro, Sur-Chapinero, Envigado-Centro, Centro-Occidente y Norte-Sur.', 8, 1),
(1, 'reportes,estadisticas,kpis,metricas,dashboard', 'reportes', 'Puedo generar reportes de viajes, conductores, vehículos y rutas. ¿Qué período te interesa?', 8, 1),
(1, 'ayuda,como,que,necesito,no se,problema', 'ayuda', 'Estoy aquí para ayudarte. Puedes preguntarme sobre conductores, vehículos, rutas, horarios o reportes.', 7, 1),
(1, 'gracias,excelente,perfecto,buen trabajo,genial', 'despedida', '¡De nada! Siempre estoy aquí para ayudarte. ¡Que tengas un excelente día!', 6, 1),
(1, 'mantenimiento,reparacion,taller,averiado,dañado', 'vehiculos', 'Para mantenimiento, contacta al taller autorizado. Actualmente tenemos 1 vehículo en mantenimiento (GHI789).', 8, 1),
(1, 'emergencia,urgente,problema,critico,ayuda inmediata', 'ayuda', 'Para emergencias, llama inmediatamente al +57 300 123 4567 o contacta al supervisor de turno.', 10, 1),
(1, 'horarios,salidas,arribos,tiempo,estimado', 'horarios', 'Los horarios varían por ruta. ¿Te gustaría consultar una ruta específica?', 7, 1),
(1, 'perfil,cuenta,usuario,informacion personal', 'ayuda', 'Para gestionar tu perfil, ve a la sección "Mi Perfil" en el menú principal. Allí puedes editar tu información y cambiar tu contraseña.', 8, 1),
(1, 'preferencias,configuracion,ajustes,opciones', 'ayuda', 'Puedes personalizar tus preferencias en la sección de configuración. Incluye tema, idioma, notificaciones y opciones del dashboard.', 7, 1),
(1, 'notificaciones,alertas,avisos,mensajes', 'ayuda', 'Configura tus notificaciones en Preferencias > Notificaciones. Puedes elegir recibir emails, push o SMS.', 7, 1),
(1, 'actividad,historial,registro,logs', 'ayuda', 'Tu historial de actividad está disponible en tu perfil. Muestra logins, cambios de contraseña y actualizaciones.', 6, 1),
(1, 'empresa,compania,organizacion,negocio', 'ayuda', 'La información de tu empresa está disponible en tu perfil. Incluye datos de contacto y configuración empresarial.', 6, 1);

-- =====================================================
-- TABLAS PARA GESTIÓN DE PERFIL DE USUARIO
-- =====================================================

-- -----------------------------------------------------
-- Tabla: UserPreferences
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS UserPreferences (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    idUsuario INT NOT NULL,
    preferences JSON NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preferences (idUsuario)
);

-- -----------------------------------------------------
-- Tabla: NotificationSettings
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS NotificationSettings (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    idUsuario INT NOT NULL,
    notificationSettings JSON NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE CASCADE,
    UNIQUE KEY unique_user_notifications (idUsuario)
);

-- -----------------------------------------------------
-- Tabla: UserActivity
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS UserActivity (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    idUsuario INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    INDEX idx_user_timestamp (idUsuario, timestamp),
    FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE CASCADE
);

-- =====================================================
-- DATOS DE PRUEBA PARA PERFIL DE USUARIO
-- =====================================================

-- Insertar preferencias de usuario para algunos usuarios
INSERT IGNORE INTO UserPreferences (idUsuario, preferences) VALUES
(1, '{"theme": "dark", "language": "es", "notifications": {"email": true, "push": false, "sms": true}, "dashboard": {"defaultView": "overview", "itemsPerPage": 15, "autoRefresh": true}}'),
(2, '{"theme": "light", "language": "es", "notifications": {"email": true, "push": true, "sms": false}, "dashboard": {"defaultView": "analytics", "itemsPerPage": 20, "autoRefresh": false}}'),
(3, '{"theme": "dark", "language": "es", "notifications": {"email": true, "push": true, "sms": true}, "dashboard": {"defaultView": "overview", "itemsPerPage": 10, "autoRefresh": true}}');

-- Insertar configuración de notificaciones para algunos usuarios
INSERT IGNORE INTO NotificationSettings (idUsuario, notificationSettings) VALUES
(1, '{"newMessages": true, "systemUpdates": true, "securityAlerts": true, "maintenanceReminders": false, "reportNotifications": true, "emailFrequency": "immediate"}'),
(2, '{"newMessages": true, "systemUpdates": false, "securityAlerts": true, "maintenanceReminders": true, "reportNotifications": false, "emailFrequency": "daily"}'),
(3, '{"newMessages": true, "systemUpdates": true, "securityAlerts": false, "maintenanceReminders": true, "reportNotifications": true, "emailFrequency": "weekly"}');

-- Insertar actividad de usuario para algunos usuarios
INSERT IGNORE INTO UserActivity (idUsuario, type, description, ipAddress, userAgent) VALUES
(1, 'login', 'Inicio de sesión exitoso', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, 'profile_update', 'Actualización de perfil personal', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, 'password_change', 'Cambio de contraseña exitoso', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(2, 'login', 'Inicio de sesión exitoso', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(2, 'preferences_update', 'Actualización de preferencias', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(3, 'login', 'Inicio de sesión exitoso', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
(3, 'notifications_update', 'Actualización de configuración de notificaciones', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');

