// src/services/dashboardRealTimeService.js
// Servicio para manejar actualizaciones del dashboard en tiempo real

const pool = require('../config/db');
const cacheService = require('../utils/cacheService');
const dashboardEventService = require('./dashboardEventService');
const DashboardQueries = require('../utils/dashboardQueries');
const DashboardPushService = require('./dashboardPushService');

class DashboardRealTimeService {
    constructor(realTimeService) {
        this.realTimeService = realTimeService;
        this.updateIntervals = new Map();
        this.subscribers = new Map();

        // Configurar listeners de eventos
        this.setupEventListeners();

        // Configurar procesamiento de notificaciones push
        this.setupPushNotifications();
    }

    /**
     * Configurar procesamiento de notificaciones push
     */
    setupPushNotifications() {
        // Procesar notificaciones cuando se actualicen los datos
        dashboardEventService.on('dashboard:stats:update', async (event) => {
            await this.processPushNotifications(event.data.empresaId, {
                stats: event.data.stats,
                realtime: null,
                alerts: null
            });
        });

        dashboardEventService.on('dashboard:realtime:update', async (event) => {
            await this.processPushNotifications(event.data.empresaId, {
                stats: null,
                realtime: event.data.realtime,
                alerts: null
            });
        });

        dashboardEventService.on('dashboard:alerts:update', async (event) => {
            await this.processPushNotifications(event.data.empresaId, {
                stats: null,
                realtime: null,
                alerts: event.data.alerts
            });
        });
    }

    /**
     * Procesar notificaciones push
     */
    async processPushNotifications(empresaId, dashboardData) {
        try {
            if (global.dashboardPushService) {
                await global.dashboardPushService.processNotifications(empresaId, dashboardData);
            }
        } catch (error) {
            console.error('Error procesando notificaciones push:', error);
        }
    }

    /**
     * Configurar listeners de eventos del dashboard
     */
    setupEventListeners() {
        // Escuchar eventos de cambios en entidades para invalidar cache
        dashboardEventService.on('dashboard:conductor:change', (event) => {
            this.handleEntityChange('conductores', event.data.empresaId);
        });

        dashboardEventService.on('dashboard:vehicle:change', (event) => {
            this.handleEntityChange('vehiculos', event.data.empresaId);
        });

        dashboardEventService.on('dashboard:trip:change', (event) => {
            this.handleEntityChange('viajes', event.data.empresaId);
        });

        dashboardEventService.on('dashboard:route:change', (event) => {
            this.handleEntityChange('rutas', event.data.empresaId);
        });

        console.log('🔗 Listeners de eventos del dashboard configurados');
    }

    /**
     * Manejar cambios en entidades
     */
    handleEntityChange(entityType, empresaId) {
        // Invalidar cache relacionado
        cacheService.invalidateByTable(entityType, empresaId);

        // Invalidar cache del dashboard
        cacheService.invalidateDashboardCache(empresaId);

        console.log(`📊 Cache invalidado para ${entityType} en empresa ${empresaId}`);
    }

    /**
     * Iniciar actualizaciones automáticas del dashboard
     */
    startDashboardUpdates(empresaId) {
        // Detener actualizaciones existentes para esta empresa
        this.stopDashboardUpdates(empresaId);

        // Actualizar estadísticas generales cada 1 hora
        const statsInterval = setInterval(async () => {
            try {
                await this.updateGeneralStats(empresaId);
            } catch (error) {
                console.error(`Error actualizando estadísticas generales para empresa ${empresaId}:`, error);
            }
        }, 3600000);

        // Actualizar datos en tiempo real cada 1 hora
        const realtimeInterval = setInterval(async () => {
            try {
                await this.updateRealTimeData(empresaId);
            } catch (error) {
                console.error(`Error actualizando datos en tiempo real para empresa ${empresaId}:`, error);
            }
        }, 3600000);

        // Actualizar alertas cada 1 hora
        const alertsInterval = setInterval(async () => {
            try {
                await this.updateAlerts(empresaId);
            } catch (error) {
                console.error(`Error actualizando alertas para empresa ${empresaId}:`, error);
            }
        }, 3600000);

        // Almacenar intervalos
        this.updateIntervals.set(empresaId, {
            stats: statsInterval,
            realtime: realtimeInterval,
            alerts: alertsInterval
        });

        console.log(`✅ Actualizaciones automáticas del dashboard iniciadas para empresa ${empresaId}`);
    }

    /**
     * Detener actualizaciones automáticas del dashboard
     */
    stopDashboardUpdates(empresaId) {
        const intervals = this.updateIntervals.get(empresaId);
        if (intervals) {
            clearInterval(intervals.stats);
            clearInterval(intervals.realtime);
            clearInterval(intervals.alerts);
            this.updateIntervals.delete(empresaId);
            console.log(`🛑 Actualizaciones automáticas del dashboard detenidas para empresa ${empresaId}`);
        }
    }

    /**
     * Actualizar estadísticas generales
     */
    async updateGeneralStats(empresaId) {
        try {
            const stats = await this.getGeneralStats(empresaId);

            // Emitir evento usando el sistema de eventos
            dashboardEventService.emitStatsUpdate(empresaId, stats);

            // Enviar actualización a todos los clientes de la empresa
            this.realTimeService.sendToEmpresa(empresaId, 'dashboard:stats:update', {
                type: 'general_stats',
                data: stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error actualizando estadísticas generales:', error);
            dashboardEventService.emitDashboardError(empresaId, 'stats_update_error', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Actualizar datos en tiempo real
     */
    async updateRealTimeData(empresaId) {
        try {
            const realtimeData = await this.getRealTimeData(empresaId);

            // Emitir evento usando el sistema de eventos
            dashboardEventService.emitRealtimeUpdate(empresaId, realtimeData);

            // Enviar actualización a todos los clientes de la empresa
            this.realTimeService.sendToEmpresa(empresaId, 'dashboard:realtime:update', {
                type: 'realtime_data',
                data: realtimeData,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error actualizando datos en tiempo real:', error);
            dashboardEventService.emitDashboardError(empresaId, 'realtime_update_error', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Actualizar alertas
     */
    async updateAlerts(empresaId) {
        try {
            const alerts = await this.getActiveAlerts(empresaId);

            // Emitir evento usando el sistema de eventos
            dashboardEventService.emitAlertsUpdate(empresaId, alerts);

            // Enviar actualización a todos los clientes de la empresa
            this.realTimeService.sendToEmpresa(empresaId, 'dashboard:alerts:update', {
                type: 'alerts',
                data: alerts,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error actualizando alertas:', error);
            dashboardEventService.emitDashboardError(empresaId, 'alerts_update_error', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Obtener estadísticas generales (usando consultas optimizadas)
     */
    async getGeneralStats(empresaId) {
        return await DashboardQueries.getGeneralStats(empresaId);
    }

    /**
     * Obtener datos en tiempo real (usando consultas optimizadas)
     */
    async getRealTimeData(empresaId) {
        return await DashboardQueries.getRealTimeData(empresaId);
    }

    /**
     * Obtener alertas activas (usando consultas optimizadas)
     */
    async getActiveAlerts(empresaId) {
        return await DashboardQueries.getActiveAlerts(empresaId);
    }

    /**
     * Notificar cambios en entidades específicas
     */
    async notifyEntityChange(entityType, entityId, empresaId, action) {
        try {
            // Invalidar cache relacionado
            cacheService.invalidateByTable(entityType, empresaId);

            // Enviar notificación específica según el tipo de entidad
            let eventType = '';
            let notificationData = {};

            switch (entityType) {
                case 'conductores':
                    eventType = 'dashboard:conductor:change';
                    notificationData = { conductorId: entityId, action };
                    break;
                case 'vehiculos':
                    eventType = 'dashboard:vehicle:change';
                    notificationData = { vehicleId: entityId, action };
                    break;
                case 'viajes':
                    eventType = 'dashboard:trip:change';
                    notificationData = { tripId: entityId, action };
                    break;
                case 'rutas':
                    eventType = 'dashboard:route:change';
                    notificationData = { routeId: entityId, action };
                    break;
                default:
                    eventType = 'dashboard:entity:change';
                    notificationData = { entityType, entityId, action };
            }

            this.realTimeService.sendToEmpresa(empresaId, eventType, {
                ...notificationData,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error notificando cambio de entidad:', error);
        }
    }

    /**
     * Obtener estadísticas de actualización
     */
    getUpdateStats() {
        return {
            activeUpdates: this.updateIntervals.size,
            companiesWithUpdates: Array.from(this.updateIntervals.keys()),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Limpiar todas las actualizaciones
     */
    stopAllUpdates() {
        for (const [empresaId] of this.updateIntervals) {
            this.stopDashboardUpdates(empresaId);
        }
        console.log('🛑 Todas las actualizaciones del dashboard detenidas');
    }
}

module.exports = DashboardRealTimeService;