// src/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const {
    validateProfileData,
    validatePasswordChange,
    validatePreferences,
    validateNotificationSettings,
    validateQueryParams
} = require('../middleware/profileValidation');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// =====================================================
// RUTAS PARA GESTIÓN DE PERFIL DE USUARIO
// =====================================================

// 1. OBTENER PERFIL DEL USUARIO
// GET /api/user/profile
router.get('/profile', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), profileController.getProfile);

// 2. ACTUALIZAR PERFIL DEL USUARIO
// PUT /api/user/profile
router.put('/profile', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), validateProfileData, profileController.updateProfile);

// 3. CAMBIAR CONTRASEÑA
// PUT /api/user/change-password
router.put('/change-password', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), validatePasswordChange, profileController.changePassword);

// 4. OBTENER PREFERENCIAS DEL USUARIO
// GET /api/user/preferences
router.get('/preferences', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), profileController.getPreferences);

// 5. ACTUALIZAR PREFERENCIAS DEL USUARIO
// PUT /api/user/preferences
router.put('/preferences', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), validatePreferences, profileController.updatePreferences);

// 6. OBTENER CONFIGURACIÓN DE NOTIFICACIONES
// GET /api/user/notifications/settings
router.get('/notifications/settings', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), profileController.getNotificationSettings);

// 7. ACTUALIZAR CONFIGURACIÓN DE NOTIFICACIONES
// PUT /api/user/notifications/settings
router.put('/notifications/settings', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), validateNotificationSettings, profileController.updateNotificationSettings);

// 8. OBTENER INFORMACIÓN DE LA EMPRESA
// GET /api/user/company
router.get('/company', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), profileController.getCompanyInfo);

// 9. OBTENER ACTIVIDAD DEL USUARIO
// GET /api/user/activity
router.get('/activity', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), validateQueryParams, profileController.getUserActivity);

// 10. VERIFICAR ESTADO DE LA CUENTA
// GET /api/user/account-status
router.get('/account-status', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), profileController.getAccountStatus);

module.exports = router;