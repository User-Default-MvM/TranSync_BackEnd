// src/utils/passwordHasher.js

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

/**
 * Hashea una contraseña usando bcrypt
 * @param {string} password - Contraseña en texto plano
 * @param {number} saltRounds - Número de rounds para el salt (por defecto 10)
 * @returns {Promise<string>} - Contraseña hasheada
 */
const hashPassword = async (password, saltRounds = 10) => {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        console.error('Error al hashear la contraseña:', error);
        throw error;
    }
};

/**
 * Verifica si una contraseña coincide con su hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hashedPassword - Contraseña hasheada
 * @returns {Promise<boolean>} - True si coinciden, false si no
 */
const verifyPassword = async (password, hashedPassword) => {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        console.error('Error al verificar la contraseña:', error);
        throw error;
    }
};

/**
 * Actualiza la contraseña de un usuario en la base de datos
 * @param {number} userId - ID del usuario
 * @param {string} newPassword - Nueva contraseña en texto plano
 * @returns {Promise<object>} - Resultado de la actualización
 */
const updateUserPassword = async (userId, newPassword) => {
    try {
        const hashedPassword = await hashPassword(newPassword);
        
        const [result] = await pool.query(
            'UPDATE Usuarios SET passwordHash = ? WHERE idUsuario = ?',
            [hashedPassword, userId]
        );
        
        return {
            success: result.affectedRows > 0,
            message: result.affectedRows > 0 
                ? 'Contraseña actualizada exitosamente' 
                : 'Usuario no encontrado'
        };
    } catch (error) {
        console.error('Error al actualizar contraseña:', error);
        throw error;
    }
};

/**
 * Actualiza la contraseña por email
 * @param {string} email - Email del usuario
 * @param {string} newPassword - Nueva contraseña en texto plano
 * @returns {Promise<object>} - Resultado de la actualización
 */
const updatePasswordByEmail = async (email, newPassword) => {
    try {
        const hashedPassword = await hashPassword(newPassword);
        
        const [result] = await pool.query(
            'UPDATE Usuarios SET passwordHash = ? WHERE email = ?',
            [hashedPassword, email]
        );
        
        return {
            success: result.affectedRows > 0,
            message: result.affectedRows > 0 
                ? 'Contraseña actualizada exitosamente' 
                : 'Usuario no encontrado'
        };
    } catch (error) {
        console.error('Error al actualizar contraseña por email:', error);
        throw error;
    }
};

/**
 * Script para hashear las contraseñas existentes en la base de datos
 * USAR CON PRECAUCIÓN - Esto actualizará todas las contraseñas
 */
const hashExistingPasswords = async () => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        console.log('🔄 Iniciando proceso de hasheo de contraseñas...');
        
        // Obtener todos los usuarios
        const [users] = await connection.query('SELECT idUsuario, email FROM Usuarios');
        
        console.log(`📋 Encontrados ${users.length} usuarios para actualizar`);
        
        // Contraseñas por defecto para los usuarios existentes
        const defaultPasswords = {
            'transsync1@gmail.com': 'admin123',
            'admin@elrapido.com': 'admin123', 
            'conductor@elrapido.com': 'conductor123'
        };
        
        let updated = 0;
        
        for (const user of users) {
            const defaultPassword = defaultPasswords[user.email] || 'password123';
            const hashedPassword = await hashPassword(defaultPassword);
            
            await connection.query(
                'UPDATE Usuarios SET passwordHash = ? WHERE idUsuario = ?',
                [hashedPassword, user.idUsuario]
            );
            
            console.log(`✅ Usuario ${user.email} actualizado (password: ${defaultPassword})`);
            updated++;
        }
        
        await connection.commit();
        console.log(`🎉 Proceso completado! ${updated} contraseñas actualizadas exitosamente.`);
        
        return { success: true, updated };
        
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error en el proceso de hasheo:', error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Función para generar hash de una contraseña específica (útil para testing)
 * @param {string} password - Contraseña a hashear
 */
const generateHashForPassword = async (password) => {
    try {
        const hash = await hashPassword(password);
        console.log(`📝 Contraseña: ${password}`);
        console.log(`🔐 Hash: ${hash}`);
        console.log(`✅ Verificación: ${await verifyPassword(password, hash)}`);
        return hash;
    } catch (error) {
        console.error('Error:', error);
    }
};

/**
 * Script para verificar que las contraseñas fueron hasheadas correctamente
 */
const verifyHashedPasswords = async () => {
    try {
        console.log('🔍 Verificando contraseñas hasheadas...');
        
        const [users] = await pool.query(`
            SELECT idUsuario, email, passwordHash 
            FROM Usuarios 
            WHERE email IN ('transsync1@gmail.com', 'admin@elrapido.com', 'conductor@elrapido.com')
        `);
        
        const testPasswords = {
            'transsync1@gmail.com': 'admin123',
            'admin@elrapido.com': 'admin123',
            'conductor@elrapido.com': 'conductor123'
        };
        
        for (const user of users) {
            const testPassword = testPasswords[user.email];
            if (testPassword) {
                const isValid = await verifyPassword(testPassword, user.passwordHash);
                console.log(`${isValid ? '✅' : '❌'} ${user.email}: ${testPassword} - ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
            }
        }
        
    } catch (error) {
        console.error('Error en verificación:', error);
    }
};

module.exports = {
    hashPassword,
    verifyPassword,
    updateUserPassword,
    updatePasswordByEmail,
    hashExistingPasswords,
    generateHashForPassword,
    verifyHashedPasswords
};