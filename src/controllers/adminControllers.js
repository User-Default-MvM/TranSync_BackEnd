// src/controllers/adminControllers.js

const pool = require("../config/db");

const listarConductoresYPendientes = async (req, res) => {
    try {
        const idEmpresa = 1; // O obténlo del token si es necesario: req.user.idEmpresa;

        // CAMBIO: La consulta ahora busca roles 'CONDUCTOR' y 'PENDIENTE'
        const query = `
        SELECT 
            u.idUsuario, 
            u.email, 
            u.estActivo,
            u.nomUsuario,      -- CAMBIO: Seleccionamos los campos genéricos
            u.apeUsuario,      -- de la tabla Usuarios
            u.numDocUsuario,
            u.telUsuario,
            r.nomRol AS rol
        FROM Usuarios u
        JOIN Roles r ON u.idRol = r.idRol
        -- CAMBIO: Se eliminó el JOIN con la tabla inexistente 'Administradores'
        WHERE 
            r.nomRol IN ('CONDUCTOR', 'GESTOR') 
            AND u.idEmpresa = ?
            ORDER BY u.fecCreUsuario DESC
    `;

        const [usuarios] = await pool.query(query, [idEmpresa]);

        res.json(usuarios);
    } catch (error) {
        console.error("Error al listar usuarios (conductores/pendientes):", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};


const eliminarUsuario = async (req, res) => {
    const { idUsuario } = req.params;
    const connection = await pool.getConnection(); // Usamos una conexión para manejar la transacción

    try {
        await connection.beginTransaction(); // ¡Iniciamos una transacción!

        // 1. Averiguar el rol del usuario para saber de qué tabla de perfil borrarlo
        const [userRows] = await connection.query(
            `SELECT r.nomRol FROM Usuarios u 
             JOIN Roles r ON u.idRol = r.idRol 
             WHERE u.idUsuario = ?`,
            [idUsuario]
        );

        if (userRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Usuario no encontrado." });
        }
        
        const rol = userRows[0].nomRol;

        // 2. Eliminar el perfil secundario según el rol
        if (rol === 'GESTOR') {
            await connection.query("DELETE FROM Gestores WHERE idUsuario = ?", [idUsuario]);
        } else if (rol === 'CONDUCTOR') {
            await connection.query("DELETE FROM Conductores WHERE idUsuario = ?", [idUsuario]);
        }
        // Si hay más roles con tablas de perfil en el futuro, se añaden aquí

        // 3. Ahora que los perfiles secundarios fueron eliminados, borrar el usuario principal
        const [deleteResult] = await connection.query(
            "DELETE FROM Usuarios WHERE idUsuario = ?",
            [idUsuario]
        );
        
        if (deleteResult.affectedRows === 0) {
            // Esto no debería pasar si el paso 1 tuvo éxito, pero es una buena salvaguarda
            throw new Error("La eliminación del usuario principal falló.");
        }

        // 4. Si todo salió bien, confirmamos los cambios
        await connection.commit();
        res.json({ message: "Usuario y su perfil asociado han sido eliminados exitosamente." });

    } catch (error) {
        // Si algo falla en cualquier paso, revertimos TODOS los cambios
        await connection.rollback();
        console.error("Error al eliminar usuario (transacción revertida):", error);
        res.status(500).json({ message: "Error interno del servidor al intentar eliminar el usuario." });
    } finally {
        // Siempre liberamos la conexión al final
        connection.release();
    }
};

// ACTUALIZAR ROL (Update) - ¡NUEVA FUNCIÓN!
const actualizarRolUsuario = async (req, res) => {
    try {
        const { idUsuario } = req.params;
        const { nuevoRol } = req.body; // ej: "GESTOR"

        if (!nuevoRol) {
            return res.status(400).json({ message: "El nuevo rol es requerido." });
        }

        // 1. Buscamos el ID del rol en la base de datos
        const [roles] = await pool.query("SELECT idRol FROM Roles WHERE nomRol = ?", [nuevoRol]);
        
        if (roles.length === 0) {
            return res.status(404).json({ message: `El rol '${nuevoRol}' no es válido.` });
        }
        const idNuevoRol = roles[0].idRol;

        // 2. Actualizamos el usuario con el nuevo ID de rol
        const [result] = await pool.query(
            "UPDATE Usuarios SET idRol = ? WHERE idUsuario = ?",
            [idNuevoRol, idUsuario]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }
        
        res.json({ message: "Rol del usuario actualizado exitosamente." });

    } catch (error) {
        console.error("Error al actualizar el rol del usuario:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

const getUsers = async (req, res) => {
    try {
        const { role, status, search } = req.query;
        const idEmpresa = 1; // O obtener del token: req.user.idEmpresa

        let query = `
            SELECT
                u.idUsuario,
                u.email,
                u.estActivo,
                u.nomUsuario,
                u.apeUsuario,
                u.numDocUsuario,
                u.telUsuario,
                u.fecCreUsuario,
                r.nomRol AS rol
            FROM Usuarios u
            JOIN Roles r ON u.idRol = r.idRol
            WHERE u.idEmpresa = ?
        `;

        const params = [idEmpresa];

        // Aplicar filtros
        if (role) {
            query += ' AND r.nomRol = ?';
            params.push(role);
        }

        if (status !== undefined) {
            query += ' AND u.estActivo = ?';
            params.push(status === 'true' ? 1 : 0);
        }

        if (search) {
            query += ' AND (u.nomUsuario LIKE ? OR u.apeUsuario LIKE ? OR u.email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY u.fecCreUsuario DESC';

        const [usuarios] = await pool.query(query, params);
        res.json(usuarios);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

const getConductoresYGestionadores = async (req, res) => {
    try {
        const idEmpresa = 1; // O obtener del token: req.user.idEmpresa

        const query = `
            SELECT
                u.idUsuario,
                u.email,
                u.estActivo,
                u.nomUsuario,
                u.apeUsuario,
                u.numDocUsuario,
                u.telUsuario,
                r.nomRol AS rol
            FROM Usuarios u
            JOIN Roles r ON u.idRol = r.idRol
            WHERE r.nomRol IN ('CONDUCTOR', 'GESTOR')
            AND u.idEmpresa = ?
            ORDER BY u.fecCreUsuario DESC
        `;

        const [usuarios] = await pool.query(query, [idEmpresa]);
        res.json(usuarios);
    } catch (error) {
        console.error("Error al obtener conductores y gestores:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// GESTIÓN DE ROLES
const getRoles = async (req, res) => {
    try {
        const [roles] = await pool.query("SELECT * FROM Roles ORDER BY nomRol");
        res.json(roles);
    } catch (error) {
        console.error("Error al obtener roles:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

const createRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Nombre del rol es requerido' });
        }

        const [result] = await pool.query(
            "INSERT INTO Roles (nomRol, descripcion) VALUES (?, ?)",
            [name, description || '']
        );

        res.status(201).json({
            id: result.insertId,
            name,
            description: description || '',
            permissions: permissions || []
        });
    } catch (error) {
        console.error("Error al crear rol:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Nombre del rol es requerido' });
        }

        const [result] = await pool.query(
            "UPDATE Roles SET nomRol = ?, descripcion = ? WHERE idRol = ?",
            [name, description || '', id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Rol no encontrado." });
        }

        res.json({
            id: parseInt(id),
            name,
            description: description || '',
            permissions: permissions || []
        });
    } catch (error) {
        console.error("Error al actualizar rol:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si hay usuarios con este rol
        const [users] = await pool.query("SELECT COUNT(*) as count FROM Usuarios WHERE idRol = ?", [id]);

        if (users[0].count > 0) {
            return res.status(400).json({ message: "No se puede eliminar el rol porque hay usuarios asignados." });
        }

        const [result] = await pool.query("DELETE FROM Roles WHERE idRol = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Rol no encontrado." });
        }

        res.json({ message: "Rol eliminado exitosamente." });
    } catch (error) {
        console.error("Error al eliminar rol:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// ESTADÍSTICAS
const getStats = async (req, res) => {
    try {
        const idEmpresa = 1; // O obtener del token: req.user.idEmpresa

        // Estadísticas generales
        const [totalUsers] = await pool.query(
            "SELECT COUNT(*) as total FROM Usuarios WHERE idEmpresa = ?",
            [idEmpresa]
        );

        const [activeUsers] = await pool.query(
            "SELECT COUNT(*) as total FROM Usuarios WHERE idEmpresa = ? AND estActivo = 1",
            [idEmpresa]
        );

        const [inactiveUsers] = await pool.query(
            "SELECT COUNT(*) as total FROM Usuarios WHERE idEmpresa = ? AND estActivo = 0",
            [idEmpresa]
        );

        res.json({
            totalUsers: totalUsers[0].total,
            activeUsers: activeUsers[0].total,
            inactiveUsers: inactiveUsers[0].total,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error al obtener estadísticas:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

const getUserStats = async (req, res) => {
    try {
        const idEmpresa = 1; // O obtener del token: req.user.idEmpresa

        const [stats] = await pool.query(`
            SELECT
                r.nomRol,
                COUNT(*) as count,
                SUM(CASE WHEN u.estActivo = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN u.estActivo = 0 THEN 1 ELSE 0 END) as inactive
            FROM Usuarios u
            JOIN Roles r ON u.idRol = r.idRol
            WHERE u.idEmpresa = ?
            GROUP BY r.nomRol
        `, [idEmpresa]);

        res.json(stats);
    } catch (error) {
        console.error("Error al obtener estadísticas de usuarios:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

const getSystemStats = async (req, res) => {
    try {
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        res.json({
            uptime: uptime,
            memoryUsage: {
                rss: memoryUsage.rss,
                heapTotal: memoryUsage.heapTotal,
                heapUsed: memoryUsage.heapUsed,
                external: memoryUsage.external
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error al obtener estadísticas del sistema:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// CONFIGURACIÓN DEL SISTEMA
const getSystemConfig = async (req, res) => {
    try {
        // Por ahora devolver configuración básica
        res.json({
            maintenance: false,
            registrationEnabled: true,
            maxUsersPerCompany: 100,
            allowedRoles: ['CONDUCTOR', 'GESTOR', 'ADMINISTRADOR', 'SUPERADMIN'],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error al obtener configuración del sistema:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

const updateSystemConfig = async (req, res) => {
    try {
        const configData = req.body;

        // Por ahora solo devolver la configuración actualizada
        res.json({
            ...configData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error al actualizar configuración del sistema:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// LOGS Y AUDITORÍA
const getSystemLogs = async (req, res) => {
    try {
        const { level, limit = 50, offset = 0, startDate, endDate } = req.query;

        // Por ahora devolver logs simulados
        const logs = [
            {
                id: 1,
                level: 'INFO',
                message: 'Sistema iniciado correctamente',
                timestamp: new Date().toISOString()
            },
            {
                id: 2,
                level: 'WARN',
                message: 'Usuario intentó acceso no autorizado',
                timestamp: new Date(Date.now() - 3600000).toISOString()
            }
        ];

        res.json(logs);
    } catch (error) {
        console.error("Error al obtener logs del sistema:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

const getAuditLogs = async (req, res) => {
    try {
        const { userId, action, limit = 50, offset = 0 } = req.query;

        // Por ahora devolver logs de auditoría simulados
        const auditLogs = [
            {
                id: 1,
                userId: 1,
                action: 'LOGIN',
                details: 'Usuario inició sesión',
                timestamp: new Date().toISOString()
            },
            {
                id: 2,
                userId: 2,
                action: 'UPDATE_PROFILE',
                details: 'Usuario actualizó su perfil',
                timestamp: new Date(Date.now() - 1800000).toISOString()
            }
        ];

        res.json(auditLogs);
    } catch (error) {
        console.error("Error al obtener logs de auditoría:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// UTILIDADES
const checkAdminAccess = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Acceso de administrador verificado',
            user: req.user
        });
    } catch (error) {
        console.error("Error al verificar acceso de administrador:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

const healthCheck = async (req, res) => {
    try {
        // Verificar conexión a la base de datos
        await pool.query("SELECT 1");

        res.json({
            status: "OK",
            message: "Sistema de administración funcionando correctamente",
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        console.error("Error en health check del sistema de administración:", error);
        res.status(503).json({
            status: "ERROR",
            message: "Problemas de conexión con la base de datos",
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    listarConductoresYPendientes,
    eliminarUsuario,
    actualizarRolUsuario,
    getUsers,
    getConductoresYGestionadores,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    getStats,
    getUserStats,
    getSystemStats,
    getSystemConfig,
    updateSystemConfig,
    getSystemLogs,
    getAuditLogs,
    checkAdminAccess,
    healthCheck
};
