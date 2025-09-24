// init-database.js
// Script para inicializar la base de datos en Railway

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    console.log('🚀 Iniciando configuración de base de datos...');
    
    let connection;
    
    try {
        // Conectar a MySQL sin especificar base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });
        
        console.log('✅ Conexión a MySQL establecida');
        
        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, 'Version_final.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📄 Archivo SQL leído correctamente');
        
        // Ejecutar el script SQL
        console.log('⚙️ Ejecutando script de base de datos...');
        await connection.query(sqlContent);
        
        console.log('✅ Base de datos inicializada correctamente');
        console.log('📊 Tablas creadas:');
        console.log('   - Roles');
        console.log('   - Empresas');
        console.log('   - Usuarios');
        console.log('   - Gestores');
        console.log('   - Conductores');
        console.log('   - Vehiculos');
        console.log('   - Rutas');
        console.log('   - Viajes');
        console.log('   - InteraccionesChatbot');
        console.log('   - ConfiguracionChatbot');
        console.log('   - RespuestasPredefinidas');
        console.log('   - UserPreferences');
        console.log('   - NotificationSettings');
        console.log('   - UserActivity');
        
        console.log('🎯 Datos de prueba insertados:');
        console.log('   - 3 Roles (SUPERADMIN, GESTOR, CONDUCTOR)');
        console.log('   - 1 Empresa (Expreso La Sabana S.A.S)');
        console.log('   - 9 Usuarios de prueba');
        console.log('   - 5 Conductores');
        console.log('   - 6 Rutas');
        console.log('   - 5 Vehículos');
        console.log('   - 6 Viajes de ejemplo');
        console.log('   - Configuración del chatbot');
        console.log('   - Respuestas predefinidas');
        
        console.log('🔐 Credenciales de acceso:');
        console.log('   SUPERADMIN:');
        console.log('     Email: admintransync@gmail.com');
        console.log('     Password: admin123');
        console.log('   GESTOR:');
        console.log('     Email: juan.perez@example.com');
        console.log('     Password: gestor123');
        console.log('   CONDUCTOR:');
        console.log('     Email: ana.gomez@example.com');
        console.log('     Password: conductor123');
        
    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Verifica que:');
            console.error('   - Las variables de entorno DB_* estén configuradas');
            console.error('   - El servicio MySQL esté activo en Railway');
            console.error('   - Los datos de conexión sean correctos');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('🎉 ¡Base de datos lista para usar!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Error fatal:', error);
            process.exit(1);
        });
}

module.exports = { initializeDatabase };