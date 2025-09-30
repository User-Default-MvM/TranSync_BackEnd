// src/routes/adminRoutes.js

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminControllers");
const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

// Aplicar seguridad a todas las rutas de este archivo
router.use(authMiddleware);

// ================================
// GESTIÓN DE USUARIOS
// ================================

// GET /api/admin/users - Listar usuarios con filtros
router.get("/users", allowRoles("SUPERADMIN", "GESTOR"), adminController.getUsers);

// GET /api/admin/conductores-gestores - Listar conductores y gestores
router.get("/conductores-gestores", allowRoles("SUPERADMIN", "GESTOR"), adminController.getConductoresYGestionadores);

// DELETE /api/admin/users/:idUsuario - Eliminar usuario
router.delete("/users/:idUsuario", allowRoles("SUPERADMIN"), adminController.eliminarUsuario);

// PUT /api/admin/users/:idUsuario/role - Actualizar rol de usuario
router.put("/users/:idUsuario/role", allowRoles("SUPERADMIN"), adminController.actualizarRolUsuario);

// ================================
// GESTIÓN DE ROLES Y PERMISOS
// ================================

// GET /api/admin/roles - Obtener todos los roles
router.get("/roles", allowRoles("SUPERADMIN"), adminController.getRoles);

// POST /api/admin/roles - Crear nuevo rol
router.post("/roles", allowRoles("SUPERADMIN"), adminController.createRole);

// PUT /api/admin/roles/:id - Actualizar rol
router.put("/roles/:id", allowRoles("SUPERADMIN"), adminController.updateRole);

// DELETE /api/admin/roles/:id - Eliminar rol
router.delete("/roles/:id", allowRoles("SUPERADMIN"), adminController.deleteRole);

// ================================
// ESTADÍSTICAS Y REPORTES
// ================================

// GET /api/admin/stats - Estadísticas generales
router.get("/stats", allowRoles("SUPERADMIN", "GESTOR"), adminController.getStats);

// GET /api/admin/stats/users - Estadísticas de usuarios
router.get("/stats/users", allowRoles("SUPERADMIN", "GESTOR"), adminController.getUserStats);

// GET /api/admin/stats/system - Estadísticas de sistema
router.get("/stats/system", allowRoles("SUPERADMIN", "GESTOR"), adminController.getSystemStats);

// ================================
// CONFIGURACIÓN DEL SISTEMA
// ================================

// GET /api/admin/config - Obtener configuración del sistema
router.get("/config", allowRoles("SUPERADMIN"), adminController.getSystemConfig);

// PUT /api/admin/config - Actualizar configuración del sistema
router.put("/config", allowRoles("SUPERADMIN"), adminController.updateSystemConfig);

// ================================
// AUDITORÍA Y LOGS
// ================================

// GET /api/admin/logs - Obtener logs del sistema
router.get("/logs", allowRoles("SUPERADMIN"), adminController.getSystemLogs);

// GET /api/admin/audit - Obtener logs de auditoría
router.get("/audit", allowRoles("SUPERADMIN"), adminController.getAuditLogs);

// ================================
// UTILIDADES
// ================================

// GET /api/admin/access-check - Verificar permisos de administrador
router.get("/access-check", allowRoles("SUPERADMIN", "GESTOR"), adminController.checkAdminAccess);

// GET /api/admin/health - Health check del sistema de administración
router.get("/health", adminController.healthCheck);

module.exports = router;