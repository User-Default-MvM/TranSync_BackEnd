// src/routes/vehiculosRoutes.js
const express = require('express');
const router = express.Router();
const vehiculosController = require('../controllers/vehiculosController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// === Utils (Selects) ===
router.get('/utils/select', vehiculosController.getVehiculosSelect);

// IMPORTANT: Specific routes must come BEFORE generic parametrized routes

// Obtener estadísticas de vehículos (ADMIN y SUPERADMIN)
router.get('/estadisticas', 
    allowRoles('GESTOR', 'SUPERADMIN'), 
    vehiculosController.getEstadisticasVehiculos
);

// Verificar vencimientos de documentos (ADMIN y SUPERADMIN)
router.get('/vencimientos', 
    allowRoles('GESTOR', 'SUPERADMIN'), 
    vehiculosController.verificarVencimientosVehiculos
);

// Obtener todos los vehículos (ADMIN y SUPERADMIN)
router.get('/', 
    allowRoles('GESTOR', 'SUPERADMIN'), 
    vehiculosController.getVehiculos
);

// Crear nuevo vehículo (ADMIN y SUPERADMIN)
router.post('/', 
    allowRoles('GESTOR', 'SUPERADMIN'), 
    vehiculosController.crearVehiculo
);

// Generic parametrized routes should come AFTER specific routes
// Obtener vehículo por ID (ADMIN y SUPERADMIN)
router.get('/:id', 
    allowRoles('GESTOR', 'SUPERADMIN'), 
    vehiculosController.getVehiculoById
);

// Actualizar vehículo (ADMIN y SUPERADMIN)
router.put('/:id', 
    allowRoles('GESTOR', 'SUPERADMIN'), 
    vehiculosController.actualizarVehiculo
);

// Eliminar vehículo (solo SUPERADMIN)
router.delete('/:id', 
    allowRoles('SUPERADMIN'), 
    vehiculosController.eliminarVehiculo
);

// Cambiar estado de vehículo (ADMIN y SUPERADMIN)
router.patch('/:id/estado', 
    allowRoles('GESTOR', 'SUPERADMIN'), 
    vehiculosController.cambiarEstadoVehiculo
);

// Asignar conductor a vehículo (ADMIN y SUPERADMIN)
router.patch('/:id/asignar-conductor', 
    allowRoles('GESTOR', 'SUPERADMIN'), 
    vehiculosController.asignarConductorVehiculo
);

// Desasignar conductor de vehículo (ADMIN y SUPERADMIN)
router.patch('/:id/desasignar-conductor', 
    allowRoles('GESTOR', 'SUPERADMIN'), 
    vehiculosController.desasignarConductorVehiculo
);

module.exports = router;
