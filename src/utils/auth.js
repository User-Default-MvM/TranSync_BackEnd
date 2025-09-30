// Utilidades mejoradas para manejo de autenticación y recuperación de datos

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Validar estructura completa de datos de usuario
 */
const validateUserData = (userData) => {
    const required = ['idUsuario', 'idEmpresa', 'rol'];
    const missing = [];

    required.forEach(field => {
        if (!userData[field]) {
            missing.push(field);
        }
    });

    return {
        isValid: missing.length === 0,
        missingFields: missing,
        hasCompleteData: userData.nombre && userData.apellido && userData.email
    };
};

/**
 * Recuperar datos completos del usuario desde la base de datos
 */
const recoverUserData = async (userId) => {
    try {
        const query = `
            SELECT u.idUsuario, u.email, u.nomUsuario, u.apeUsuario, u.numDocUsuario, u.telUsuario,
                   r.nomRol as rol, e.nomEmpresa, e.idEmpresa
            FROM Usuarios u
            JOIN Roles r ON u.idRol = r.idRol
            JOIN Empresas e ON u.idEmpresa = e.idEmpresa
            WHERE u.idUsuario = ?
        `;

        const [rows] = await pool.query(query, [userId]);
        const user = rows[0];

        if (!user) {
            throw new Error('Usuario no encontrado en la base de datos');
        }

        return {
            idUsuario: user.idUsuario,
            idEmpresa: user.idEmpresa,
            rol: user.rol,
            email: user.email,
            nombre: user.nomUsuario,
            apellido: user.apeUsuario,
            telefono: user.telUsuario,
            documento: user.numDocUsuario,
            empresa: user.nomEmpresa
        };
    } catch (error) {
        console.error('Error recuperando datos del usuario:', error);
        throw error;
    }
};

/**
 * Generar token con datos completos del usuario
 */
const generateCompleteToken = (userData) => {
    const validatedData = validateUserData(userData);

    if (!validatedData.isValid) {
        throw new Error(`Datos de usuario incompletos: ${validatedData.missingFields.join(', ')}`);
    }

    return jwt.sign(
        {
            idUsuario: userData.idUsuario,
            idEmpresa: userData.idEmpresa,
            rol: userData.rol,
            email: userData.email,
            nombre: userData.nombre,
            apellido: userData.apellido,
            telefono: userData.telefono,
            documento: userData.documento
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

/**
 * Verificar y completar datos del usuario desde token
 */
const verifyAndCompleteUserData = async (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const validatedData = validateUserData(decoded);

        if (!validatedData.isValid) {
            console.log('Token con datos incompletos, recuperando de BD...');
            const completeData = await recoverUserData(decoded.idUsuario);
            return {
                ...completeData,
                token: generateCompleteToken(completeData)
            };
        }

        return { ...decoded, token };
    } catch (error) {
        console.error('Error verificando y completando datos de usuario:', error);
        throw error;
    }
};

/**
 * Middleware mejorado para manejo de errores de autenticación
 */
const handleAuthError = (error, res) => {
    console.error('Error de autenticación:', error);

    if (error.message.includes('Datos de usuario incompletos')) {
        return res.status(401).json({
            message: 'Datos de usuario incompletos. Inicie sesión nuevamente.',
            code: 'INCOMPLETE_USER_DATA',
            action: 'RELOGIN_REQUIRED'
        });
    }

    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            message: 'Token inválido.',
            code: 'INVALID_TOKEN'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            message: 'Token expirado. Inicie sesión nuevamente.',
            code: 'TOKEN_EXPIRED',
            action: 'RELOGIN_REQUIRED'
        });
    }

    return res.status(500).json({
        message: 'Error interno del servidor.',
        code: 'INTERNAL_ERROR'
    });
};

/**
 * Verificar permisos de usuario para recursos específicos
 */
const checkResourcePermission = (user, resource, action = 'read') => {
    // Superadmin tiene acceso total
    if (user.rol === 'SUPERADMIN') {
        return { allowed: true, reason: 'SUPERADMIN_ACCESS' };
    }

    // Gestores tienen acceso a recursos de su empresa
    if (user.rol === 'GESTOR') {
        if (resource.idEmpresa === user.idEmpresa) {
            return { allowed: true, reason: 'GESTOR_ACCESS' };
        }
        return { allowed: false, reason: 'EMPRESA_MISMATCH' };
    }

    // Conductores tienen acceso limitado
    if (user.rol === 'CONDUCTOR') {
        if (resource.idUsuario === user.idUsuario || resource.idEmpresa === user.idEmpresa) {
            return { allowed: true, reason: 'CONDUCTOR_ACCESS' };
        }
        return { allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' };
    }

    return { allowed: false, reason: 'UNKNOWN_ROLE' };
};

module.exports = {
    validateUserData,
    recoverUserData,
    generateCompleteToken,
    verifyAndCompleteUserData,
    handleAuthError,
    checkResourcePermission
};