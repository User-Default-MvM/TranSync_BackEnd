// src/routes/rutasRoutes.js
const express = require('express');
const router = express.Router();
const rutasController = require('../controllers/rutasController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

// 🔒 Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// ✅ Ruta para SELECT (id + nombre)
router.get('/utils/select', rutasController.getRutasSelect);

// === CRUD de rutas ===
// Obtener todas las rutas
router.get('/', allowRoles('ADMINISTRADOR', 'SUPERADMIN'), rutasController.getRutas);

// Crear una nueva ruta
router.post('/', allowRoles('ADMINISTRADOR', 'SUPERADMIN'), rutasController.crearRuta);

// Actualizar ruta
router.put('/:id', allowRoles('ADMINISTRADOR', 'SUPERADMIN'), rutasController.actualizarRuta);

// Eliminar ruta (solo SUPERADMIN)
router.delete('/:id', allowRoles('SUPERADMIN'), rutasController.eliminarRuta);

module.exports = router;
