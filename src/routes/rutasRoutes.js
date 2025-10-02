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

// ✅ Obtener paradas de una ruta específica
router.get('/:id/paradas', rutasController.getParadasRuta);

// === CRUD de rutas ===
// Obtener todas las rutas (SUPERADMIN, GESTOR y CONDUCTOR - solo lectura para conductor)
router.get('/', allowRoles('SUPERADMIN', 'GESTOR', 'CONDUCTOR'), rutasController.getRutas);

// Crear una nueva ruta (solo SUPERADMIN y GESTOR)
router.post('/', allowRoles('SUPERADMIN', 'GESTOR'), rutasController.crearRuta);

// Actualizar ruta (solo SUPERADMIN y GESTOR)
router.put('/:id', allowRoles('SUPERADMIN', 'GESTOR'), rutasController.actualizarRuta);

// Eliminar ruta (solo SUPERADMIN)
router.delete('/:id', allowRoles('SUPERADMIN'), rutasController.eliminarRuta);

module.exports = router;
