// src/routes/analyticsRoutes.js

const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Rutas para analytics y métricas avanzadas
 */

// Todas las rutas requieren autenticación
router.use(authMiddleware);

/**
 * @route GET /api/analytics/rutas/populares
 * @desc Obtener rutas más utilizadas por período de tiempo
 * @access Private
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 * @query {number} limite - Límite de resultados (opcional, default: 10)
 */
router.get('/rutas/populares', AnalyticsController.obtenerRutasPopulares);

/**
 * @route GET /api/analytics/rutas/rendimiento
 * @desc Obtener métricas de rendimiento de rutas
 * @access Private
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 */
router.get('/rutas/rendimiento', AnalyticsController.obtenerRendimientoRutas);

/**
 * @route GET /api/analytics/usuarios/patrones
 * @desc Obtener patrones de uso de transporte público por usuario
 * @access Private
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 */
router.get('/usuarios/patrones', AnalyticsController.obtenerPatronesUsuario);

/**
 * @route GET /api/analytics/usuarios/:id/metricas
 * @desc Obtener métricas específicas de un usuario
 * @access Private (Solo propias o admin)
 * @param {number} id - ID del usuario
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 */
router.get('/usuarios/:id/metricas', AnalyticsController.obtenerMetricasUsuario);

/**
 * @route GET /api/analytics/periodo
 * @desc Obtener estadísticas por período de tiempo
 * @access Private
 * @query {string} periodo - Período de agrupación (hora, dia, semana, mes) (opcional, default: dia)
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 */
router.get('/periodo', AnalyticsController.obtenerEstadisticasPorPeriodo);

/**
 * @route GET /api/analytics/congestion
 * @desc Obtener puntos de congestión recurrentes
 * @access Private
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 */
router.get('/congestion', AnalyticsController.obtenerPuntosCongestion);

/**
 * @route GET /api/analytics/calificaciones
 * @desc Obtener análisis de calificaciones
 * @access Private
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 */
router.get('/calificaciones', AnalyticsController.obtenerAnalisisCalificaciones);

/**
 * @route POST /api/analytics/viaje
 * @desc Registrar viaje completo para analytics
 * @access Private
 * @body {number} idRuta - ID de la ruta utilizada
 * @body {object} origenUbicacion - Ubicación de origen {lat, lng}
 * @body {object} destinoUbicacion - Ubicación de destino {lat, lng}
 * @body {number} distanciaRealKm - Distancia real en km (opcional)
 * @body {number} tiempoRealMin - Tiempo real en minutos (opcional)
 * @body {number} tiempoEstimadoMin - Tiempo estimado en minutos (opcional)
 * @body {number} calificacionViaje - Calificación del viaje (1-5) (opcional)
 * @body {string} comentarios - Comentarios del usuario (opcional)
 */
router.post('/viaje', AnalyticsController.registrarViaje);

/**
 * @route GET /api/analytics/dashboard
 * @desc Obtener datos para dashboard de analytics
 * @access Private
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 */
router.get('/dashboard', AnalyticsController.obtenerDatosDashboard);

/**
 * @route GET /api/analytics/exportar
 * @desc Exportar datos de analytics (CSV o JSON)
 * @access Private
 * @query {string} tipo - Tipo de datos (rutas-populares, rendimiento, congestion, calificaciones)
 * @query {string} formato - Formato de exportación (json, csv) (opcional, default: json)
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 */
router.get('/exportar', AnalyticsController.exportarDatos);

/**
 * @route GET /api/analytics/usuarios/activos
 * @desc Obtener usuarios más activos
 * @access Private
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 * @query {number} limite - Límite de resultados (opcional, default: 10)
 */
router.get('/usuarios/activos', AnalyticsController.obtenerUsuariosActivos);

module.exports = router;