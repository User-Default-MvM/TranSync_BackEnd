// src/config/db.js

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    // Configuraciones modernas válidas para MySQL2
    acquireTimeout: 60000,      // Tiempo máximo para obtener conexión
    idleTimeout: 600000,        // 10 minutos de timeout para conexiones inactivas
    enableKeepAlive: true,      // Mantener conexiones vivas
    keepAliveInitialDelay: 0,   // Iniciar keep-alive inmediatamente

    // Configuraciones adicionales recomendadas
    charset: 'utf8mb4',         // Soporte para emojis y caracteres especiales
    timezone: 'Z',              // Usar timezone UTC
    dateStrings: false,         // Retornar fechas como objetos Date
    debug: false,               // Establecer en true para debugging SQL
    multipleStatements: false,  // Seguridad: prevenir múltiples declaraciones SQL

    // Configuración de timeout de conexión (válida)
    connectTimeout: 20000,      // 20 segundos timeout de conexión

    // REMOVIDAS las siguientes opciones que causan advertencias:
    // reconnect: true,         // Esta opción está deprecada
    // acquireTimeout: 60000,   // Duplicada - ya está arriba
    // timeout: 60000,          // Esta opción está deprecada
});

// Función mejorada de test de conexión
async function testConnection() {
    try {
        const connection = await pool.getConnection();

        // Test con una query simple (usar comillas invertidas para nombres de columnas)
        const [rows] = await connection.execute('SELECT 1 as test, NOW() as `current_time`');

        console.log('✅ Conexión exitosa a MySQL');
        console.log(`📊 Base de datos: ${process.env.DB_DATABASE}`);
        console.log(`🌐 Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
        console.log(`⏰ Tiempo del servidor: ${rows[0].current_time}`);

        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        console.error('📋 Verificar configuración en .env:');
        console.error(`   DB_HOST: ${process.env.DB_HOST}`);
        console.error(`   DB_USER: ${process.env.DB_USER}`);
        console.error(`   DB_DATABASE: ${process.env.DB_DATABASE}`);
        console.error(`   DB_PORT: ${process.env.DB_PORT || 3306}`);
        console.error(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}`);
        return false;
    }
}

// Manejo de cierre graceful
process.on('SIGINT', async () => {
    console.log('🔄 Cerrando pool de conexiones...');
    try {
        await pool.end();
        console.log('✅ Pool de conexiones cerrado correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error cerrando pool:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('🔄 Cerrando pool de conexiones por SIGTERM...');
    try {
        await pool.end();
        console.log('✅ Pool de conexiones cerrado correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error cerrando pool:', error);
        process.exit(1);
    }
});

// Test de conexión en startup
testConnection();

module.exports = pool;