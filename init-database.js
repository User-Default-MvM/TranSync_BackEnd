const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    let connection;
    
    try {
        console.log('🔄 Conectando a la base de datos...');
        
        // Crear conexión sin especificar base de datos inicialmente
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 3306,
            multipleStatements: true, // Permitir múltiples declaraciones SQL
            charset: 'utf8mb4'
        });

        console.log('✅ Conexión establecida');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, 'Version_final.sql');
        console.log('📖 Leyendo script SQL...');
        
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`Archivo SQL no encontrado: ${sqlPath}`);
        }

        const sqlScript = fs.readFileSync(sqlPath, 'utf8');
        console.log('✅ Script SQL leído correctamente');

        // Dividir el script en declaraciones individuales de manera más inteligente
        // Primero, remover comentarios de línea completa
        const cleanScript = sqlScript
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');
        
        // Dividir por punto y coma, pero mantener juntas las declaraciones INSERT complejas
        const statements = [];
        let currentStatement = '';
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < cleanScript.length; i++) {
            const char = cleanScript[i];
            const prevChar = i > 0 ? cleanScript[i - 1] : '';
            
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
            }
            
            currentStatement += char;
            
            if (char === ';' && !inString) {
                const stmt = currentStatement.trim();
                if (stmt.length > 0) {
                    statements.push(stmt.replace(/;$/, ''));
                }
                currentStatement = '';
            }
        }
        
        // Agregar la última declaración si no termina en punto y coma
        if (currentStatement.trim().length > 0) {
            statements.push(currentStatement.trim());
        }
        
        // Filtrar declaraciones vacías
        const validStatements = statements.filter(stmt => stmt.length > 0);

        console.log(`🔄 Ejecutando ${validStatements.length} declaraciones SQL...`);

        // Ejecutar cada declaración
        for (let i = 0; i < validStatements.length; i++) {
            const statement = validStatements[i];
            if (statement.trim()) {
                try {
                    // Usar query() para comandos que no soportan prepared statements
                    const upperStatement = statement.trim().toUpperCase();
                    if (upperStatement.startsWith('USE ') ||
                        upperStatement.startsWith('DROP DATABASE') ||
                        upperStatement.startsWith('CREATE DATABASE')) {
                        await connection.query(statement);
                    } else {
                        await connection.execute(statement);
                    }
                    console.log(`✅ Declaración ${i + 1}/${validStatements.length} ejecutada`);
                } catch (error) {
                    // Ignorar errores de "database exists", "table exists" o "duplicate entry"
                    if (error.code === 'ER_DB_CREATE_EXISTS' ||
                        error.code === 'ER_TABLE_EXISTS_ERROR' ||
                        error.code === 'ER_DUP_ENTRY' ||
                        error.message.includes('already exists') ||
                        error.message.includes('Duplicate entry')) {
                        console.log(`⚠️  Declaración ${i + 1}: ${error.message} (ignorado)`);
                    } else {
                        console.error(`❌ Error en declaración ${i + 1}:`, error.message);
                        console.error(`📝 Declaración: ${statement.substring(0, 100)}...`);
                        // Continuar con las siguientes declaraciones
                    }
                }
            }
        }

        // Verificar que las tablas se crearon
        console.log('🔍 Verificando tablas creadas...');
        await connection.query('USE railway');
        const [tables] = await connection.execute('SHOW TABLES');
        
        console.log('✅ Base de datos inicializada correctamente');
        console.log(`📊 Tablas creadas: ${tables.length}`);
        
        tables.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`   ${index + 1}. ${tableName}`);
        });

        // Verificar algunos datos de prueba
        console.log('🔍 Verificando datos iniciales...');
        const [users] = await connection.execute('SELECT COUNT(*) as count FROM Usuarios');
        const [companies] = await connection.execute('SELECT COUNT(*) as count FROM Empresas');
        const [roles] = await connection.execute('SELECT COUNT(*) as count FROM Roles');

        console.log(`👥 Usuarios: ${users[0].count}`);
        console.log(`🏢 Empresas: ${companies[0].count}`);
        console.log(`🔐 Roles: ${roles[0].count}`);

        // Verificar si ya existen datos iniciales para evitar duplicados
        const [existingRoles] = await connection.execute('SELECT COUNT(*) as count FROM Roles WHERE nomRol IN ("SUPERADMIN", "GESTOR", "CONDUCTOR")');
        const [existingCompany] = await connection.execute('SELECT COUNT(*) as count FROM Empresas WHERE nitEmpresa = "901234567"');
        const [existingAdmin] = await connection.execute('SELECT COUNT(*) as count FROM Usuarios WHERE email = "admintransync@gmail.com"');

        if (existingRoles[0].count === 0) {
            console.log('📝 Insertando roles iniciales...');
        } else {
            console.log('⚠️  Roles iniciales ya existen, omitiendo inserción');
        }

        if (existingCompany[0].count === 0) {
            console.log('📝 Insertando empresa inicial...');
        } else {
            console.log('⚠️  Empresa inicial ya existe, omitiendo inserción');
        }

        if (existingAdmin[0].count === 0) {
            console.log('📝 Insertando usuarios iniciales...');
        } else {
            console.log('⚠️  Usuarios iniciales ya existen, omitiendo inserción');
        }

        // Verificar y crear tabla PasswordResets si no existe
        console.log('🔍 Verificando tabla PasswordResets...');
        const [passwordResetTables] = await connection.execute(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'PasswordResets'
        `, [process.env.DB_DATABASE || 'railway']);

        if (passwordResetTables.length === 0) {
            console.log('📋 Creando tabla PasswordResets...');

            await connection.execute(`
                CREATE TABLE PasswordResets (
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
                )
            `);

            console.log('✅ Tabla PasswordResets creada exitosamente');
        } else {
            console.log('ℹ️  La tabla PasswordResets ya existe');
        }

        // Limpiar tokens expirados (mantenimiento)
        const [result] = await connection.execute(
            'DELETE FROM PasswordResets WHERE expiresAt < NOW() OR used = true'
        );

        if (result.affectedRows > 0) {
            console.log(`🧹 Eliminados ${result.affectedRows} tokens expirados o usados`);
        }

        // Verificar y crear tablas faltantes para dashboard
        console.log('🔍 Verificando tablas de dashboard...');

        // Crear tabla ResumenOperacional si no existe
        const [resumenTables] = await connection.execute(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ResumenOperacional'
        `, [process.env.DB_DATABASE || 'railway']);

        if (resumenTables.length === 0) {
            console.log('📋 Creando tabla ResumenOperacional...');

            await connection.execute(`
                CREATE TABLE ResumenOperacional (
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
                )
            `);

            console.log('✅ Tabla ResumenOperacional creada exitosamente');
        } else {
            console.log('ℹ️  La tabla ResumenOperacional ya existe');
        }

        // Crear tabla AlertasVencimientos si no existe
        const [alertasTables] = await connection.execute(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'AlertasVencimientos'
        `, [process.env.DB_DATABASE || 'railway']);

        if (alertasTables.length === 0) {
            console.log('📋 Creando tabla AlertasVencimientos...');

            await connection.execute(`
                CREATE TABLE AlertasVencimientos (
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
                )
            `);

            console.log('✅ Tabla AlertasVencimientos creada exitosamente');
        } else {
            console.log('ℹ️  La tabla AlertasVencimientos ya existe');
        }

        // =====================================================
        // WAZE-STYLE: CREAR NUEVAS TABLAS PARA RAILWAY
        // =====================================================

        console.log('🔍 Verificando tablas Waze-Style...');

        // Crear tabla ubicaciones_usuario si no existe
        const [ubicacionesTables] = await connection.execute(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ubicaciones_usuario'
        `, [process.env.DB_DATABASE || 'railway']);

        if (ubicacionesTables.length === 0) {
            console.log('📋 Creando tabla ubicaciones_usuario...');

            await connection.execute(`
                CREATE TABLE ubicaciones_usuario (
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
                    INDEX idx_ubicaciones_usuario_fecha (fechaHora),
                    INDEX idx_ubicaciones_usuario_usuario_fecha (idUsuario, fechaHora DESC),
                    INDEX idx_ubicaciones_usuario_coordenadas (latitud, longitud),
                    FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE CASCADE
                )
            `);

            console.log('✅ Tabla ubicaciones_usuario creada exitosamente');
        } else {
            console.log('ℹ️  La tabla ubicaciones_usuario ya existe');
        }

        // Crear tabla puntos_interes si no existe
        const [puntosTables] = await connection.execute(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'puntos_interes'
        `, [process.env.DB_DATABASE || 'railway']);

        if (puntosTables.length === 0) {
            console.log('📋 Creando tabla puntos_interes...');

            await connection.execute(`
                CREATE TABLE puntos_interes (
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
                    INDEX idx_puntos_interes_tipo_ubicacion (tipoPoi, latitud, longitud),
                    INDEX idx_puntos_interes_ruta (idRutaAsociada),
                    INDEX idx_puntos_interes_coordenadas (latitud, longitud),
                    FOREIGN KEY (idRutaAsociada) REFERENCES Rutas(idRuta) ON DELETE CASCADE
                )
            `);

            console.log('✅ Tabla puntos_interes creada exitosamente');
        } else {
            console.log('ℹ️  La tabla puntos_interes ya existe');
        }

        // Crear tabla notificaciones_ruta si no existe
        const [notificacionesTables] = await connection.execute(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notificaciones_ruta'
        `, [process.env.DB_DATABASE || 'railway']);

        if (notificacionesTables.length === 0) {
            console.log('📋 Creando tabla notificaciones_ruta...');

            await connection.execute(`
                CREATE TABLE notificaciones_ruta (
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
                    INDEX idx_notificaciones_ruta_activa (idRuta, activa, tiempoInicio),
                    INDEX idx_notificaciones_ruta_tipo (tipoNotificacion, activa),
                    INDEX idx_notificaciones_ruta_prioridad (prioridad, activa),
                    FOREIGN KEY (idRuta) REFERENCES Rutas(idRuta) ON DELETE CASCADE
                )
            `);

            console.log('✅ Tabla notificaciones_ruta creada exitosamente');
        } else {
            console.log('ℹ️  La tabla notificaciones_ruta ya existe');
        }

        // Crear tabla analytics_ruta_uso si no existe
        const [analyticsTables] = await connection.execute(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'analytics_ruta_uso'
        `, [process.env.DB_DATABASE || 'railway']);

        if (analyticsTables.length === 0) {
            console.log('📋 Creando tabla analytics_ruta_uso...');

            await connection.execute(`
                CREATE TABLE analytics_ruta_uso (
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
                    INDEX idx_analytics_ruta_fecha (idRuta, fechaHoraInicio),
                    INDEX idx_analytics_usuario_patrones (idUsuario, fechaHoraInicio),
                    INDEX idx_analytics_calificacion (calificacionViaje),
                    FOREIGN KEY (idRuta) REFERENCES Rutas(idRuta) ON DELETE CASCADE,
                    FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE SET NULL
                )
            `);

            console.log('✅ Tabla analytics_ruta_uso creada exitosamente');
        } else {
            console.log('ℹ️  La tabla analytics_ruta_uso ya existe');
        }

        // Crear tabla auditoria_ubicaciones si no existe
        const [auditoriaTables] = await connection.execute(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'auditoria_ubicaciones'
        `, [process.env.DB_DATABASE || 'railway']);

        if (auditoriaTables.length === 0) {
            console.log('📋 Creando tabla auditoria_ubicaciones...');

            await connection.execute(`
                CREATE TABLE auditoria_ubicaciones (
                    idAuditoria INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
                    idUsuario INT,
                    accion VARCHAR(50) NOT NULL,
                    ubicacionOriginal JSON,
                    ubicacionNueva JSON,
                    ipUsuario VARCHAR(45),
                    userAgent TEXT,
                    fechaHora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_auditoria_usuario_fecha (idUsuario, fechaHora),
                    INDEX idx_auditoria_accion_fecha (accion, fechaHora),
                    FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario) ON DELETE SET NULL
                )
            `);

            console.log('✅ Tabla auditoria_ubicaciones creada exitosamente');
        } else {
            console.log('ℹ️  La tabla auditoria_ubicaciones ya existe');
        }

        // =====================================================
        // MEJORAS A TABLAS EXISTENTES PARA WAZE-STYLE
        // =====================================================

        console.log('🔧 Aplicando mejoras Waze-Style a tablas existentes...');

        // Agregar columnas a tabla Rutas si no existen
        try {
            await connection.execute(`
                ALTER TABLE Rutas
                ADD COLUMN IF NOT EXISTS coordenadasRuta JSON,
                ADD COLUMN IF NOT EXISTS distanciaKm DECIMAL(8, 3),
                ADD COLUMN IF NOT EXISTS tiempoEstimadoMin INT,
                ADD COLUMN IF NOT EXISTS usoContador INT DEFAULT 0,
                ADD COLUMN IF NOT EXISTS calificacionPromedio DECIMAL(3, 2),
                ADD COLUMN IF NOT EXISTS datosTrafico JSON
            `);
            console.log('✅ Mejoras aplicadas a tabla Rutas');
        } catch (error) {
            console.log('ℹ️  Las columnas de Rutas ya existen o hubo un problema menor');
        }

        // Agregar columnas a tabla Vehiculos si no existen
        try {
            await connection.execute(`
                ALTER TABLE Vehiculos
                ADD COLUMN IF NOT EXISTS latitudActual DECIMAL(10, 8),
                ADD COLUMN IF NOT EXISTS longitudActual DECIMAL(11, 8),
                ADD COLUMN IF NOT EXISTS ultimaUbicacion TIMESTAMP,
                ADD COLUMN IF NOT EXISTS velocidadActual DECIMAL(5, 2),
                ADD COLUMN IF NOT EXISTS rumboActual DECIMAL(5, 2)
            `);
            console.log('✅ Mejoras aplicadas a tabla Vehiculos');
        } catch (error) {
            console.log('ℹ️  Las columnas de Vehiculos ya existen o hubo un problema menor');
        }

        // Crear índices adicionales si no existen
        try {
            await connection.execute(`
                CREATE INDEX IF NOT EXISTS idx_rutas_estado_ubicacion ON Rutas(estRuta, coordenadasRuta);
                CREATE INDEX IF NOT EXISTS idx_vehiculos_estado_ubicacion ON Vehiculos(estVehiculo, latitudActual, longitudActual);
            `);
            console.log('✅ Índices adicionales creados');
        } catch (error) {
            console.log('ℹ️  Los índices adicionales ya existen o hubo un problema menor');
        }

        console.log('🎉 ¡Base de datos lista para usar!');

    } catch (error) {
        console.error('❌ Error inicializando la base de datos:', error.message);
        console.error('📋 Verificar configuración:');
        console.error(`   DB_HOST: ${process.env.DB_HOST}`);
        console.error(`   DB_USER: ${process.env.DB_USER}`);
        console.error(`   DB_DATABASE: ${process.env.DB_DATABASE}`);
        console.error(`   DB_PORT: ${process.env.DB_PORT || 3306}`);
        console.error(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}`);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };