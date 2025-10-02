// src/routes/notificacionRoutes.js

const express = require('express');
const router = express.Router();
const NotificacionController = require('../controllers/notificacionController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

/**
 * Rutas para sistema de notificaciones en tiempo real
 */

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Aplicar permisos específicos para notificaciones (CONDUCTOR puede consultar notificaciones que le afecten)

/**
 * @route GET /api/notificaciones/rutas/activas
 * @desc Obtener todas las notificaciones activas
 * @access Private
 */
router.get('/rutas/activas', NotificacionController.obtenerNotificacionesActivas);

/**
 * @route GET /api/notificaciones/rutas/:id
 * @desc Obtener notificaciones específicas de una ruta
 * @access Private
 * @param {number} id - ID de la ruta
 */
router.get('/rutas/:id', NotificacionController.obtenerNotificacionesRuta);

/**
 * @route POST /api/notificaciones/ruta
 * @desc Crear notificación para usuarios de una ruta
 * @access Private (Solo gestores y administradores)
 * @body {number} idRuta - ID de la ruta
 * @body {string} tipoNotificacion - Tipo: TRAFICO, DEMORA, DESVIO, EMERGENCIA
 * @body {string} titulo - Título de la notificación
 * @body {string} mensaje - Mensaje de la notificación
 * @body {string} prioridad - Prioridad: BAJA, NORMAL, ALTA, CRITICA (opcional, default: NORMAL)
 * @body {object} ubicacionAfectada - Coordenadas del área afectada (opcional)
 * @body {string} tiempoInicio - Fecha/hora de inicio (opcional)
 * @body {string} tiempoFin - Fecha/hora de fin (opcional)
 */
router.post('/ruta', NotificacionController.crearNotificacionRuta);

/**
 * @route PUT /api/notificaciones/:id
 * @desc Actualizar notificación
 * @access Private (Solo gestores y administradores)
 * @param {number} id - ID de la notificación
 * @body {string} titulo - Nuevo título (opcional)
 * @body {string} mensaje - Nuevo mensaje (opcional)
 * @body {string} prioridad - Nueva prioridad (opcional)
 * @body {object} ubicacionAfectada - Nueva ubicación afectada (opcional)
 * @body {string} tiempoInicio - Nueva fecha/hora de inicio (opcional)
 * @body {string} tiempoFin - Nueva fecha/hora de fin (opcional)
 * @body {boolean} activa - Estado activo/inactivo (opcional)
 */
router.put('/:id', NotificacionController.actualizarNotificacion);

/**
 * @route DELETE /api/notificaciones/:id
 * @desc Desactivar notificación
 * @access Private (Solo gestores y administradores)
 * @param {number} id - ID de la notificación
 */
router.delete('/:id', NotificacionController.desactivarNotificacion);

/**
 * @route GET /api/notificaciones/tipos/:tipo
 * @desc Obtener notificaciones por tipo
 * @access Private
 * @param {string} tipo - Tipo de notificación (TRAFICO, DEMORA, DESVIO, EMERGENCIA)
 * @query {boolean} activas - Solo notificaciones activas (opcional, default: true)
 */
router.get('/tipos/:tipo', NotificacionController.obtenerNotificacionesPorTipo);

/**
 * @route GET /api/notificaciones/prioridad/:prioridad
 * @desc Obtener notificaciones por prioridad
 * @access Private
 * @param {string} prioridad - Nivel de prioridad (BAJA, NORMAL, ALTA, CRITICA)
 * @query {boolean} activas - Solo notificaciones activas (opcional, default: true)
 */
router.get('/prioridad/:prioridad', NotificacionController.obtenerNotificacionesPorPrioridad);

/**
 * @route GET /api/notificaciones/estadisticas
 * @desc Obtener estadísticas de notificaciones
 * @access Private
 * @query {string} fechaDesde - Fecha desde (YYYY-MM-DD) (opcional)
 * @query {string} fechaHasta - Fecha hasta (YYYY-MM-DD) (opcional)
 */
router.get('/estadisticas', NotificacionController.obtenerEstadisticasNotificaciones);

/**
 * @route GET /api/notificaciones/area
 * @desc Obtener notificaciones en área geográfica
 * @access Private
 * @query {number} lat - Latitud del centro del área
 * @query {number} lng - Longitud del centro del área
 * @query {number} radio - Radio en km (opcional, default: 10)
 */
router.get('/area', NotificacionController.obtenerNotificacionesEnArea);

/**
 * @route POST /api/notificaciones/emergencia
 * @desc Crear notificación de emergencia (acceso especial)
 * @access Private (Solo administradores)
 * @body {string} titulo - Título de la emergencia
 * @body {string} mensaje - Mensaje de emergencia
 * @body {object} ubicacionAfectada - Coordenadas del área afectada (opcional)
 * @body {string} tiempoInicio - Fecha/hora de inicio (opcional)
 * @body {string} tiempoFin - Fecha/hora de fin (opcional)
 */
router.post('/emergencia', NotificacionController.crearNotificacionEmergencia);

module.exports = router;