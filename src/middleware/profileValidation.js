// src/middleware/profileValidation.js

// =====================================================
// MIDDLEWARE DE VALIDACIÓN PARA PERFIL DE USUARIO
// =====================================================

// VALIDACIÓN DE DATOS DE PERFIL
const validateProfileData = (req, res, next) => {
    const { nomUsuario, apeUsuario, email, telUsuario } = req.body;
    const errors = [];

    // Validar nombre
    if (nomUsuario !== undefined) {
        if (!nomUsuario || typeof nomUsuario !== 'string') {
            errors.push('El nombre es requerido y debe ser una cadena de texto');
        } else if (nomUsuario.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        } else if (nomUsuario.trim().length > 80) {
            errors.push('El nombre no puede exceder 80 caracteres');
        } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nomUsuario.trim())) {
            errors.push('El nombre solo puede contener letras y espacios');
        }
    }

    // Validar apellido
    if (apeUsuario !== undefined) {
        if (!apeUsuario || typeof apeUsuario !== 'string') {
            errors.push('El apellido es requerido y debe ser una cadena de texto');
        } else if (apeUsuario.trim().length < 2) {
            errors.push('El apellido debe tener al menos 2 caracteres');
        } else if (apeUsuario.trim().length > 80) {
            errors.push('El apellido no puede exceder 80 caracteres');
        } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(apeUsuario.trim())) {
            errors.push('El apellido solo puede contener letras y espacios');
        }
    }

    // Validar email
    if (email !== undefined) {
        if (!email || typeof email !== 'string') {
            errors.push('El email es requerido y debe ser una cadena de texto');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('El formato del email es inválido');
        } else if (email.length > 80) {
            errors.push('El email no puede exceder 80 caracteres');
        }
    }

    // Validar teléfono
    if (telUsuario !== undefined) {
        if (!telUsuario || typeof telUsuario !== 'string') {
            errors.push('El teléfono es requerido y debe ser una cadena de texto');
        } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(telUsuario.replace(/\s+/g, ''))) {
            errors.push('El formato del teléfono es inválido');
        } else if (telUsuario.replace(/\s+/g, '').length < 7) {
            errors.push('El teléfono debe tener al menos 7 dígitos');
        } else if (telUsuario.replace(/\s+/g, '').length > 16) {
            errors.push('El teléfono no puede exceder 16 caracteres');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Errores de validación en los datos del perfil",
                details: errors
            }
        });
    }

    next();
};

// VALIDACIÓN DE CONTRASEÑA
const validatePasswordChange = (req, res, next) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const errors = [];

    // Validar contraseña actual
    if (!currentPassword || typeof currentPassword !== 'string') {
        errors.push('La contraseña actual es requerida');
    }

    // Validar nueva contraseña
    if (!newPassword || typeof newPassword !== 'string') {
        errors.push('La nueva contraseña es requerida');
    } else {
        if (newPassword.length < 6) {
            errors.push('La nueva contraseña debe tener al menos 6 caracteres');
        }
        if (newPassword.length > 255) {
            errors.push('La nueva contraseña no puede exceder 255 caracteres');
        }
        // Validar que no sea igual a la actual
        if (currentPassword && newPassword === currentPassword) {
            errors.push('La nueva contraseña debe ser diferente a la actual');
        }
    }

    // Validar confirmación de contraseña
    if (!confirmPassword || typeof confirmPassword !== 'string') {
        errors.push('La confirmación de contraseña es requerida');
    } else if (newPassword && confirmPassword !== newPassword) {
        errors.push('La confirmación de contraseña no coincide');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Errores de validación en el cambio de contraseña",
                details: errors
            }
        });
    }

    next();
};

// VALIDACIÓN DE PREFERENCIAS
const validatePreferences = (req, res, next) => {
    const preferences = req.body;

    if (!preferences || typeof preferences !== 'object') {
        return res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Las preferencias deben ser un objeto válido"
            }
        });
    }

    const errors = [];

    // Validar tema
    if (preferences.theme !== undefined) {
        if (!['light', 'dark'].includes(preferences.theme)) {
            errors.push('El tema debe ser "light" o "dark"');
        }
    }

    // Validar idioma
    if (preferences.language !== undefined) {
        if (!['es', 'en'].includes(preferences.language)) {
            errors.push('El idioma debe ser "es" o "en"');
        }
    }

    // Validar notificaciones
    if (preferences.notifications !== undefined) {
        if (typeof preferences.notifications !== 'object') {
            errors.push('Las notificaciones deben ser un objeto');
        } else {
            const validNotificationTypes = ['email', 'push', 'sms'];
            for (const [key, value] of Object.entries(preferences.notifications)) {
                if (!validNotificationTypes.includes(key)) {
                    errors.push(`Tipo de notificación inválido: ${key}`);
                }
                if (typeof value !== 'boolean') {
                    errors.push(`El valor de ${key} debe ser verdadero o falso`);
                }
            }
        }
    }

    // Validar dashboard
    if (preferences.dashboard !== undefined) {
        if (typeof preferences.dashboard !== 'object') {
            errors.push('La configuración del dashboard debe ser un objeto');
        } else {
            if (preferences.dashboard.defaultView !== undefined) {
                const validViews = ['overview', 'analytics', 'reports'];
                if (!validViews.includes(preferences.dashboard.defaultView)) {
                    errors.push('La vista por defecto debe ser "overview", "analytics" o "reports"');
                }
            }

            if (preferences.dashboard.itemsPerPage !== undefined) {
                const itemsPerPage = parseInt(preferences.dashboard.itemsPerPage);
                if (isNaN(itemsPerPage) || itemsPerPage < 5 || itemsPerPage > 100) {
                    errors.push('Los items por página deben ser un número entre 5 y 100');
                }
            }

            if (preferences.dashboard.autoRefresh !== undefined) {
                if (typeof preferences.dashboard.autoRefresh !== 'boolean') {
                    errors.push('El auto-refresh debe ser verdadero o falso');
                }
            }
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Errores de validación en las preferencias",
                details: errors
            }
        });
    }

    next();
};

// VALIDACIÓN DE CONFIGURACIÓN DE NOTIFICACIONES
const validateNotificationSettings = (req, res, next) => {
    const settings = req.body;

    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "La configuración de notificaciones debe ser un objeto válido"
            }
        });
    }

    const errors = [];
    const validSettings = [
        'newMessages', 'systemUpdates', 'securityAlerts',
        'maintenanceReminders', 'reportNotifications', 'emailFrequency'
    ];

    for (const [key, value] of Object.entries(settings)) {
        if (!validSettings.includes(key)) {
            errors.push(`Configuración inválida: ${key}`);
        } else {
            if (key === 'emailFrequency') {
                const validFrequencies = ['immediate', 'daily', 'weekly', 'monthly'];
                if (!validFrequencies.includes(value)) {
                    errors.push('La frecuencia de email debe ser "immediate", "daily", "weekly" o "monthly"');
                }
            } else {
                if (typeof value !== 'boolean') {
                    errors.push(`El valor de ${key} debe ser verdadero o falso`);
                }
            }
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Errores de validación en la configuración de notificaciones",
                details: errors
            }
        });
    }

    next();
};

// VALIDACIÓN DE QUERY PARAMETERS
const validateQueryParams = (req, res, next) => {
    const { limit, offset } = req.query;
    const errors = [];

    // Validar límite
    if (limit !== undefined) {
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            errors.push('El límite debe ser un número entre 1 y 100');
        }
    }

    // Validar offset
    if (offset !== undefined) {
        const offsetNum = parseInt(offset);
        if (isNaN(offsetNum) || offsetNum < 0) {
            errors.push('El offset debe ser un número mayor o igual a 0');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Errores de validación en los parámetros de consulta",
                details: errors
            }
        });
    }

    next();
};

module.exports = {
    validateProfileData,
    validatePasswordChange,
    validatePreferences,
    validateNotificationSettings,
    validateQueryParams
};