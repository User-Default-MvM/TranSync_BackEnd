// src/controllers/profileController.js

const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// =====================================================
// GESTIÓN DE PERFIL DE USUARIO
// =====================================================

// 1. OBTENER PERFIL DEL USUARIO
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT
                u.idUsuario,
                u.nomUsuario,
                u.apeUsuario,
                u.email,
                u.telUsuario,
                u.numDocUsuario,
                u.idRol,
                r.nomRol,
                u.idEmpresa,
                e.nomEmpresa,
                u.estActivo,
                u.fecCreUsuario,
                u.fecUltModUsuario
            FROM Usuarios u
            JOIN Roles r ON u.idRol = r.idRol
            JOIN Empresas e ON u.idEmpresa = e.idEmpresa
            WHERE u.idUsuario = ? AND u.estActivo = 1
        `;

        const [rows] = await pool.query(query, [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "USER_NOT_FOUND",
                    message: "Usuario no encontrado"
                }
            });
        }

        const responseData = {
            success: true,
            data: {
                idUsuario: user.idUsuario,
                nomUsuario: user.nomUsuario || '',
                apeUsuario: user.apeUsuario || '',
                email: user.email || '',
                telUsuario: user.telUsuario || '',
                numDocUsuario: user.numDocUsuario || '',
                idRol: user.idRol,
                nomRol: user.nomRol || '',
                idEmpresa: user.idEmpresa,
                nomEmpresa: user.nomEmpresa || '',
                estActivo: user.estActivo,
                fecCreUsuario: user.fecCreUsuario,
                fecUltModUsuario: user.fecUltModUsuario
            }
        };
        res.json(responseData);

    } catch (error) {
        console.error("Error al obtener perfil:", error);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Error interno del servidor"
            }
        });
    }
};

// 2. ACTUALIZAR PERFIL DEL USUARIO
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { nomUsuario, apeUsuario, email, telUsuario } = req.body;

        // Validaciones
        if (!nomUsuario || !apeUsuario || !email || !telUsuario) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Todos los campos son requeridos",
                    details: {
                        nomUsuario: !nomUsuario ? "Nombre es requerido" : null,
                        apeUsuario: !apeUsuario ? "Apellido es requerido" : null,
                        email: !email ? "Email es requerido" : null,
                        telUsuario: !telUsuario ? "Teléfono es requerido" : null
                    }
                }
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Formato de email inválido"
                }
            });
        }

        // Validar teléfono
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(telUsuario.replace(/\s+/g, ''))) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Formato de teléfono inválido"
                }
            });
        }

        // Verificar si el email ya está en uso por otro usuario
        const [existingUser] = await pool.query(
            "SELECT idUsuario FROM Usuarios WHERE email = ? AND idUsuario != ?",
            [email, userId]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                error: {
                    code: "EMAIL_ALREADY_EXISTS",
                    message: "El email ya está en uso por otro usuario"
                }
            });
        }

        // Actualizar perfil
        const [result] = await pool.query(
            `UPDATE Usuarios SET
                nomUsuario = ?,
                apeUsuario = ?,
                email = ?,
                telUsuario = ?,
                fecUltModUsuario = CURRENT_TIMESTAMP
            WHERE idUsuario = ? AND estActivo = 1`,
            [nomUsuario, apeUsuario, email, telUsuario, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "USER_NOT_FOUND",
                    message: "Usuario no encontrado"
                }
            });
        }

        // Registrar actividad
        await pool.query(
            `INSERT INTO UserActivity (idUsuario, type, description, ipAddress, userAgent)
            VALUES (?, 'profile_update', 'Actualización de perfil personal', ?, ?)`,
            [userId, req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: "Perfil actualizado exitosamente",
            data: {
                idUsuario: userId,
                nomUsuario,
                apeUsuario,
                email,
                telUsuario,
                fecUltModUsuario: new Date()
            }
        });

    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Error interno del servidor"
            }
        });
    }
};

// 3. CAMBIAR CONTRASEÑA
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validaciones
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Todos los campos son requeridos"
                }
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Las contraseñas no coinciden"
                }
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "La nueva contraseña debe tener al menos 6 caracteres"
                }
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "La nueva contraseña debe ser diferente a la actual"
                }
            });
        }

        // Obtener contraseña actual del usuario
        const [rows] = await pool.query(
            "SELECT passwordHash FROM Usuarios WHERE idUsuario = ? AND estActivo = 1",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "USER_NOT_FOUND",
                    message: "Usuario no encontrado"
                }
            });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, rows[0].passwordHash);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "INVALID_CURRENT_PASSWORD",
                    message: "La contraseña actual es incorrecta"
                }
            });
        }

        // Hash de la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Actualizar contraseña
        const [result] = await pool.query(
            `UPDATE Usuarios SET
                passwordHash = ?,
                fecUltModUsuario = CURRENT_TIMESTAMP
            WHERE idUsuario = ? AND estActivo = 1`,
            [hashedPassword, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "USER_NOT_FOUND",
                    message: "Usuario no encontrado"
                }
            });
        }

        // Registrar actividad
        await pool.query(
            `INSERT INTO UserActivity (idUsuario, type, description, ipAddress, userAgent)
            VALUES (?, 'password_change', 'Cambio de contraseña exitoso', ?, ?)`,
            [userId, req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: "Contraseña cambiada exitosamente"
        });

    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Error interno del servidor"
            }
        });
    }
};

// 4. OBTENER PREFERENCIAS DEL USUARIO
const getPreferences = async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT preferences
            FROM UserPreferences
            WHERE idUsuario = ?
        `;

        const [rows] = await pool.query(query, [userId]);

        if (rows.length === 0) {
            // Retornar preferencias por defecto
            return res.json({
                success: true,
                data: {
                    theme: "light",
                    language: "es",
                    notifications: {
                        email: true,
                        push: false,
                        sms: true
                    },
                    dashboard: {
                        defaultView: "overview",
                        itemsPerPage: 15,
                        autoRefresh: true
                    }
                }
            });
        }

        const preferences = typeof rows[0].preferences === 'string'
            ? JSON.parse(rows[0].preferences)
            : rows[0].preferences;

        res.json({
            success: true,
            data: preferences
        });

    } catch (error) {
        console.error("Error al obtener preferencias:", error);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Error interno del servidor"
            }
        });
    }
};

// 5. ACTUALIZAR PREFERENCIAS DEL USUARIO
const updatePreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const preferences = req.body;

        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Preferencias inválidas"
                }
            });
        }

        const preferencesJson = JSON.stringify(preferences);

        const query = `
            INSERT INTO UserPreferences (idUsuario, preferences, updatedAt)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
            preferences = ?, updatedAt = CURRENT_TIMESTAMP
        `;

        await pool.query(query, [userId, preferencesJson, preferencesJson]);

        // Registrar actividad
        await pool.query(
            `INSERT INTO UserActivity (idUsuario, type, description, ipAddress, userAgent)
            VALUES (?, 'preferences_update', 'Actualización de preferencias', ?, ?)`,
            [userId, req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: "Preferencias actualizadas exitosamente",
            data: preferences
        });

    } catch (error) {
        console.error("Error al actualizar preferencias:", error);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Error interno del servidor"
            }
        });
    }
};

// 6. OBTENER CONFIGURACIÓN DE NOTIFICACIONES
const getNotificationSettings = async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT notificationSettings
            FROM NotificationSettings
            WHERE idUsuario = ?
        `;

        const [rows] = await pool.query(query, [userId]);

        if (rows.length === 0) {
            // Retornar configuración por defecto
            return res.json({
                success: true,
                data: {
                    newMessages: true,
                    systemUpdates: true,
                    securityAlerts: true,
                    maintenanceReminders: false,
                    reportNotifications: true,
                    emailFrequency: "immediate"
                }
            });
        }

        const settings = typeof rows[0].notificationSettings === 'string'
            ? JSON.parse(rows[0].notificationSettings)
            : rows[0].notificationSettings;

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error("Error al obtener configuración de notificaciones:", error);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Error interno del servidor"
            }
        });
    }
};

// 7. ACTUALIZAR CONFIGURACIÓN DE NOTIFICACIONES
const updateNotificationSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const settings = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Configuración de notificaciones inválida"
                }
            });
        }

        const settingsJson = JSON.stringify(settings);

        const query = `
            INSERT INTO NotificationSettings (idUsuario, notificationSettings, updatedAt)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
            notificationSettings = ?, updatedAt = CURRENT_TIMESTAMP
        `;

        await pool.query(query, [userId, settingsJson, settingsJson]);

        // Registrar actividad
        await pool.query(
            `INSERT INTO UserActivity (idUsuario, type, description, ipAddress, userAgent)
            VALUES (?, 'notifications_update', 'Actualización de configuración de notificaciones', ?, ?)`,
            [userId, req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: "Configuración de notificaciones actualizada",
            data: settings
        });

    } catch (error) {
        console.error("Error al actualizar configuración de notificaciones:", error);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Error interno del servidor"
            }
        });
    }
};

// 8. OBTENER INFORMACIÓN DE LA EMPRESA
const getCompanyInfo = async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT e.*
            FROM Empresas e
            JOIN Usuarios u ON e.idEmpresa = u.idEmpresa
            WHERE u.idUsuario = ? AND u.estActivo = 1
        `;

        const [rows] = await pool.query(query, [userId]);
        const company = rows[0];

        if (!company) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "COMPANY_NOT_FOUND",
                    message: "Información de empresa no encontrada"
                }
            });
        }

        res.json({
            success: true,
            data: {
                idEmpresa: company.idEmpresa,
                nomEmpresa: company.nomEmpresa,
                nitEmpresa: company.nitEmpresa,
                dirEmpresa: company.dirEmpresa,
                emaEmpresa: company.emaEmpresa,
                telEmpresa: company.telEmpresa,
                fecRegEmpresa: company.fecRegEmpresa
            }
        });

    } catch (error) {
        console.error("Error al obtener información de empresa:", error);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Error interno del servidor"
            }
        });
    }
};

// 9. OBTENER ACTIVIDAD DEL USUARIO
const getUserActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 10, offset = 0 } = req.query;

        const query = `
            SELECT
                id,
                type,
                description,
                timestamp,
                ipAddress,
                userAgent
            FROM UserActivity
            WHERE idUsuario = ?
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `;

        const [activities] = await pool.query(query, [userId, parseInt(limit), parseInt(offset)]);

        // Obtener total de actividades
        const [totalResult] = await pool.query(
            "SELECT COUNT(*) as total FROM UserActivity WHERE idUsuario = ?",
            [userId]
        );

        res.json({
            success: true,
            data: {
                totalActivities: totalResult[0].total,
                recentActivities: activities
            }
        });

    } catch (error) {
        console.error("Error al obtener actividad del usuario:", error);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Error interno del servidor"
            }
        });
    }
};

// 10. VERIFICAR ESTADO DE LA CUENTA
const getAccountStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT
                estActivo as isActive,
                1 as isVerified,
                fecCreUsuario as createdAt,
                fecUltModUsuario as lastLogin,
                DATEDIFF(CURRENT_DATE, fecCreUsuario) as daysSinceCreation,
                CASE
                    WHEN DATEDIFF(CURRENT_DATE, fecUltModUsuario) > 90 THEN 1
                    ELSE 0
                END as requiresPasswordChange
            FROM Usuarios
            WHERE idUsuario = ? AND estActivo = 1
        `;

        const [rows] = await pool.query(query, [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "USER_NOT_FOUND",
                    message: "Usuario no encontrado"
                }
            });
        }

        // Calcular puntuación de seguridad
        let securityScore = 100;
        if (!user.isActive) securityScore -= 30;
        if (user.requiresPasswordChange) securityScore -= 20;
        if (user.daysSinceCreation > 365) securityScore -= 10;

        res.json({
            success: true,
            data: {
                isVerified: user.isVerified === 1,
                isActive: user.isActive === 1,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                daysSinceCreation: user.daysSinceCreation,
                requiresPasswordChange: user.requiresPasswordChange === 1,
                securityScore: Math.max(0, securityScore)
            }
        });

    } catch (error) {
        console.error("Error al verificar estado de la cuenta:", error);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Error interno del servidor"
            }
        });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    getPreferences,
    updatePreferences,
    getNotificationSettings,
    updateNotificationSettings,
    getCompanyInfo,
    getUserActivity,
    getAccountStatus
};