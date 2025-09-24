// src/services/dashboardPushService.js
// Servicio de notificaciones push para el dashboard

const pool = require('../config/db');
const dashboardEventService = require('./dashboardEventService');

class DashboardPushService {
    constructor(realTimeService) {
        this.realTimeService = realTimeService;
        this.notificationRules = new Map();
        this.activeNotifications = new Map();
        this.notificationHistory = [];

        // Configurar reglas de notificación por defecto
        this.setupDefaultNotificationRules();

        console.log('📱 DashboardPushService inicializado');
    }

    /**
     * Configurar reglas de notificación por defecto
     */
    setupDefaultNotificationRules() {
        // Regla para alertas críticas de licencias
        this.addNotificationRule({
            id: 'license_critical',
            name: 'Licencias próximas a vencer (críticas)',
            condition: (data) => {
                return data.some(alert =>
                    alert.diasParaVencer <= 7 &&
                    alert.diasParaVencer >= 0 &&
                    alert.severity === 'critical'
                );
            },
            message: '🚨 Licencia(s) próxima(s) a vencer en 7 días o menos',
            priority: 'high',
            channels: ['websocket', 'browser']
        });

        // Regla para vehículos en mantenimiento
        this.addNotificationRule({
            id: 'vehicle_maintenance',
            name: 'Vehículos en mantenimiento',
            condition: (stats) => {
                return stats.vehiculosEnMantenimiento > 0;
            },
            message: '🔧 Vehículo(s) en mantenimiento',
            priority: 'medium',
            channels: ['websocket']
        });

        // Regla para viajes en curso
        this.addNotificationRule({
            id: 'trips_in_progress',
            name: 'Viajes en curso',
            condition: (realtime) => {
                return realtime.viajesEnCurso > 0;
            },
            message: '🚗 Viaje(s) en curso',
            priority: 'low',
            channels: ['websocket']
        });

        // Regla para conductores inactivos
        this.addNotificationRule({
            id: 'drivers_inactive',
            name: 'Conductores inactivos',
            condition: (stats) => {
                return stats.conductoresInactivos > 0;
            },
            message: '👤 Conductor(es) inactivo(s)',
            priority: 'medium',
            channels: ['websocket']
        });

        // Regla para documentos vencidos
        this.addNotificationRule({
            id: 'documents_expired',
            name: 'Documentos vencidos',
            condition: (alerts) => {
                return alerts.some(alert => alert.diasParaVencer < 0);
            },
            message: '❌ Documento(s) vencido(s)',
            priority: 'high',
            channels: ['websocket', 'browser']
        });
    }

    /**
     * Agregar regla de notificación
     */
    addNotificationRule(rule) {
        this.notificationRules.set(rule.id, rule);
        console.log(`📋 Regla de notificación agregada: ${rule.name}`);
    }

    /**
     * Remover regla de notificación
     */
    removeNotificationRule(ruleId) {
        this.notificationRules.delete(ruleId);
        console.log(`🗑️ Regla de notificación removida: ${ruleId}`);
    }

    /**
     * Procesar notificaciones basadas en datos del dashboard
     */
    async processNotifications(empresaId, dashboardData) {
        try {
            const notifications = [];

            // Procesar cada regla de notificación
            for (const [ruleId, rule] of this.notificationRules) {
                let shouldNotify = false;
                let notificationData = {};

                // Evaluar condición según el tipo de datos
                if (ruleId.startsWith('license_') || ruleId === 'documents_expired') {
                    shouldNotify = rule.condition(dashboardData.alerts || []);
                    notificationData = dashboardData.alerts || [];
                } else if (ruleId === 'vehicle_maintenance' || ruleId === 'drivers_inactive') {
                    shouldNotify = rule.condition(dashboardData.stats || {});
                    notificationData = dashboardData.stats || {};
                } else if (ruleId === 'trips_in_progress') {
                    shouldNotify = rule.condition(dashboardData.realtime || {});
                    notificationData = dashboardData.realtime || {};
                }

                if (shouldNotify) {
                    const notification = await this.createNotification(
                        empresaId,
                        rule,
                        notificationData
                    );

                    notifications.push(notification);

                    // Enviar notificación según los canales configurados
                    await this.sendNotification(empresaId, rule, notification);
                }
            }

            return notifications;

        } catch (error) {
            console.error('Error procesando notificaciones:', error);
        }
    }

    /**
     * Crear notificación
     */
    async createNotification(empresaId, rule, data) {
        const notification = {
            id: this.generateNotificationId(),
            empresaId,
            ruleId: rule.id,
            title: rule.message,
            message: this.generateDetailedMessage(rule, data),
            priority: rule.priority,
            channels: rule.channels,
            data,
            timestamp: new Date().toISOString(),
            read: false,
            acknowledged: false
        };

        // Almacenar en historial
        this.addToNotificationHistory(notification);

        return notification;
    }

    /**
     * Enviar notificación por los canales especificados
     */
    async sendNotification(empresaId, rule, notification) {
        const promises = [];

        // Enviar por WebSocket
        if (rule.channels.includes('websocket')) {
            promises.push(
                this.realTimeService.sendToEmpresa(empresaId, 'dashboard:notification', {
                    type: 'push_notification',
                    notification,
                    timestamp: new Date().toISOString()
                })
            );
        }

        // Enviar notificación del navegador
        if (rule.channels.includes('browser')) {
            promises.push(
                this.realTimeService.sendToEmpresa(empresaId, 'browser:notification', {
                    title: notification.title,
                    message: notification.message,
                    priority: notification.priority,
                    timestamp: new Date().toISOString()
                })
            );
        }

        // Enviar por email (si está configurado)
        if (rule.channels.includes('email')) {
            promises.push(
                this.sendEmailNotification(empresaId, notification)
            );
        }

        await Promise.all(promises);
    }

    /**
     * Enviar notificación por email
     */
    async sendEmailNotification(empresaId, notification) {
        try {
            // Aquí se integraría con el servicio de email
            console.log(`📧 Enviando notificación por email: ${notification.title} para empresa ${empresaId}`);

            // Por ahora solo logueamos
            // TODO: Integrar con emailService cuando esté disponible

        } catch (error) {
            console.error('Error enviando notificación por email:', error);
        }
    }

    /**
     * Generar mensaje detallado para la notificación
     */
    generateDetailedMessage(rule, data) {
        switch (rule.id) {
            case 'license_critical':
                const criticalLicenses = data.filter(alert =>
                    alert.diasParaVencer <= 7 && alert.diasParaVencer >= 0
                );
                return `Licencia(s) próxima(s) a vencer: ${criticalLicenses.length} licencia(s)`;

            case 'documents_expired':
                const expiredDocs = data.filter(alert => alert.diasParaVencer < 0);
                return `Documento(s) vencido(s): ${expiredDocs.length} documento(s)`;

            case 'vehicle_maintenance':
                return `Vehículo(s) en mantenimiento: ${data.vehiculosEnMantenimiento}`;

            case 'drivers_inactive':
                return `Conductor(es) inactivo(s): ${data.conductoresInactivos}`;

            case 'trips_in_progress':
                return `Viaje(s) en curso: ${data.viajesEnCurso}`;

            default:
                return rule.message;
        }
    }

    /**
     * Obtener historial de notificaciones
     */
    getNotificationHistory(empresaId = null, limit = 50) {
        let notifications = [...this.notificationHistory];

        if (empresaId) {
            notifications = notifications.filter(n => n.empresaId === empresaId);
        }

        return notifications
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * Marcar notificación como leída
     */
    markAsRead(notificationId, empresaId) {
        const notification = this.notificationHistory.find(
            n => n.id === notificationId && n.empresaId === empresaId
        );

        if (notification) {
            notification.read = true;
            return true;
        }

        return false;
    }

    /**
     * Marcar notificación como reconocida
     */
    acknowledgeNotification(notificationId, empresaId) {
        const notification = this.notificationHistory.find(
            n => n.id === notificationId && n.empresaId === empresaId
        );

        if (notification) {
            notification.acknowledged = true;
            return true;
        }

        return false;
    }

    /**
     * Obtener estadísticas de notificaciones
     */
    getNotificationStats(empresaId = null) {
        let notifications = [...this.notificationHistory];

        if (empresaId) {
            notifications = notifications.filter(n => n.empresaId === empresaId);
        }

        const stats = {
            total: notifications.length,
            byPriority: {},
            byRule: {},
            unread: 0,
            acknowledged: 0,
            recent: notifications.slice(0, 10)
        };

        notifications.forEach(notification => {
            // Contar por prioridad
            stats.byPriority[notification.priority] =
                (stats.byPriority[notification.priority] || 0) + 1;

            // Contar por regla
            stats.byRule[notification.ruleId] =
                (stats.byRule[notification.ruleId] || 0) + 1;

            // Contar no leídas
            if (!notification.read) {
                stats.unread++;
            }

            // Contar reconocidas
            if (notification.acknowledged) {
                stats.acknowledged++;
            }
        });

        return stats;
    }

    /**
     * Limpiar notificaciones antiguas
     */
    cleanupOldNotifications(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const initialLength = this.notificationHistory.length;
        this.notificationHistory = this.notificationHistory.filter(
            notification => new Date(notification.timestamp) > cutoffDate
        );

        const removed = initialLength - this.notificationHistory.length;
        console.log(`🧹 Limpiadas ${removed} notificaciones antiguas`);
        return removed;
    }

    /**
     * Generar ID único para notificación
     */
    generateNotificationId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Agregar notificación al historial
     */
    addToNotificationHistory(notification) {
        this.notificationHistory.push(notification);

        // Mantener tamaño máximo del historial
        if (this.notificationHistory.length > 10000) {
            this.notificationHistory = this.notificationHistory.slice(-5000);
        }
    }

    /**
     * Configurar limpieza automática
     */
    startAutoCleanup() {
        // Limpiar notificaciones antiguas cada día
        setInterval(() => {
            this.cleanupOldNotifications();
        }, 24 * 60 * 60 * 1000);

        console.log('🧹 Limpieza automática de notificaciones configurada');
    }
}

module.exports = DashboardPushService;