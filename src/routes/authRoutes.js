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
// RUTA DE RECUPERACIÓN DE SESIÓN - NUEVA FUNCIONALIDAD
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

module.exports = router;