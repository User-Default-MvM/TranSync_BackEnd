// src/controllers/notificacionController.js

const NotificacionRuta = require('../models/NotificacionRuta');

/**
 * Controlador para sistema de notificaciones en tiempo real
 */
class NotificacionController {

    /**
     * GET /api/notificaciones/rutas/activas
     * Obtener todas las notificaciones activas
     */
    static async obtenerNotificacionesActivas(req, res) {
        try {
            const notificaciones = await NotificacionRuta.obtenerTodasActivas();

            res.json({
                notificaciones,
                total: notificaciones.length,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo notificaciones activas:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/notificaciones/rutas/{id}
     * Obtener notificaciones específicas de una ruta
     */
    static async obtenerNotificacionesRuta(req, res) {
        try {
            const { id } = req.params; // idRuta

            const notificaciones = await NotificacionRuta.obtenerActivasPorRuta(parseInt(id));

            res.json({
                ruta: {
                    idRuta: parseInt(id)
                },
                notificaciones,
                total: notificaciones.length,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo notificaciones de ruta:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * POST /api/notificaciones/ruta
     * Crear notificación para usuarios de una ruta
     */
    static async crearNotificacionRuta(req, res) {
        try {
            const { idUsuario } = req.usuario;

            // Verificar permisos (solo gestores y admins pueden crear notificaciones)
            if (req.usuario.idRol !== 1 && req.usuario.idRol !== 2) {
                return res.status(403).json({
                    error: 'Acceso denegado. Se requieren permisos de gestor o administrador.'
                });
            }

            const {
                idRuta,
                tipoNotificacion,
                titulo,
                mensaje,
                prioridad = 'NORMAL',
                ubicacionAfectada,
                tiempoInicio,
                tiempoFin
            } = req.body;

            // Validaciones básicas
            if (!idRuta || !tipoNotificacion || !titulo || !mensaje) {
                return res.status(400).json({
                    error: 'ID de ruta, tipo, título y mensaje son requeridos'
                });
            }

            // Validar tipo de notificación
            const tiposValidos = ['TRAFICO', 'DEMORA', 'DESVIO', 'EMERGENCIA'];
            if (!tiposValidos.includes(tipoNotificacion)) {
                return res.status(400).json({
                    error: `Tipo de notificación inválido. Valores permitidos: ${tiposValidos.join(', ')}`
                });
            }

            // Validar prioridad
            const prioridadesValidas = ['BAJA', 'NORMAL', 'ALTA', 'CRITICA'];
            if (!prioridadesValidas.includes(prioridad)) {
                return res.status(400).json({
                    error: `Prioridad inválida. Valores permitidos: ${prioridadesValidas.join(', ')}`
                });
            }

            // Crear notificación
            const idNotificacion = await NotificacionRuta.crear({
                idRuta,
                tipoNotificacion,
                titulo,
                mensaje,
                prioridad,
                ubicacionAfectada,
                tiempoInicio: tiempoInicio ? new Date(tiempoInicio) : null,
                tiempoFin: tiempoFin ? new Date(tiempoFin) : null
            });

            // Emitir notificación en tiempo real via WebSocket
            await this.emitirNotificacionWebSocket(idNotificacion, {
                idRuta,
                tipoNotificacion,
                titulo,
                mensaje,
                prioridad,
                ubicacionAfectada,
                tiempoInicio,
                tiempoFin
            });

            res.status(201).json({
                mensaje: 'Notificación creada exitosamente',
                idNotificacion,
                timestamp: new Date().toISOString(),
                creadaPor: idUsuario
            });

        } catch (error) {
            console.error('Error creando notificación de ruta:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * PUT /api/notificaciones/{id}
     * Actualizar notificación
     */
    static async actualizarNotificacion(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const { id } = req.params; // idNotificacion

            // Verificar permisos
            if (req.usuario.idRol !== 1 && req.usuario.idRol !== 2) {
                return res.status(403).json({
                    error: 'Acceso denegado. Se requieren permisos de gestor o administrador.'
                });
            }

            const {
                titulo,
                mensaje,
                prioridad,
                ubicacionAfectada,
                tiempoInicio,
                tiempoFin,
                activa
            } = req.body;

            const actualizacion = {};
            if (titulo !== undefined) actualizacion.titulo = titulo;
            if (mensaje !== undefined) actualizacion.mensaje = mensaje;
            if (prioridad !== undefined) actualizacion.prioridad = prioridad;
            if (ubicacionAfectada !== undefined) actualizacion.ubicacionAfectada = ubicacionAfectada;
            if (tiempoInicio !== undefined) actualizacion.tiempoInicio = tiempoInicio ? new Date(tiempoInicio) : null;
            if (tiempoFin !== undefined) actualizacion.tiempoFin = tiempoFin ? new Date(tiempoFin) : null;
            if (activa !== undefined) actualizacion.activa = activa;

            const exito = await NotificacionRuta.actualizar(parseInt(id), actualizacion);

            if (exito) {
                res.json({
                    mensaje: 'Notificación actualizada exitosamente',
                    idNotificacion: parseInt(id),
                    timestamp: new Date().toISOString(),
                    actualizadaPor: idUsuario
                });
            } else {
                res.status(404).json({
                    error: 'Notificación no encontrada'
                });
            }

        } catch (error) {
            console.error('Error actualizando notificación:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * DELETE /api/notificaciones/{id}
     * Desactivar notificación
     */
    static async desactivarNotificacion(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const { id } = req.params; // idNotificacion

            // Verificar permisos
            if (req.usuario.idRol !== 1 && req.usuario.idRol !== 2) {
                return res.status(403).json({
                    error: 'Acceso denegado. Se requieren permisos de gestor o administrador.'
                });
            }

            const exito = await NotificacionRuta.desactivar(parseInt(id));

            if (exito) {
                res.json({
                    mensaje: 'Notificación desactivada exitosamente',
                    idNotificacion: parseInt(id),
                    timestamp: new Date().toISOString(),
                    desactivadaPor: idUsuario
                });
            } else {
                res.status(404).json({
                    error: 'Notificación no encontrada'
                });
            }

        } catch (error) {
            console.error('Error desactivando notificación:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/notificaciones/tipos/{tipo}
     * Obtener notificaciones por tipo
     */
    static async obtenerNotificacionesPorTipo(req, res) {
        try {
            const { tipo } = req.params;
            const { activas = true } = req.query;

            // Validar tipo
            const tiposValidos = ['TRAFICO', 'DEMORA', 'DESVIO', 'EMERGENCIA'];
            if (!tiposValidos.includes(tipo)) {
                return res.status(400).json({
                    error: `Tipo de notificación inválido. Valores permitidos: ${tiposValidos.join(', ')}`
                });
            }

            const notificaciones = await NotificacionRuta.obtenerPorTipo(tipo, activas === 'true');

            res.json({
                tipo,
                activas: activas === 'true',
                notificaciones,
                total: notificaciones.length,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo notificaciones por tipo:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/notificaciones/prioridad/{prioridad}
     * Obtener notificaciones por prioridad
     */
    static async obtenerNotificacionesPorPrioridad(req, res) {
        try {
            const { prioridad } = req.params;
            const { activas = true } = req.query;

            // Validar prioridad
            const prioridadesValidas = ['BAJA', 'NORMAL', 'ALTA', 'CRITICA'];
            if (!prioridadesValidas.includes(prioridad)) {
                return res.status(400).json({
                    error: `Prioridad inválida. Valores permitidos: ${prioridadesValidas.join(', ')}`
                });
            }

            const notificaciones = await NotificacionRuta.obtenerPorPrioridad(prioridad, activas === 'true');

            res.json({
                prioridad,
                activas: activas === 'true',
                notificaciones,
                total: notificaciones.length,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo notificaciones por prioridad:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/notificaciones/estadisticas
     * Obtener estadísticas de notificaciones
     */
    static async obtenerEstadisticasNotificaciones(req, res) {
        try {
            const { fechaDesde, fechaHasta } = req.query;

            const estadisticas = await NotificacionRuta.obtenerEstadisticas(fechaDesde, fechaHasta);

            res.json({
                estadisticas,
                periodo: {
                    fechaDesde,
                    fechaHasta
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas de notificaciones:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/notificaciones/area
     * Obtener notificaciones en área geográfica
     */
    static async obtenerNotificacionesEnArea(req, res) {
        try {
            const { lat, lng, radio = 10 } = req.query;

            // Validaciones básicas
            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Coordenadas (lat, lng) son requeridas'
                });
            }

            const notificaciones = await NotificacionRuta.obtenerEnArea(
                parseFloat(lat),
                parseFloat(lng),
                parseFloat(radio)
            );

            res.json({
                ubicacion: {
                    latitud: parseFloat(lat),
                    longitud: parseFloat(lng),
                    radio: parseFloat(radio)
                },
                notificaciones,
                total: notificaciones.length,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo notificaciones en área:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * POST /api/notificaciones/emergencia
     * Crear notificación de emergencia (acceso especial)
     */
    static async crearNotificacionEmergencia(req, res) {
        try {
            const { idUsuario } = req.usuario;

            // Verificar permisos especiales para emergencias
            if (req.usuario.idRol !== 1) {
                return res.status(403).json({
                    error: 'Acceso denegado. Solo administradores pueden crear notificaciones de emergencia.'
                });
            }

            const {
                titulo,
                mensaje,
                ubicacionAfectada,
                tiempoInicio,
                tiempoFin
            } = req.body;

            // Validaciones básicas
            if (!titulo || !mensaje) {
                return res.status(400).json({
                    error: 'Título y mensaje son requeridos para notificaciones de emergencia'
                });
            }

            // Crear múltiples notificaciones para todas las rutas afectadas
            const pool = require('../config/db');
            const [rutas] = await pool.query(`
                SELECT idRuta FROM Rutas WHERE estRuta = 'ACTIVA'
            `);

            const notificacionesCreadas = [];

            for (const ruta of rutas) {
                const idNotificacion = await NotificacionRuta.crear({
                    idRuta: ruta.idRuta,
                    tipoNotificacion: 'EMERGENCIA',
                    titulo,
                    mensaje,
                    prioridad: 'CRITICA',
                    ubicacionAfectada,
                    tiempoInicio: tiempoInicio ? new Date(tiempoInicio) : new Date(),
                    tiempoFin: tiempoFin ? new Date(tiempoFin) : null
                });

                notificacionesCreadas.push({
                    idRuta: ruta.idRuta,
                    idNotificacion
                });
            }

            // Emitir notificaciones de emergencia
            await this.emitirNotificacionEmergenciaWebSocket({
                titulo,
                mensaje,
                ubicacionAfectada,
                notificacionesCreadas
            });

            res.status(201).json({
                mensaje: 'Notificaciones de emergencia creadas exitosamente',
                notificacionesCreadas,
                totalRutasAfectadas: rutas.length,
                timestamp: new Date().toISOString(),
                creadaPor: idUsuario
            });

        } catch (error) {
            console.error('Error creando notificación de emergencia:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * Emitir notificación via WebSocket
     */
    static async emitirNotificacionWebSocket(idNotificacion, datosNotificacion) {
        try {
            // Aquí se integraría con el servicio de WebSocket existente
            // Por ahora solo logueamos
            console.log('📢 Emitiendo notificación WebSocket:', {
                idNotificacion,
                tipo: datosNotificacion.tipoNotificacion,
                prioridad: datosNotificacion.prioridad,
                titulo: datosNotificacion.titulo,
                ruta: datosNotificacion.idRuta
            });

            // En producción esto emitiría a través de Socket.IO
            // io.to(`ruta_${datosNotificacion.idRuta}`).emit('nueva_notificacion', datosNotificacion);

        } catch (error) {
            console.error('Error emitiendo notificación WebSocket:', error);
        }
    }

    /**
     * Emitir notificación de emergencia via WebSocket
     */
    static async emitirNotificacionEmergenciaWebSocket(datosEmergencia) {
        try {
            console.log('🚨 Emitiendo notificación de emergencia WebSocket:', {
                titulo: datosEmergencia.titulo,
                totalRutas: datosEmergencia.notificacionesCreadas.length,
                timestamp: new Date().toISOString()
            });

            // En producción esto emitiría a través de Socket.IO a todos los usuarios conectados
            // io.emit('emergencia', datosEmergencia);

        } catch (error) {
            console.error('Error emitiendo notificación de emergencia WebSocket:', error);
        }
    }
}

module.exports = NotificacionController;