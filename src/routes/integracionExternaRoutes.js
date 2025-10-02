// src/routes/integracionExternaRoutes.js

const express = require('express');
const router = express.Router();
const IntegracionExternaController = require('../controllers/integracionExternaController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

/**
 * Rutas para integración con servicios externos
 */

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Aplicar permisos específicos para integración externa (CONDUCTOR necesita acceso para navegación)

/**
 * @route GET /api/integracion/geocoding
 * @desc Obtener coordenadas desde dirección (Geocoding)
 * @access Private
 * @query {string} direccion - Dirección a geocodificar
 */
router.get('/geocoding', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), IntegracionExternaController.geocoding);

/**
 * @route GET /api/integracion/reverse-geocoding
 * @desc Obtener dirección desde coordenadas (Reverse Geocoding)
 * @access Private
 * @query {number} lat - Latitud
 * @query {number} lng - Longitud
 */
router.get('/reverse-geocoding', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), IntegracionExternaController.reverseGeocoding);

/**
 * @route GET /api/integracion/clima
 * @desc Obtener condiciones climáticas actuales
 * @access Private
 * @query {number} lat - Latitud
 * @query {number} lng - Longitud
 */
router.get('/clima', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), IntegracionExternaController.obtenerClima);

/**
 * @route GET /api/integracion/pronostico
 * @desc Obtener pronóstico del clima
 * @access Private
 * @query {number} lat - Latitud
 * @query {number} lng - Longitud
 * @query {number} dias - Número de días (opcional, default: 5)
 */
router.get('/pronostico', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), IntegracionExternaController.obtenerPronostico);

/**
 * @route GET /api/integracion/lugares
 * @desc Buscar lugares cercanos usando Google Places API
 * @access Private
 * @query {number} lat - Latitud del centro de búsqueda
 * @query {number} lng - Longitud del centro de búsqueda
 * @query {string} tipo - Tipo de lugar (restaurant, gas_station, hospital, etc.)
 * @query {number} radio - Radio de búsqueda en metros (opcional, default: 1000)
 */
router.get('/lugares', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), IntegracionExternaController.buscarLugares);

/**
 * @route GET /api/integracion/lugares/:placeId
 * @desc Obtener detalles de un lugar específico
 * @access Private
 * @param {string} placeId - ID del lugar de Google Places
 */
router.get('/lugares/:placeId', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), IntegracionExternaController.obtenerDetallesLugar);

/**
 * @route GET /api/integracion/trafico
 * @desc Obtener información de tráfico
 * @access Private
 * @query {number} lat - Latitud
 * @query {number} lng - Longitud
 * @query {number} radio - Radio en km (opcional, default: 5)
 */
router.get('/trafico', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), IntegracionExternaController.obtenerInfoTrafico);

/**
 * @route GET /api/integracion/ubicacion-enriquecida
 * @desc Obtener información enriquecida de ubicación con datos externos
 * @access Private
 * @query {number} lat - Latitud
 * @query {number} lng - Longitud
 */
router.get('/ubicacion-enriquecida', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), IntegracionExternaController.obtenerUbicacionEnriquecida);

/**
 * @route GET /api/integracion/configuracion
 * @desc Obtener estado de configuración de APIs externas
 * @access Private
 */
router.get('/configuracion', allowRoles("SUPERADMIN", "GESTOR"), IntegracionExternaController.obtenerConfiguracion);

/**
 * @route POST /api/integracion/cache/limpiar
 * @desc Limpiar caché de APIs externas
 * @access Private
 */
router.post('/cache/limpiar', allowRoles("SUPERADMIN", "GESTOR"), IntegracionExternaController.limpiarCache);

/**
 * @route GET /api/integracion/tipos-lugares
 * @desc Obtener tipos de lugares disponibles
 * @access Private
 */
router.get('/tipos-lugares', allowRoles("SUPERADMIN", "GESTOR", "CONDUCTOR"), IntegracionExternaController.obtenerTiposLugares);

module.exports = router;