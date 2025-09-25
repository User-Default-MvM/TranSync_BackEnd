// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authController.verifyAccount);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Rutas protegidas
router.post('/logout', authController.logout);
router.get('/profile', authMiddleware, authController.getProfile);
router.get('/verify-token', authMiddleware, authController.verifyToken);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, authController.changePassword);

// Health check
router.get('/health', authController.healthCheck);

// Test email service (solo en desarrollo o con autenticación)
if (process.env.NODE_ENV === 'development') {
    router.post('/test-email', authController.testEmailService);
} else {
    // En producción, requerir autenticación para el test
    router.post('/test-email', authMiddleware, authController.testEmailService);
}

module.exports = router;