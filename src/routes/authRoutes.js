const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// ========================================
// RUTAS DE AUTENTICACIÓN PÚBLICAS
// ========================================

// Registro de usuario
router.post('/register', authController.register);

// Inicio de sesión
router.post('/login', authController.login);

// Verificación de cuenta por email
router.get('/verify', authController.verifyAccount);

// Recuperación de contraseña
router.post('/forgot-password', authController.forgotPassword);

// Reset de contraseña
router.post('/reset-password', authController.resetPassword);

// Health check
router.get('/health', authController.healthCheck);

// Test email service
router.post('/test-email', authController.testEmailService);

// ========================================
// RUTAS DE AUTENTICACIÓN PROTEGIDAS
// ========================================

// Obtener perfil del usuario autenticado
router.get('/profile', authMiddleware, authController.getProfile);

// Verificar token (para debugging)
router.get('/verify-token', authMiddleware, authController.verifyToken);

// Actualizar perfil
router.put('/profile', authMiddleware, authController.updateProfile);

// Cambiar contraseña
router.put('/change-password', authMiddleware, authController.changePassword);

// Cerrar sesión
router.post('/logout', authMiddleware, authController.logout);

// ========================================
// RUTAS DE RECUPERACIÓN DE SESIÓN - NUEVA FUNCIONALIDAD
// ========================================
// Esta ruta ayuda a recuperar sesiones con datos de usuario incompletos
router.post('/recover-session', async (req, res) => {
    try {
        const { token, userId } = req.body;

        if (!token && !userId) {
            return res.status(400).json({
                message: "Token o ID de usuario requerido para recuperación de sesión."
            });
        }

        // Usar el servicio de recuperación de sesión
        const sessionRecoveryService = require('../services/sessionRecoveryService');
        const result = await sessionRecoveryService.recoverUserSession(token, userId);

        if (result.success) {
            res.json({
                success: true,
                message: 'Sesión recuperada exitosamente',
                userData: result.userData,
                token: result.token,
                recovered: true
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.error,
                canRetry: result.canRetry
            });
        }
    } catch (error) {
        console.error("Error recuperando sesión:", error);
        res.status(500).json({
            message: "Error interno del servidor al recuperar sesión."
        });
    }
});

// Esta ruta verifica y refresca tokens con datos completos del usuario
router.post('/verify-and-refresh', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Token no proporcionado.',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');

        // Verificar token actual
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Recuperar datos completos del usuario
        const pool = require('../config/db');
        const query = `
            SELECT u.idUsuario, u.email, u.nomUsuario, u.apeUsuario, u.numDocUsuario, u.telUsuario,
                   r.nomRol as rol, e.nomEmpresa, e.idEmpresa
            FROM Usuarios u
            JOIN Roles r ON u.idRol = r.idRol
            JOIN Empresas e ON u.idEmpresa = e.idEmpresa
            WHERE u.idUsuario = ?
        `;

        const [rows] = await pool.query(query, [decoded.idUsuario]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({
                message: 'Usuario no encontrado.',
                code: 'USER_NOT_FOUND'
            });
        }

        // Generar nuevo token con datos completos
        const newToken = jwt.sign(
            {
                idUsuario: user.idUsuario,
                idEmpresa: user.idEmpresa,
                rol: user.rol,
                email: user.email,
                nombre: user.nomUsuario,
                apellido: user.apeUsuario,
                telefono: user.telUsuario,
                documento: user.numDocUsuario,
                empresa: user.nomEmpresa,
                activo: user.estActivo,
                fechaCreacion: user.fecCreUsuario
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Token verificado y actualizado exitosamente',
            token: newToken,
            user: {
                id: user.idUsuario,
                email: user.email,
                name: user.nomUsuario,
                empresaId: user.idEmpresa,
                empresa: user.nomEmpresa,
                role: user.rol,
                telefono: user.telUsuario,
                documento: user.numDocUsuario,
                activo: user.estActivo,
                fechaCreacion: user.fecCreUsuario
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: 'Token inválido.',
                code: 'INVALID_TOKEN'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Token expirado. Inicie sesión nuevamente.',
                code: 'TOKEN_EXPIRED'
            });
        }

        console.error("Error verificando y refrescando token:", error);
        res.status(500).json({
            message: "Error interno del servidor."
        });
    }
});

module.exports = router;