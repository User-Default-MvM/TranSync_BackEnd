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

        // Dividir el script en declaraciones individuales
        const statements = sqlScript
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`🔄 Ejecutando ${statements.length} declaraciones SQL...`);

        // Ejecutar cada declaración
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Declaración ${i + 1}/${statements.length} ejecutada`);
                } catch (error) {
                    // Ignorar errores de "database exists" o "table exists"
                    if (error.code === 'ER_DB_CREATE_EXISTS' || 
                        error.code === 'ER_TABLE_EXISTS_ERROR' ||
                        error.message.includes('already exists')) {
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
        await connection.execute('USE transync');
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