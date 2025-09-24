// src/services/dashboardEventService.js
// Sistema de eventos para notificar cambios en tiempo real del dashboard

const EventEmitter = require('events');

class DashboardEventService extends EventEmitter {
    constructor() {
        super();
        this.eventHistory = [];
        this.maxHistorySize = 1000;
        this.activeListeners = new Map();

        // Configurar límites de listeners
        this.setMaxListeners(50);

        console.log('📡 DashboardEventService inicializado');
    }

    /**
     * Emitir evento de cambio en el dashboard
     */
    emitDashboardChange(eventType, data) {
        const event = {
            type: eventType,
            data: data,
            timestamp: new Date().toISOString(),
            id: this.generateEventId()
        };

        // Emitir evento
        this.emit(eventType, event);

        // Emitir evento general de dashboard
        this.emit('dashboard:change', event);

        // Almacenar en historial
        this.addToHistory(event);

        console.log(`📡 Evento emitido: ${eventType}`, event.data);
    }

    /**
     * Emitir evento de actualización de estadísticas
     */
    emitStatsUpdate(empresaId, statsData) {
        this.emitDashboardChange('dashboard:stats:update', {
            empresaId,
            stats: statsData,
            source: 'automatic'
        });
    }

    /**
     * Emitir evento de actualización de datos en tiempo real
     */
    emitRealtimeUpdate(empresaId, realtimeData) {
        this.emitDashboardChange('dashboard:realtime:update', {
            empresaId,
            realtime: realtimeData,
            source: 'automatic'
        });
    }

    /**
     * Emitir evento de actualización de alertas
     */
    emitAlertsUpdate(empresaId, alertsData) {
        this.emitDashboardChange('dashboard:alerts:update', {
            empresaId,
            alerts: alertsData,
            source: 'automatic'
        });
    }

    /**
     * Emitir evento de cambio en entidad específica
     */
    emitEntityChange(entityType, entityId, empresaId, action, entityData = {}) {
        this.emitDashboardChange(`dashboard:${entityType}:change`, {
            entityType,
            entityId,
            empresaId,
            action,
            entityData,
            source: 'entity_change'
        });
    }

    /**
     * Emitir evento de cambio manual en el dashboard
     */
    emitManualChange(empresaId, changeType, changeData) {
        this.emitDashboardChange('dashboard:manual:change', {
            empresaId,
            changeType,
            changeData,
            source: 'manual'
        });
    }

    /**
     * Emitir evento de error en el dashboard
     */
    emitDashboardError(empresaId, errorType, errorData) {
        this.emitDashboardChange('dashboard:error', {
            empresaId,
            errorType,
            errorData,
            source: 'error'
        });
    }

    /**
     * Registrar listener para eventos del dashboard
     */
    onDashboardEvent(eventType, listener, options = {}) {
        const { empresaId = null, persistent = true } = options;

        const listenerId = this.generateListenerId();

        const wrappedListener = (event) => {
            try {
                // Filtrar por empresa si se especifica
                if (empresaId && event.data.empresaId !== empresaId) {
                    return;
                }

                listener(event);
            } catch (error) {
                console.error(`Error en listener ${listenerId} para evento ${eventType}:`, error);
            }
        };

        // Registrar listener
        this.on(eventType, wrappedListener);

        // Almacenar información del listener
        this.activeListeners.set(listenerId, {
            eventType,
            empresaId,
            persistent,
            listener: wrappedListener,
            createdAt: new Date().toISOString()
        });

        console.log(`👂 Listener registrado: ${listenerId} para evento ${eventType}${empresaId ? ` (empresa: ${empresaId})` : ''}`);

        return listenerId;
    }

    /**
     * Remover listener específico
     */
    removeListener(listenerId) {
        const listenerInfo = this.activeListeners.get(listenerId);
        if (listenerInfo) {
            this.removeListener(listenerInfo.eventType, listenerInfo.listener);
            this.activeListeners.delete(listenerId);
            console.log(`🗑️ Listener removido: ${listenerId}`);
            return true;
        }
        return false;
    }

    /**
     * Remover todos los listeners de un tipo específico
     */
    removeAllListenersByType(eventType) {
        let removedCount = 0;
        for (const [listenerId, listenerInfo] of this.activeListeners.entries()) {
            if (listenerInfo.eventType === eventType) {
                this.removeListener(listenerId);
                removedCount++;
            }
        }
        console.log(`🗑️ ${removedCount} listeners removidos para evento ${eventType}`);
        return removedCount;
    }

    /**
     * Obtener historial de eventos
     */
    getEventHistory(limit = 50, eventType = null) {
        let events = [...this.eventHistory];

        if (eventType) {
            events = events.filter(event => event.type === eventType);
        }

        return events
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * Obtener estadísticas de eventos
     */
    getEventStats() {
        const stats = {
            totalEvents: this.eventHistory.length,
            eventsByType: {},
            eventsByEmpresa: {},
            eventsBySource: {},
            recentEvents: this.getEventHistory(10),
            timestamp: new Date().toISOString()
        };

        this.eventHistory.forEach(event => {
            // Contar por tipo
            stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;

            // Contar por empresa
            if (event.data.empresaId) {
                stats.eventsByEmpresa[event.data.empresaId] = (stats.eventsByEmpresa[event.data.empresaId] || 0) + 1;
            }

            // Contar por fuente
            stats.eventsBySource[event.data.source] = (stats.eventsBySource[event.data.source] || 0) + 1;
        });

        return stats;
    }

    /**
     * Obtener información de listeners activos
     */
    getActiveListeners() {
        return Array.from(this.activeListeners.entries()).map(([id, info]) => ({
            id,
            eventType: info.eventType,
            empresaId: info.empresaId,
            persistent: info.persistent,
            createdAt: info.createdAt
        }));
    }

    /**
     * Limpiar historial de eventos
     */
    clearEventHistory() {
        this.eventHistory = [];
        console.log('🧹 Historial de eventos limpiado');
    }

    /**
     * Limpiar listeners no persistentes
     */
    cleanupNonPersistentListeners() {
        let removedCount = 0;
        for (const [listenerId, listenerInfo] of this.activeListeners.entries()) {
            if (!listenerInfo.persistent) {
                this.removeListener(listenerId);
                removedCount++;
            }
        }
        console.log(`🧹 ${removedCount} listeners no persistentes limpiados`);
        return removedCount;
    }

    /**
     * Generar ID único para evento
     */
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generar ID único para listener
     */
    generateListenerId() {
        return `lst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Agregar evento al historial
     */
    addToHistory(event) {
        this.eventHistory.push(event);

        // Mantener tamaño máximo del historial
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * Configurar limpieza automática
     */
    startAutoCleanup() {
        // Limpiar listeners no persistentes cada 30 minutos
        setInterval(() => {
            this.cleanupNonPersistentListeners();
        }, 30 * 60 * 1000);

        // Limpiar historial antiguo cada hora
        setInterval(() => {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            this.eventHistory = this.eventHistory.filter(
                event => new Date(event.timestamp) > oneHourAgo
            );
        }, 60 * 60 * 1000);

        console.log('🧹 Limpieza automática de eventos configurada');
    }
}

// Crear instancia singleton
const dashboardEventService = new DashboardEventService();

// Iniciar limpieza automática
dashboardEventService.startAutoCleanup();

module.exports = dashboardEventService;