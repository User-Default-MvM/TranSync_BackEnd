// src/routes/ubicacionRoutes.js

const express = require('express');
const router = express.Router();
const UbicacionController = require('../controllers/ubicacionController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

/**
 * Rutas para gestión avanzada de ubicación y geolocalización
 */

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Aplicar permisos específicos para ubicación (CONDUCTOR necesita acceso para navegación)

/**
 * @route POST /api/ubicacion/usuario
 * @desc Recibir y almacenar ubicación del usuario
 * @access Private
 * @body {number} latitud - Latitud de la ubicación
 * @body {number} longitud - Longitud de la ubicación
 * @body {number} precisionMetros - Precisión en metros (opcional)
 * @body {number} velocidadKmh - Velocidad en km/h (opcional)
 * @body {number} rumboGrados - Rumbo en grados (opcional)
 * @body {string} fuenteUbicacion - Fuente de la ubicación (opcional, default: 'GPS')
 * @body {object} dispositivoInfo - Información del dispositivo (opcional)
 */
router.post('/usuario', UbicacionController.registrarUbicacion);

/**
 * @route GET /api/ubicacion/usuario/historial
 * @desc Obtener historial de ubicaciones del usuario
 * @access Private
 * @query {number} limite - Límite de resultados (opcional, default: 100)
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 */
router.get('/usuario/historial', UbicacionController.obtenerHistorial);

/**
 * @route PUT /api/ubicacion/usuario
 * @desc Actualizar ubicación del usuario
 * @access Private
 * @body {number} latitud - Nueva latitud
 * @body {number} longitud - Nueva longitud
 * @body {number} precisionMetros - Nueva precisión (opcional)
 * @body {number} velocidadKmh - Nueva velocidad (opcional)
 * @body {number} rumboGrados - Nuevo rumbo (opcional)
 * @body {string} fuenteUbicacion - Nueva fuente (opcional)
 * @body {object} dispositivoInfo - Nueva información del dispositivo (opcional)
 */
router.put('/usuario', UbicacionController.actualizarUbicacion);

/**
 * @route GET /api/rutas/cerca
 * @desc Obtener rutas cercanas a ubicación del usuario
 * @access Private
 * @query {number} lat - Latitud del punto de búsqueda
 * @query {number} lng - Longitud del punto de búsqueda
 * @query {number} radio - Radio de búsqueda en km (opcional, default: 5)
 */
router.get('/rutas/cerca', UbicacionController.obtenerRutasCercanas);

/**
 * @route GET /api/paradas/cercanas
 * @desc Buscar paradas cercanas a coordenadas específicas
 * @access Private
 * @query {number} lat - Latitud del punto de búsqueda
 * @query {number} lng - Longitud del punto de búsqueda
 * @query {number} radio - Radio de búsqueda en km (opcional, default: 2)
 * @query {string} tipos - Tipos de puntos separados por coma (opcional, default: 'TERMINAL,ESTACION,PARADERO')
 */
router.get('/paradas/cercanas', UbicacionController.obtenerParadasCercanas);

/**
 * @route GET /api/ubicacion/info
 * @desc Obtener información enriquecida de ubicación
 * @access Private
 * @query {number} lat - Latitud
 * @query {number} lng - Longitud
 */
router.get('/info', UbicacionController.obtenerInfoUbicacion);

/**
 * @route GET /api/ubicacion/usuarios/cercanos
 * @desc Obtener usuarios cercanos (solo administradores)
 * @access Private (Solo administradores)
 * @query {number} lat - Latitud del punto de búsqueda
 * @query {number} lng - Longitud del punto de búsqueda
 * @query {number} radio - Radio de búsqueda en km (opcional, default: 5)
 */
router.get('/usuarios/cercanos', UbicacionController.obtenerUsuariosCercanos);

/**
 * @route GET /api/ubicacion/estadisticas
 * @desc Obtener estadísticas de ubicaciones del usuario
 * @access Private
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 */
router.get('/estadisticas', UbicacionController.obtenerEstadisticasUbicacion);

/**
 * @route POST /api/ubicacion/validar
 * @desc Validar coordenadas GPS
 * @access Private
 * @body {number} latitud - Latitud a validar
 * @body {number} longitud - Longitud a validar
 */
router.post('/validar', UbicacionController.validarCoordenadas);

module.exports = router;