// src/models/UbicacionUsuario.js

const pool = require('../config/db');

/**
 * Modelo para gestionar ubicaciones de usuarios con funcionalidades GPS
 */
class UbicacionUsuario {

    /**
     * Crear nueva ubicación de usuario
     */
    static async crear(data) {
        try {
            const {
                idUsuario,
                latitud,
                longitud,
                precisionMetros,
                velocidadKmh,
                rumboGrados,
                fuenteUbicacion = 'GPS',
                dispositivoInfo
            } = data;

            const [result] = await pool.query(`
                INSERT INTO ubicaciones_usuario
                (idUsuario, latitud, longitud, precisionMetros, velocidadKmh, rumboGrados, fuenteUbicacion, dispositivoInfo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [idUsuario, latitud, longitud, precisionMetros, velocidadKmh, rumboGrados, fuenteUbicacion, dispositivoInfo]);

            return result.insertId;
        } catch (error) {
            console.error('Error creando ubicación de usuario:', error);
            throw error;
        }
    }

    /**
     * Obtener historial de ubicaciones de un usuario
     */
    static async obtenerHistorialUsuario(idUsuario, opciones = {}) {
        try {
            const { limite = 100, fechaDesde, fechaHasta } = opciones;

            let query = `
                SELECT * FROM ubicaciones_usuario
                WHERE idUsuario = ?
            `;
            let params = [idUsuario];

            if (fechaDesde) {
                query += ' AND fechaHora >= ?';
                params.push(fechaDesde);
            }

            if (fechaHasta) {
                query += ' AND fechaHora <= ?';
                params.push(fechaHasta);
            }

            query += ' ORDER BY fechaHora DESC LIMIT ?';
            params.push(limite);

            const [ubicaciones] = await pool.query(query, params);
            return ubicaciones;
        } catch (error) {
            console.error('Error obteniendo historial de ubicaciones:', error);
            throw error;
        }
    }

    /**
     * Actualizar ubicación de usuario
     */
    static async actualizar(idUsuario, data) {
        try {
            const {
                latitud,
                longitud,
                precisionMetros,
                velocidadKmh,
                rumboGrados,
                fuenteUbicacion,
                dispositivoInfo
            } = data;

            const [result] = await pool.query(`
                UPDATE ubicaciones_usuario
                SET latitud = ?, longitud = ?, precisionMetros = ?, velocidadKmh = ?,
                    rumboGrados = ?, fuenteUbicacion = ?, dispositivoInfo = ?,
                    fechaHora = CURRENT_TIMESTAMP
                WHERE idUsuario = ?
            `, [latitud, longitud, precisionMetros, velocidadKmh, rumboGrados,
                fuenteUbicacion, dispositivoInfo, idUsuario]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error actualizando ubicación de usuario:', error);
            throw error;
        }
    }

    /**
     * Obtener ubicación más reciente de un usuario
     */
    static async obtenerUltimaUbicacion(idUsuario) {
        try {
            const [ubicaciones] = await pool.query(`
                SELECT * FROM ubicaciones_usuario
                WHERE idUsuario = ?
                ORDER BY fechaHora DESC
                LIMIT 1
            `, [idUsuario]);

            return ubicaciones[0] || null;
        } catch (error) {
            console.error('Error obteniendo última ubicación:', error);
            throw error;
        }
    }

    /**
     * Obtener usuarios cercanos a una ubicación
     */
    static async obtenerUsuariosCercanos(latitud, longitud, radioKm = 5) {
        try {
            // Esta consulta requiere una función de distancia que implementaremos después
            const [usuarios] = await pool.query(`
                SELECT
                    uu.idUsuario,
                    u.nomUsuario,
                    uu.latitud,
                    uu.longitud,
                    uu.fechaHora as ultima_ubicacion,
                    TIMESTAMPDIFF(MINUTE, uu.fechaHora, NOW()) as minutos_desde_ultima
                FROM ubicaciones_usuario uu
                INNER JOIN Usuarios u ON uu.idUsuario = u.idUsuario
                WHERE uu.fechaHora >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
                AND calcular_distancia_haversine(uu.latitud, uu.longitud, ?, ?) <= ?
                ORDER BY calcular_distancia_haversine(uu.latitud, uu.longitud, ?, ?) ASC
            `, [latitud, longitud, radioKm, latitud, longitud]);

            return usuarios;
        } catch (error) {
            console.error('Error obteniendo usuarios cercanos:', error);
            throw error;
        }
    }

    /**
     * Limpiar ubicaciones antiguas (mayores a días especificados)
     */
    static async limpiarUbicacionesAntiguas(dias = 30) {
        try {
            const [result] = await pool.query(`
                DELETE FROM ubicaciones_usuario
                WHERE fechaHora < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [dias]);

            return result.affectedRows;
        } catch (error) {
            console.error('Error limpiando ubicaciones antiguas:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de ubicaciones por usuario
     */
    static async obtenerEstadisticasUsuario(idUsuario, fechaDesde, fechaHasta) {
        try {
            let query = `
                SELECT
                    COUNT(*) as total_ubicaciones,
                    MIN(fechaHora) as primera_ubicacion,
                    MAX(fechaHora) as ultima_ubicacion,
                    AVG(precisionMetros) as precision_promedio,
                    AVG(velocidadKmh) as velocidad_promedio,
                    COUNT(DISTINCT DATE(fechaHora)) as dias_activo
                FROM ubicaciones_usuario
                WHERE idUsuario = ?
            `;
            let params = [idUsuario];

            if (fechaDesde) {
                query += ' AND fechaHora >= ?';
                params.push(fechaDesde);
            }

            if (fechaHasta) {
                query += ' AND fechaHora <= ?';
                params.push(fechaHasta);
            }

            const [estadisticas] = await pool.query(query, params);
            return estadisticas[0];
        } catch (error) {
            console.error('Error obteniendo estadísticas de ubicaciones:', error);
            throw error;
        }
    }
}

module.exports = UbicacionUsuario;