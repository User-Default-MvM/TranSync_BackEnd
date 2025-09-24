// src/routes/conductoresRoutes.js
const express = require('express');
const router = express.Router();
const conductoresController = require('../controllers/conductoresController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

// Middleware de autenticación para todas las rutas
router.use(authMiddleware, allowRoles('SUPERADMIN', 'GESTOR'));

router.get("/", conductoresController.listarConductores);
router.get("/disponibles", conductoresController.getConductoresDisponibles);
router.post("/", conductoresController.crearConductor);
router.put("/:idConductor", conductoresController.actualizarConductor);
router.delete("/:idConductor", conductoresController.eliminarConductor);



// // Obtener estadísticas de conductores (ADMIN y SUPERADMIN)
// router.get('/estadisticas', 
//     allowRoles('ADMINISTRADOR', 'SUPERADMIN'), 
//     conductoresController.getEstadisticasConductores
// );

// // Verificar vencimiento de licencias (ADMIN y SUPERADMIN)
// router.get('/licencias/vencimiento', 
//     allowRoles('ADMINISTRADOR', 'SUPERADMIN'), 
//     conductoresController.verificarVencimientoLicencias
// );

// Obtener todos los conductores (ADMIN y SUPERADMIN)
// router.get('/', 
//     allowRoles('ADMINISTRADOR', 'SUPERADMIN'), 
//     conductoresController.getConductores
// );

// Crear nuevo conductor (ADMIN y SUPERADMIN)
// router.post('/', 
//     allowRoles('ADMINISTRADOR', 'SUPERADMIN'), 
//     conductoresController.crearConductor
// );

// // Generic parametrized routes should come AFTER specific routes
// // Obtener conductor por ID (ADMIN y SUPERADMIN)
// router.get('/:id', 
//     allowRoles('ADMINISTRADOR', 'SUPERADMIN'), 
//     conductoresController.getConductorById
// );

// // Actualizar conductor (ADMIN y SUPERADMIN)
// router.put('/:id', 
//     allowRoles('ADMINISTRADOR', 'SUPERADMIN'), 
//     conductoresController.actualizarConductor
// );

// // Eliminar conductor (solo SUPERADMIN)
// router.delete('/:id', 
//     allowRoles('SUPERADMIN'), 
//     conductoresController.eliminarConductor
// );

// // Cambiar estado de conductor (ADMIN y SUPERADMIN)
// router.patch('/:id/estado', 
//     allowRoles('ADMINISTRADOR', 'SUPERADMIN'), 
//     conductoresController.cambiarEstadoConductor
// );

// // Asignar vehículo a conductor (ADMIN y SUPERADMIN)
// router.patch('/:id/asignar-vehiculo', 
//     allowRoles('ADMINISTRADOR', 'SUPERADMIN'), 
//     conductoresController.asignarVehiculoConductor
// );

// // Desasignar vehículo de conductor (ADMIN y SUPERADMIN)
// router.patch('/:id/desasignar-vehiculo', 
//     allowRoles('ADMINISTRADOR', 'SUPERADMIN'), 
//     conductoresController.desasignarVehiculoConductor
// );

module.exports = router;
