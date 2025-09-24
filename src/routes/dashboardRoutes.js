// src/routes/dashboardRoutes.js

const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

// Middleware de autenticación para todas las rutas dashboard
router.use(authMiddleware);

// ========================================
// RUTAS DEL DASHBOARD
// ========================================

// Estadísticas generales - Acceso para ADMINISTRADOR y SUPERADMIN
router.get("/estadisticas", 
    allowRoles("SUPERADMIN", "ADMINISTRADOR"), 
    dashboardController.getGeneralStatistics
);

// Datos para gráficos con filtro por período
router.get("/graficos", 
    allowRoles("SUPERADMIN", "ADMINISTRADOR"), 
    dashboardController.getChartsData
);

// Alertas activas del sistema
router.get("/alertas", 
    allowRoles("SUPERADMIN", "ADMINISTRADOR"), 
    dashboardController.getActiveAlerts
);

// Actividad reciente del sistema
router.get("/actividad", 
    allowRoles("SUPERADMIN", "ADMINISTRADOR"), 
    dashboardController.getRecentActivity
);

// Indicadores clave de rendimiento (KPIs)
router.get("/kpis", 
    allowRoles("SUPERADMIN", "ADMINISTRADOR"), 
    dashboardController.getKPIs
);

// Resumen ejecutivo por período
router.get("/resumen-ejecutivo", 
    allowRoles("SUPERADMIN", "ADMINISTRADOR"), 
    dashboardController.getExecutiveSummary
);

// Datos en tiempo real
router.get("/tiempo-real",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    dashboardController.getRealTimeData
);

// Control de actualizaciones automáticas del dashboard
router.post("/start-updates",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;

            if (!global.dashboardRealTimeService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardRealTimeService no está disponible'
                });
            }

            global.dashboardRealTimeService.startDashboardUpdates(idEmpresa);

            res.json({
                status: 'SUCCESS',
                message: 'Actualizaciones automáticas del dashboard iniciadas',
                data: {
                    empresaId: idEmpresa,
                    startedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error iniciando actualizaciones del dashboard:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

router.post("/stop-updates",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;

            if (!global.dashboardRealTimeService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardRealTimeService no está disponible'
                });
            }

            global.dashboardRealTimeService.stopDashboardUpdates(idEmpresa);

            res.json({
                status: 'SUCCESS',
                message: 'Actualizaciones automáticas del dashboard detenidas',
                data: {
                    empresaId: idEmpresa,
                    stoppedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error deteniendo actualizaciones del dashboard:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Obtener estadísticas de actualizaciones
router.get("/update-stats",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            if (!global.dashboardRealTimeService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardRealTimeService no está disponible'
                });
            }

            const stats = global.dashboardRealTimeService.getUpdateStats();

            res.json({
                status: 'SUCCESS',
                message: 'Estadísticas de actualizaciones obtenidas',
                data: stats
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas de actualizaciones:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Control de cache del dashboard
router.post("/cache/clear",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;
            const { cacheType } = req.body;

            if (!global.cacheService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'CacheService no está disponible'
                });
            }

            const invalidated = global.cacheService.invalidateDashboardCache(idEmpresa, cacheType);

            res.json({
                status: 'SUCCESS',
                message: 'Cache del dashboard limpiado',
                data: {
                    empresaId: idEmpresa,
                    cacheType: cacheType || 'all',
                    invalidatedEntries: invalidated,
                    clearedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error limpiando cache del dashboard:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

router.post("/cache/preload",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    async (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;

            if (!global.cacheService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'CacheService no está disponible'
                });
            }

            const pool = require('../config/db');
            const data = await global.cacheService.preloadDashboardData(pool, idEmpresa);

            res.json({
                status: 'SUCCESS',
                message: 'Cache del dashboard precargado',
                data: {
                    empresaId: idEmpresa,
                    preloadedAt: new Date().toISOString(),
                    preloadedData: data
                }
            });
        } catch (error) {
            console.error('Error precargando cache del dashboard:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Obtener estadísticas del cache del dashboard
router.get("/cache/stats",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;

            if (!global.cacheService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'CacheService no está disponible'
                });
            }

            const cacheStats = global.cacheService.getPerformanceStats();
            const dashboardKeys = global.cacheService.getCacheKeys(20);

            res.json({
                status: 'SUCCESS',
                message: 'Estadísticas del cache del dashboard obtenidas',
                data: {
                    empresaId: idEmpresa,
                    cacheStats,
                    dashboardKeys,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas del cache:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Obtener estadísticas de eventos del dashboard
router.get("/events/stats",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;

            if (!global.dashboardEventService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardEventService no está disponible'
                });
            }

            const eventStats = global.dashboardEventService.getEventStats();
            const activeListeners = global.dashboardEventService.getActiveListeners();

            res.json({
                status: 'SUCCESS',
                message: 'Estadísticas de eventos del dashboard obtenidas',
                data: {
                    empresaId: idEmpresa,
                    eventStats,
                    activeListeners,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas de eventos:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Obtener historial de eventos del dashboard
router.get("/events/history",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;
            const { limit = 20, eventType } = req.query;

            if (!global.dashboardEventService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardEventService no está disponible'
                });
            }

            const history = global.dashboardEventService.getEventHistory(
                parseInt(limit),
                eventType
            );

            res.json({
                status: 'SUCCESS',
                message: 'Historial de eventos del dashboard obtenido',
                data: {
                    empresaId: idEmpresa,
                    history,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error obteniendo historial de eventos:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Emitir evento manual del dashboard
router.post("/events/emit",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;
            const { eventType, eventData } = req.body;

            if (!eventType || !eventData) {
                return res.status(400).json({
                    status: 'ERROR',
                    message: 'Faltan datos requeridos: eventType, eventData'
                });
            }

            if (!global.dashboardEventService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardEventService no está disponible'
                });
            }

            global.dashboardEventService.emitManualChange(idEmpresa, eventType, eventData);

            res.json({
                status: 'SUCCESS',
                message: 'Evento manual emitido',
                data: {
                    empresaId: idEmpresa,
                    eventType,
                    eventData,
                    emittedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error emitiendo evento manual:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Forzar actualización de datos específicos del dashboard
router.post("/force-update",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    async (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;
            const { dataType } = req.body;

            if (!global.dashboardRealTimeService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardRealTimeService no está disponible'
                });
            }

            let updateResult = {};

            switch (dataType) {
                case 'stats':
                    updateResult = await global.dashboardRealTimeService.updateGeneralStats(idEmpresa);
                    break;
                case 'realtime':
                    updateResult = await global.dashboardRealTimeService.updateRealTimeData(idEmpresa);
                    break;
                case 'alerts':
                    updateResult = await global.dashboardRealTimeService.updateAlerts(idEmpresa);
                    break;
                case 'all':
                    await Promise.all([
                        global.dashboardRealTimeService.updateGeneralStats(idEmpresa),
                        global.dashboardRealTimeService.updateRealTimeData(idEmpresa),
                        global.dashboardRealTimeService.updateAlerts(idEmpresa)
                    ]);
                    updateResult = { message: 'Todas las actualizaciones completadas' };
                    break;
                default:
                    return res.status(400).json({
                        status: 'ERROR',
                        message: 'Tipo de datos no válido. Use: stats, realtime, alerts, o all'
                    });
            }

            res.json({
                status: 'SUCCESS',
                message: `Actualización forzada de ${dataType} completada`,
                data: {
                    empresaId: idEmpresa,
                    dataType,
                    updatedAt: new Date().toISOString(),
                    result: updateResult
                }
            });
        } catch (error) {
            console.error('Error forzando actualización del dashboard:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Obtener configuración de actualizaciones automáticas
router.get("/auto-update/config",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;

            if (!global.dashboardRealTimeService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardRealTimeService no está disponible'
                });
            }

            const updateStats = global.dashboardRealTimeService.getUpdateStats();
            const isActive = global.dashboardRealTimeService.updateIntervals.has(idEmpresa);

            res.json({
                status: 'SUCCESS',
                message: 'Configuración de actualizaciones automáticas obtenida',
                data: {
                    empresaId: idEmpresa,
                    isActive,
                    updateStats,
                    intervals: {
                        stats: '1 hora',
                        realtime: '1 hora',
                        alerts: '1 hora'
                    },
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error obteniendo configuración de auto-update:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Obtener métricas de rendimiento del dashboard
router.get("/performance",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;

            if (!global.cacheService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'CacheService no está disponible'
                });
            }

            const cacheStats = global.cacheService.getPerformanceStats();
            const updateStats = global.dashboardRealTimeService ?
                global.dashboardRealTimeService.getUpdateStats() : null;

            const performance = {
                empresaId: idEmpresa,
                cache: cacheStats,
                updates: updateStats,
                database: {
                    connectionPool: {
                        total: 10,
                        used: 0, // Esto requeriría acceso directo al pool
                        available: 10
                    }
                },
                timestamp: new Date().toISOString()
            };

            res.json({
                status: 'SUCCESS',
                message: 'Métricas de rendimiento obtenidas',
                data: performance
            });
        } catch (error) {
            console.error('Error obteniendo métricas de rendimiento:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Obtener estadísticas de notificaciones push
router.get("/notifications/stats",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;

            if (!global.dashboardPushService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardPushService no está disponible'
                });
            }

            const notificationStats = global.dashboardPushService.getNotificationStats(idEmpresa);
            const notificationHistory = global.dashboardPushService.getNotificationHistory(idEmpresa, 10);

            res.json({
                status: 'SUCCESS',
                message: 'Estadísticas de notificaciones push obtenidas',
                data: {
                    empresaId: idEmpresa,
                    notificationStats,
                    recentNotifications: notificationHistory,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas de notificaciones:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Obtener historial de notificaciones push
router.get("/notifications/history",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;
            const { limit = 20 } = req.query;

            if (!global.dashboardPushService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardPushService no está disponible'
                });
            }

            const history = global.dashboardPushService.getNotificationHistory(
                idEmpresa,
                parseInt(limit)
            );

            res.json({
                status: 'SUCCESS',
                message: 'Historial de notificaciones push obtenido',
                data: {
                    empresaId: idEmpresa,
                    history,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error obteniendo historial de notificaciones:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Marcar notificación como leída
router.put("/notifications/:notificationId/read",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;
            const { notificationId } = req.params;

            if (!global.dashboardPushService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardPushService no está disponible'
                });
            }

            const success = global.dashboardPushService.markAsRead(notificationId, idEmpresa);

            if (success) {
                res.json({
                    status: 'SUCCESS',
                    message: 'Notificación marcada como leída',
                    data: {
                        empresaId: idEmpresa,
                        notificationId,
                        markedAt: new Date().toISOString()
                    }
                });
            } else {
                res.status(404).json({
                    status: 'ERROR',
                    message: 'Notificación no encontrada'
                });
            }
        } catch (error) {
            console.error('Error marcando notificación como leída:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// Marcar notificación como reconocida
router.put("/notifications/:notificationId/acknowledge",
    allowRoles("SUPERADMIN", "ADMINISTRADOR"),
    (req, res) => {
        try {
            const idEmpresa = req.user.idEmpresa;
            const { notificationId } = req.params;

            if (!global.dashboardPushService) {
                return res.status(503).json({
                    status: 'ERROR',
                    message: 'DashboardPushService no está disponible'
                });
            }

            const success = global.dashboardPushService.acknowledgeNotification(notificationId, idEmpresa);

            if (success) {
                res.json({
                    status: 'SUCCESS',
                    message: 'Notificación marcada como reconocida',
                    data: {
                        empresaId: idEmpresa,
                        notificationId,
                        acknowledgedAt: new Date().toISOString()
                    }
                });
            } else {
                res.status(404).json({
                    status: 'ERROR',
                    message: 'Notificación no encontrada'
                });
            }
        } catch (error) {
            console.error('Error reconociendo notificación:', error);
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno del servidor'
            });
        }
    }
);

// ========================================
// RUTA DE PRUEBA PARA VERIFICAR CONECTIVIDAD
// ========================================
router.get("/test", 
    allowRoles("SUPERADMIN", "ADMINISTRADOR"), 
    (req, res) => {
        res.json({
            status: 'success',
            message: 'Dashboard API funcionando correctamente',
            timestamp: new Date().toISOString(),
            user: {
                id: req.user.idUsuario,
                email: req.user.email,
                role: req.user.role,
                empresa: req.user.idEmpresa
            }
        });
    }
);

// ========================================
// MANEJO DE ERRORES 404 PARA RUTAS DASHBOARD
// ========================================
router.use((req, res) => {
    res.status(404).json({
        status: 'ERROR',
        message: 'Ruta de dashboard no encontrada',
        path: req.originalUrl,
        method: req.method,
        availableRoutes: [
        'GET /api/dashboard/estadisticas',
        'GET /api/dashboard/graficos?periodo={dia|semana|mes|trimestre|ano}',
        'GET /api/dashboard/alertas',
        'GET /api/dashboard/actividad?limite={number}',
        'GET /api/dashboard/kpis?fechaInicio={YYYY-MM-DD}&fechaFin={YYYY-MM-DD}',
        'GET /api/dashboard/resumen-ejecutivo?periodo={dia|semana|mes|trimestre}',
        'GET /api/dashboard/tiempo-real',
        'POST /api/dashboard/start-updates',
        'POST /api/dashboard/stop-updates',
        'GET /api/dashboard/update-stats',
        'POST /api/dashboard/cache/clear',
        'POST /api/dashboard/cache/preload',
        'GET /api/dashboard/cache/stats',
        'GET /api/dashboard/events/stats',
        'GET /api/dashboard/events/history?limit={number}&eventType={type}',
        'POST /api/dashboard/events/emit',
        'POST /api/dashboard/force-update',
        'GET /api/dashboard/auto-update/config',
        'GET /api/dashboard/performance',
        'GET /api/dashboard/test'
    ]
    });
});

module.exports = router;