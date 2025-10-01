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

-- =====================================================
-- TABLA PARA TOKENS DE RESTABLECIMIENTO DE CONTRASEÑA
-- =====================================================

-- -----------------------------------------------------
-- Tabla: PasswordResets
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS PasswordResets (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    userId INT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expiresAt DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (userId),
    INDEX idx_token (token),
    INDEX idx_expires_at (expiresAt),
    INDEX idx_used (used),
    FOREIGN KEY (userId) REFERENCES Usuarios(idUsuario) ON DELETE CASCADE
);

-- =====================================================
-- DATOS DE PRUEBA PARA PERFIL DE USUARIO
-- =====================================================

-- =====================================================
-- TABLAS PARA DASHBOARD Y REPORTES
-- =====================================================

-- -----------------------------------------------------
-- Tabla: ResumenOperacional
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS ResumenOperacional (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    idEmpresa INT NOT NULL,
    conductoresActivos INT DEFAULT 0,
    vehiculosDisponibles INT DEFAULT 0,
    viajesEnCurso INT DEFAULT 0,
    viajesCompletados INT DEFAULT 0,
    alertasPendientes INT DEFAULT 0,
    fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_empresa (idEmpresa),
    INDEX idx_fecha (fechaActualizacion),
    FOREIGN KEY (idEmpresa) REFERENCES Empresas(idEmpresa) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Tabla: AlertasVencimientos
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS AlertasVencimientos (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    idEmpresa INT NOT NULL,
    tipoDocumento ENUM('LICENCIA_CONDUCCION', 'SOAT', 'TECNICO_MECANICA', 'SEGURO') NOT NULL,
    idReferencia INT NOT NULL COMMENT 'ID del conductor o vehículo relacionado',
    descripcion VARCHAR(255) NOT NULL,
    fechaVencimiento DATE NOT NULL,
    diasParaVencer INT NOT NULL,
    estado ENUM('PENDIENTE', 'VENCIDA', 'RESUELTA') DEFAULT 'PENDIENTE',
    fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fechaResolucion TIMESTAMP NULL,
    INDEX idx_empresa (idEmpresa),
    INDEX idx_tipo (tipoDocumento),
    INDEX idx_estado (estado),
    INDEX idx_vencimiento (fechaVencimiento),
    FOREIGN KEY (idEmpresa) REFERENCES Empresas(idEmpresa) ON DELETE CASCADE
);

-- =====================================================
-- DATOS DE PRUEBA PARA DASHBOARD
-- =====================================================

-- Insertar datos iniciales para ResumenOperacional
INSERT IGNORE INTO ResumenOperacional (idEmpresa, conductoresActivos, vehiculosDisponibles, viajesEnCurso, viajesCompletados, alertasPendientes) VALUES
(1, 3, 2, 1, 4, 2);

-- Insertar alertas de vencimientos de ejemplo
INSERT IGNORE INTO AlertasVencimientos (idEmpresa, tipoDocumento, idReferencia, descripcion, fechaVencimiento, diasParaVencer, estado) VALUES
(1, 'LICENCIA_CONDUCCION', 5, 'Licencia de conducción próxima a vencer', DATE_ADD(CURDATE(), INTERVAL 15 DAY), 15, 'PENDIENTE'),
(1, 'SOAT', 1, 'SOAT del vehículo TSX123 próximo a vencer', DATE_ADD(CURDATE(), INTERVAL 20 DAY), 20, 'PENDIENTE'),
(1, 'TECNICO_MECANICA', 2, 'Revisión técnico-mecánica próxima a vencer', DATE_ADD(CURDATE(), INTERVAL 10 DAY), 10, 'PENDIENTE');

-- =====================================================
-- DATOS DE PRUEBA PARA PERFIL DE USUARIO
-- =====================================================

-- Insertar actividad de usuario para algunos usuarios
INSERT IGNORE INTO UserActivity (idUsuario, type, description, ipAddress, userAgent) VALUES
(1, 'login', 'Inicio de sesión exitoso', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, 'profile_update', 'Actualización de perfil personal', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, 'password_change', 'Cambio de contraseña exitoso', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(2, 'login', 'Inicio de sesión exitoso', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(2, 'preferences_update', 'Actualización de preferencias', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(3, 'login', 'Inicio de sesión exitoso', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
(3, 'notifications_update', 'Actualización de configuración de notificaciones', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');

-- =====================================================
-- WAZE-STYLE: NUEVAS TABLAS PARA NAVEGACIÓN GPS
-- =====================================================

-- -----------------------------------------------------
-- Tabla: ubicaciones_usuario (Gestión avanzada de geolocalización)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS ubicaciones_usuario (
    idUbicacion INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    idUsuario INT NOT NULL,
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    precisionMetros DECIMAL(8, 2),
    velocidadKmh DECIMAL(5, 2),
    rumboGrados DECIMAL(5, 2),
    fechaHora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fuenteUbicacion VARCHAR(20) DEFAULT 'GPS',
    dispositivoInfo JSON,
    FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE CASCADE
);

-- Índices para ubicaciones de usuario
CREATE INDEX IF NOT EXISTS idx_ubicaciones_usuario_fecha ON ubicaciones_usuario(fechaHora);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_usuario_usuario_fecha ON ubicaciones_usuario(idUsuario, fechaHora DESC);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_usuario_coordenadas ON ubicaciones_usuario(latitud, longitud);

-- -----------------------------------------------------
-- Tabla: puntos_interes (Paradas y lugares importantes)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS puntos_interes (
    idPoi INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    nombrePoi VARCHAR(100) NOT NULL,
    tipoPoi VARCHAR(50) NOT NULL,
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    descripcion TEXT,
    horarioApertura TIME,
    horarioCierre TIME,
    telefono VARCHAR(20),
    sitioWeb VARCHAR(255),
    idRutaAsociada INT,
    datosAdicionales JSON,
    FOREIGN KEY (idRutaAsociada) REFERENCES Rutas(idRuta) ON DELETE CASCADE
);

-- Índices para puntos de interés
CREATE INDEX IF NOT EXISTS idx_puntos_interes_tipo_ubicacion ON puntos_interes(tipoPoi, latitud, longitud);
CREATE INDEX IF NOT EXISTS idx_puntos_interes_ruta ON puntos_interes(idRutaAsociada);
CREATE INDEX IF NOT EXISTS idx_puntos_interes_coordenadas ON puntos_interes(latitud, longitud);

-- -----------------------------------------------------
-- Tabla: notificaciones_ruta (Sistema de notificaciones en tiempo real)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones_ruta (
    idNotificacion INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    idRuta INT NOT NULL,
    tipoNotificacion VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    prioridad VARCHAR(20) DEFAULT 'NORMAL',
    ubicacionAfectada JSON,
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

-- -----------------------------------------------------
-- Tabla: analytics_ruta_uso (Métricas avanzadas)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_ruta_uso (
    idRegistro INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    idRuta INT NOT NULL,
    idUsuario INT,
    origenUbicacion JSON,
    destinoUbicacion JSON,
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

-- -----------------------------------------------------
-- Tabla: auditoria_ubicaciones (Seguridad y privacidad)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria_ubicaciones (
    idAuditoria INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    idUsuario INT,
    accion VARCHAR(50) NOT NULL,
    ubicacionOriginal JSON,
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
-- MEJORAS A TABLAS EXISTENTES PARA WAZE-STYLE
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
-- DATOS DE PRUEBA WAZE-STYLE
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

SELECT '✅ Waze-Style: Nuevas funcionalidades agregadas exitosamente' as resultado;


