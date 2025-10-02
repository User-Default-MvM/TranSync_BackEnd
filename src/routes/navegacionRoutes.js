// src/routes/navegacionRoutes.js

const express = require('express');
const router = express.Router();
const NavegacionController = require('../controllers/navegacionController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Rutas para sistema avanzado de navegación y rutas estilo Waze
 */

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Aplicar permisos específicos para navegación (CONDUCTOR puede consultar horarios y navegación)

/**
 * @route POST /api/navegacion/ruta
 * @desc Calcular ruta óptima entre dos puntos
 * @access Private
 * @body {object} origen - Coordenadas de origen {latitud, longitud}
 * @body {object} destino - Coordenadas de destino {latitud, longitud}
 * @body {string} modo - Modo de ruta ('rapido', 'corto', 'ecologico') (opcional, default: 'rapido')
 * @body {boolean} evitarPeajes - Evitar rutas con peajes (opcional, default: false)
 * @body {boolean} evitarTrafico - Considerar información de tráfico (opcional, default: true)
 * @body {string} horaSalida - Hora de salida en ISO string (opcional)
 */
router.post('/ruta', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), NavegacionController.calcularRuta);

/**
 * @route GET /api/navegacion/rutas/:id/eta
 * @desc Calcular tiempo estimado de llegada para una ruta específica
 * @access Private
 * @param {number} id - ID de la ruta
 * @query {number} lat - Latitud actual del usuario
 * @query {number} lng - Longitud actual del usuario
 * @query {boolean} considerarTrafico - Considerar información de tráfico (opcional, default: true)
 */
router.get('/rutas/:id/eta', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), NavegacionController.calcularETA);

/**
 * @route POST /api/navegacion/rutas/uso
 * @desc Registrar uso de ruta para analytics
 * @access Private
 * @body {number} idRuta - ID de la ruta utilizada
 * @body {object} ubicacionUsuario - Ubicación del usuario {latitud, longitud}
 * @body {number} tiempoReal - Tiempo real empleado en minutos (opcional)
 * @body {number} calificacion - Calificación del viaje (1-5) (opcional)
 * @body {string} comentarios - Comentarios del usuario (opcional)
 */
router.post('/rutas/uso', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), NavegacionController.registrarUsoRuta);

/**
 * @route GET /api/navegacion/rutas/alternativas
 * @desc Encontrar rutas alternativas
 * @access Private
 * @query {string} origen - Coordenadas de origen 'lat,lng'
 * @query {string} destino - Coordenadas de destino 'lat,lng'
 * @query {number} excluirRutaId - ID de ruta a excluir (opcional)
 */
router.get('/rutas/alternativas', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), NavegacionController.obtenerRutasAlternativas);

/**
 * @route GET /api/navegacion/rutas/:id/trafico
 * @desc Información de tráfico en tiempo real para una ruta
 * @access Private
 * @param {number} id - ID de la ruta
 */
router.get('/rutas/:id/trafico', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), NavegacionController.obtenerInfoTrafico);

/**
 * @route POST /api/navegacion/ruta/multi-stop
 * @desc Calcular ruta con múltiples destinos
 * @access Private
 * @body {array} destinos - Array de destinos con coordenadas
 * @body {string} modo - Modo de ruta ('rapido', 'corto', 'ecologico') (opcional, default: 'rapido')
 * @body {boolean} evitarPeajes - Evitar rutas con peajes (opcional, default: false)
 * @body {boolean} evitarTrafico - Considerar información de tráfico (opcional, default: true)
 */
router.post('/ruta/multi-stop', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), NavegacionController.calcularRutaMultiStop);

/**
 * @route GET /api/navegacion/rutas/cercanas-optimizadas
 * @desc Obtener rutas cercanas con paradas optimizadas
 * @access Private
 * @query {number} lat - Latitud actual del usuario
 * @query {number} lng - Longitud actual del usuario
 * @query {number} radio - Radio de búsqueda en km (opcional, default: 5)
 * @query {number} destinoLat - Latitud del destino (opcional)
 * @query {number} destinoLng - Longitud del destino (opcional)
 */
router.get('/rutas/cercanas-optimizadas', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), NavegacionController.obtenerRutasCercanasOptimizadas);

/**
 * @route GET /api/navegacion/estimacion-tiempo
 * @desc Obtener estimación de tiempo entre dos puntos
 * @access Private
 * @query {number} origenLat - Latitud de origen
 * @query {number} origenLng - Longitud de origen
 * @query {number} destinoLat - Latitud de destino
 * @query {number} destinoLng - Longitud de destino
 * @query {number} velocidadKmh - Velocidad promedio en km/h (opcional, default: 35)
 */
router.get('/estimacion-tiempo', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), NavegacionController.obtenerEstimacionTiempo);

/**
 * @route GET /api/navegacion/rutas/:id/paradas-optimizadas
 * @desc Obtener paradas de ruta ordenadas por distancia desde ubicación usuario
 * @access Private
 * @param {number} id - ID de la ruta
 * @query {number} lat - Latitud actual del usuario
 * @query {number} lng - Longitud actual del usuario
 */
router.get('/rutas/:id/paradas-optimizadas', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), NavegacionController.obtenerParadasOptimizadas);

module.exports = router;