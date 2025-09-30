// Servicio de recuperación de sesión para manejar datos de usuario incompletos

const jwt = require('jsonwebtoken');
const { recoverUserData, generateCompleteToken, validateUserData } = require('../utils/auth');

class SessionRecoveryService {
    constructor() {
        this.recoveryAttempts = new Map();
        this.maxRecoveryAttempts = 3;
        this.recoveryTimeout = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Intentar recuperar sesión de usuario
     */
    async recoverUserSession(token, userId = null) {
        try {
            // Verificar límite de intentos de recuperación
            if (this.isRecoveryBlocked(userId || 'unknown')) {
                throw new Error('Demasiados intentos de recuperación. Espere antes de intentar nuevamente.');
            }

            let targetUserId = userId;

            // Si no se proporciona userId, intentar extraerlo del token
            if (!targetUserId) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    targetUserId = decoded.idUsuario;
                } catch (error) {
                    throw new Error('Token inválido y no se proporcionó ID de usuario');
                }
            }

            // Registrar intento de recuperación
            this.recordRecoveryAttempt(targetUserId);

            // Recuperar datos completos del usuario
            const completeUserData = await recoverUserData(targetUserId);

            // Validar datos recuperados
            const validation = validateUserData(completeUserData);
            if (!validation.isValid) {
                throw new Error(`No se pudieron recuperar todos los datos requeridos: ${validation.missingFields.join(', ')}`);
            }

            // Generar nuevo token con datos completos
            const newToken = generateCompleteToken(completeUserData);

            // Limpiar registro de intentos exitoso
            this.clearRecoveryAttempts(targetUserId);

            return {
                success: true,
                userData: completeUserData,
                token: newToken,
                recovered: true
            };

        } catch (error) {
            console.error('Error recuperando sesión de usuario:', error);
            return {
                success: false,
                error: error.message,
                canRetry: this.canRetryRecovery(userId || 'unknown')
            };
        }
    }

    /**
     * Verificar si la recuperación está bloqueada por demasiados intentos
     */
    isRecoveryBlocked(userId) {
        const attempts = this.recoveryAttempts.get(userId);
        if (!attempts) return false;

        const now = Date.now();
        const timeSinceFirstAttempt = now - attempts.firstAttempt;

        // Si han pasado más de 5 minutos, resetear contador
        if (timeSinceFirstAttempt > this.recoveryTimeout) {
            this.clearRecoveryAttempts(userId);
            return false;
        }

        return attempts.count >= this.maxRecoveryAttempts;
    }

    /**
     * Verificar si se puede intentar recuperación nuevamente
     */
    canRetryRecovery(userId) {
        return !this.isRecoveryBlocked(userId);
    }

    /**
     * Registrar intento de recuperación
     */
    recordRecoveryAttempt(userId) {
        const existing = this.recoveryAttempts.get(userId);

        if (existing) {
            const now = Date.now();
            const timeSinceFirstAttempt = now - existing.firstAttempt;

            // Si han pasado más de 5 minutos, resetear contador
            if (timeSinceFirstAttempt > this.recoveryTimeout) {
                this.recoveryAttempts.set(userId, {
                    count: 1,
                    firstAttempt: now,
                    lastAttempt: now
                });
            } else {
                existing.count++;
                existing.lastAttempt = now;
            }
        } else {
            this.recoveryAttempts.set(userId, {
                count: 1,
                firstAttempt: Date.now(),
                lastAttempt: Date.now()
            });
        }
    }

    /**
     * Limpiar registro de intentos de recuperación
     */
    clearRecoveryAttempts(userId) {
        this.recoveryAttempts.delete(userId);
    }

    /**
     * Obtener estadísticas de recuperación
     */
    getRecoveryStats() {
        const stats = {
            totalAttempts: 0,
            blockedUsers: 0,
            activeRecoveries: this.recoveryAttempts.size,
            attemptsByUser: {}
        };

        for (const [userId, attempts] of this.recoveryAttempts.entries()) {
            stats.totalAttempts += attempts.count;
            stats.attemptsByUser[userId] = attempts;

            if (attempts.count >= this.maxRecoveryAttempts) {
                stats.blockedUsers++;
            }
        }

        return stats;
    }

    /**
     * Limpiar usuarios bloqueados antiguos
     */
    cleanupBlockedUsers() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [userId, attempts] of this.recoveryAttempts.entries()) {
            const timeSinceFirstAttempt = now - attempts.firstAttempt;

            if (timeSinceFirstAttempt > this.recoveryTimeout) {
                this.recoveryAttempts.delete(userId);
                cleanedCount++;
            }
        }

        console.log(`🧹 Limpiados ${cleanedCount} usuarios bloqueados antiguos`);
        return cleanedCount;
    }

    /**
     * Configurar limpieza automática
     */
    startAutoCleanup() {
        // Limpiar usuarios bloqueados cada 10 minutos
        setInterval(() => {
            this.cleanupBlockedUsers();
        }, 10 * 60 * 1000);

        console.log('🧹 Limpieza automática de usuarios bloqueados configurada');
    }
}

// Crear instancia singleton
const sessionRecoveryService = new SessionRecoveryService();

// Iniciar limpieza automática
sessionRecoveryService.startAutoCleanup();

module.exports = sessionRecoveryService;