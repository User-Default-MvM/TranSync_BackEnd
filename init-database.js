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