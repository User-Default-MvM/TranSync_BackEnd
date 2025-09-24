// src/routes/realTimeRoutes.js - Rutas para el RealTimeService
const express = require('express');
const router = express.Router();

// Middleware de autenticación
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Obtener estadísticas del RealTimeService
router.get('/stats', authMiddleware, (req, res) => {
    try {
        const realTimeService = global.realTimeService;
        if (!realTimeService) {
            return res.status(503).json({
                status: 'ERROR',
                message: 'RealTimeService no está disponible',
                timestamp: new Date().toISOString()
            });
        }

        const stats = realTimeService.getConnectionStats();
        const serverInfo = realTimeService.getServerInfo();

        res.json({
            status: 'SUCCESS',
            message: 'Estadísticas del RealTimeService obtenidas exitosamente',
            timestamp: new Date().toISOString(),
            data: {
                connectionStats: stats,
                serverInfo: serverInfo,
                features: [
                    'Real-time notifications',
                    'Connection monitoring',
                    'Advanced notification system',
                    'Automatic reconnection',
                    'Priority-based notifications',
                    'Browser notifications support'
                ]
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas del RealTimeService:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno del servidor',
            timestamp: new Date().toISOString(),
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Obtener lista de clientes conectados
router.get('/clients', authMiddleware, (req, res) => {
    try {
        const realTimeService = global.realTimeService;
        if (!realTimeService) {
            return res.status(503).json({
                status: 'ERROR',
                message: 'RealTimeService no está disponible',
                timestamp: new Date().toISOString()
            });
        }

        const clients = realTimeService.getConnectedClients();
        const clientCount = realTimeService.getClientCount();

        res.json({
            status: 'SUCCESS',
            message: 'Lista de clientes conectados obtenida exitosamente',
            timestamp: new Date().toISOString(),
            data: {
                totalClients: clientCount,
                clients: clients.map(client => ({
                    userId: client.userId,
                    empresaId: client.empresaId,
                    rol: client.rol,
                    connectedAt: client.connectedAt,
                    lastPing: client.lastPing
                }))
            }
        });
    } catch (error) {
        console.error('Error obteniendo lista de clientes:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno del servidor',
            timestamp: new Date().toISOString(),
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Enviar notificación personalizada
router.post('/notifications', authMiddleware, (req, res) => {
    try {
        const realTimeService = global.realTimeService;
        if (!realTimeService) {
            return res.status(503).json({
                status: 'ERROR',
                message: 'RealTimeService no está disponible',
                timestamp: new Date().toISOString()
            });
        }

        const { targetType, targetId, event, data, priority = 'medium' } = req.body;

        // Validar datos requeridos
        if (!targetType || !targetId || !event || !data) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'Faltan datos requeridos: targetType, targetId, event, data',
                timestamp: new Date().toISOString()
            });
        }

        // Validar tipos de target válidos
        const validTargetTypes = ['empresa', 'usuario', 'rol', 'broadcast'];
        if (!validTargetTypes.includes(targetType)) {
            return res.status(400).json({
                status: 'ERROR',
                message: `Tipo de target no válido. Debe ser uno de: ${validTargetTypes.join(', ')}`,
                timestamp: new Date().toISOString()
            });
        }

        // Enviar notificación
        realTimeService.sendNotification({
            targetType,
            targetId,
            event,
            data,
            priority
        });

        res.json({
            status: 'SUCCESS',
            message: 'Notificación enviada exitosamente',
            timestamp: new Date().toISOString(),
            data: {
                targetType,
                targetId,
                event,
                priority,
                sentAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error enviando notificación:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno del servidor',
            timestamp: new Date().toISOString(),
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Obtener información del servidor WebSocket
router.get('/server-info', authMiddleware, (req, res) => {
    try {
        const realTimeService = global.realTimeService;
        if (!realTimeService) {
            return res.status(503).json({
                status: 'ERROR',
                message: 'RealTimeService no está disponible',
                timestamp: new Date().toISOString()
            });
        }

        const serverInfo = realTimeService.getServerInfo();

        res.json({
            status: 'SUCCESS',
            message: 'Información del servidor obtenida exitosamente',
            timestamp: new Date().toISOString(),
            data: serverInfo
        });
    } catch (error) {
        console.error('Error obteniendo información del servidor:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno del servidor',
            timestamp: new Date().toISOString(),
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Verificar estado de conexión de un usuario específico
router.get('/connection-status/:userId', authMiddleware, (req, res) => {
    try {
        const realTimeService = global.realTimeService;
        if (!realTimeService) {
            return res.status(503).json({
                status: 'ERROR',
                message: 'RealTimeService no está disponible',
                timestamp: new Date().toISOString()
            });
        }

        const { userId } = req.params;
        const isConnected = realTimeService.isUserConnected(userId);

        res.json({
            status: 'SUCCESS',
            message: 'Estado de conexión verificado',
            timestamp: new Date().toISOString(),
            data: {
                userId,
                isConnected,
                checkedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error verificando estado de conexión:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno del servidor',
            timestamp: new Date().toISOString(),
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Limpiar clientes inactivos (solo para administradores)
router.post('/cleanup', authMiddleware, roleMiddleware(['ADMINISTRADOR', 'SUPERADMIN']), (req, res) => {
    try {
        const realTimeService = global.realTimeService;
        if (!realTimeService) {
            return res.status(503).json({
                status: 'ERROR',
                message: 'RealTimeService no está disponible',
                timestamp: new Date().toISOString()
            });
        }

        const cleanedCount = realTimeService.cleanupInactiveClients();

        res.json({
            status: 'SUCCESS',
            message: 'Limpieza de clientes inactivos completada',
            timestamp: new Date().toISOString(),
            data: {
                cleanedClients: cleanedCount,
                remainingClients: realTimeService.getClientCount(),
                cleanedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error limpiando clientes inactivos:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno del servidor',
            timestamp: new Date().toISOString(),
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Obtener métricas de rendimiento
router.get('/metrics', authMiddleware, (req, res) => {
    try {
        const realTimeService = global.realTimeService;
        if (!realTimeService) {
            return res.status(503).json({
                status: 'ERROR',
                message: 'RealTimeService no está disponible',
                timestamp: new Date().toISOString()
            });
        }

        const stats = realTimeService.getConnectionStats();
        const serverInfo = realTimeService.getServerInfo();
        const memoryUsage = process.memoryUsage();

        const metrics = {
            connections: {
                total: stats.totalConnections,
                byEmpresa: stats.connectionsByEmpresa,
                byRol: stats.connectionsByRol
            },
            server: {
                uptime: serverInfo.uptime,
                memoryUsage: {
                    rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
                    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
                    external: Math.round(memoryUsage.external / 1024 / 1024) // MB
                }
            },
            timestamp: new Date().toISOString()
        };

        res.json({
            status: 'SUCCESS',
            message: 'Métricas de rendimiento obtenidas exitosamente',
            timestamp: new Date().toISOString(),
            data: metrics
        });
    } catch (error) {
        console.error('Error obteniendo métricas:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno del servidor',
            timestamp: new Date().toISOString(),
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;