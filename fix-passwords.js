// fix-passwords.js
// Script para hashear y actualizar contraseñas de usuarios en la base de datos

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

async function hashPassword(password) {
    try {
        const saltRounds = 12; // Aumentado para mayor seguridad
        const salt = await bcrypt.genSalt(saltRounds);
        return await bcrypt.hash(password, salt);
    } catch (error) {
        console.error('❌ Error generando hash de contraseña:', error.message);
        throw error;
    }
}

async function verifyPassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('❌ Error verificando contraseña:', error.message);
        return false;
    }
}

async function checkUserExists(email) {
    try {
        const [rows] = await pool.query(
            'SELECT idUsuario, email, passwordHash FROM Usuarios WHERE email = ?',
            [email]
        );
        return rows[0] || null;
    } catch (error) {
        console.error(`❌ Error verificando existencia de usuario ${email}:`, error.message);
        throw error;
    }
}

async function updateUserPassword(email, hashedPassword) {
    try {
        const [result] = await pool.query(
            'UPDATE Usuarios SET passwordHash = ?, fecUltModUsuario = CURRENT_TIMESTAMP WHERE email = ?',
            [hashedPassword, email]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error(`❌ Error actualizando contraseña para ${email}:`, error.message);
        throw error;
    }
}

async function fixPasswords() {
    console.log('🔄 Iniciando proceso de corrección de contraseñas...\n');

    let connection;
    try {
        // Obtener conexión del pool para transacciones
        connection = await pool.getConnection();

        // Iniciar transacción
        await connection.beginTransaction();
        console.log('🔐 Transacción iniciada\n');

        // Usuarios a actualizar con sus nuevas contraseñas
        const usersToUpdate = [
            { email: 'admintransync@gmail.com', password: 'admin123', description: 'Administrador Principal' },
            { email: 'adminrapidotolima@gmail.com', password: 'admin124', description: 'Administrador Secundario' }
        ];

        let updatedCount = 0;
        let errorCount = 0;

        for (const user of usersToUpdate) {
            try {
                console.log(`👤 Procesando: ${user.description} (${user.email})`);

                // Verificar si el usuario existe
                const existingUser = await checkUserExists(user.email);

                if (!existingUser) {
                    console.log(`⚠️  Usuario no encontrado: ${user.email}`);
                    errorCount++;
                    continue;
                }

                console.log(`   └─ Usuario encontrado (ID: ${existingUser.idUsuario})`);

                // Generar nuevo hash de contraseña
                console.log(`   └─ Generando hash para nueva contraseña...`);
                const hashedPassword = await hashPassword(user.password);

                // Actualizar contraseña en la base de datos
                console.log(`   └─ Actualizando contraseña en base de datos...`);
                const updated = await updateUserPassword(user.email, hashedPassword);

                if (updated) {
                    // Verificar que el hash funciona correctamente
                    const isValid = await verifyPassword(user.password, hashedPassword);

                    if (isValid) {
                        console.log(`   ✅ Contraseña actualizada correctamente`);
                        console.log(`   🔍 Verificación de hash: CORRECTA`);
                        updatedCount++;
                    } else {
                        console.log(`   ❌ Error en verificación de hash`);
                        errorCount++;
                    }
                } else {
                    console.log(`   ❌ No se pudo actualizar la contraseña`);
                    errorCount++;
                }

                console.log(''); // Línea en blanco para separación

            } catch (userError) {
                console.error(`❌ Error procesando usuario ${user.email}:`, userError.message);
                errorCount++;
                console.log('');
            }
        }

        // Confirmar transacción si todo salió bien
        if (errorCount === 0) {
            await connection.commit();
            console.log('✅ Transacción confirmada exitosamente\n');
        } else {
            await connection.rollback();
            console.log('❌ Transacción revertida debido a errores\n');
        }

        // Resumen final
        console.log('📊 RESUMEN DEL PROCESO:');
        console.log(`   ✅ Usuarios actualizados: ${updatedCount}`);
        console.log(`   ❌ Errores: ${errorCount}`);
        console.log('');

        if (updatedCount > 0) {
            console.log('🎉 ¡Proceso completado exitosamente!');
            console.log('🚀 Ahora puedes iniciar sesión con:');
            usersToUpdate.forEach(user => {
                console.log(`   📧 ${user.email}`);
                console.log(`   🔑 ${user.password}`);
                console.log('');
            });
        } else {
            console.log('⚠️  No se actualizó ningún usuario. Revisa los logs anteriores.');
        }

    } catch (error) {
        console.error('❌ Error general en el proceso:', error.message);
        console.error('Stack trace:', error.stack);

        // Revertir transacción en caso de error general
        if (connection) {
            try {
                await connection.rollback();
                console.log('🔄 Transacción revertida debido a error general');
            } catch (rollbackError) {
                console.error('❌ Error al revertir transacción:', rollbackError.message);
            }
        }

        process.exit(1); // Salir con código de error

    } finally {
        // Liberar conexión del pool
        if (connection) {
            try {
                connection.release();
                console.log('🔌 Conexión liberada correctamente');
            } catch (releaseError) {
                console.error('❌ Error liberando conexión:', releaseError.message);
            }
        }

        // Cerrar el pool de conexiones
        try {
            await pool.end();
            console.log('🏁 Pool de conexiones cerrado');
        } catch (poolError) {
            console.error('❌ Error cerrando pool de conexiones:', poolError.message);
        }

        console.log('👋 Script finalizado');
        process.exit(errorCount > 0 ? 1 : 0);
    }
}

// Ejecutar el script
console.log('🚀 Iniciando script de corrección de contraseñas...\n');
fixPasswords().catch(error => {
    console.error('❌ Error no manejado:', error);
    process.exit(1);
});