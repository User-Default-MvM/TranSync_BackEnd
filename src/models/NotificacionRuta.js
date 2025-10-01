// src/models/NotificacionRuta.js

const pool = require('../config/db');

/**
 * Modelo para gestionar notificaciones de rutas en tiempo real
 */
class NotificacionRuta {

    /**
     * Crear nueva notificación de ruta
     */
    static async crear(data) {
        try {
            const {
                idRuta,
                tipoNotificacion,
                titulo,
                mensaje,
                prioridad = 'NORMAL',
                ubicacionAfectada,
                tiempoInicio,
                tiempoFin,
                activa = true
            } = data;

            const [result] = await pool.query(`
                INSERT INTO notificaciones_ruta
                (idRuta, tipoNotificacion, titulo, mensaje, prioridad, ubicacionAfectada, tiempoInicio, tiempoFin, activa)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [idRuta, tipoNotificacion, titulo, mensaje, prioridad, ubicacionAfectada, tiempoInicio, tiempoFin, activa]);

            return result.insertId;
        } catch (error) {
            console.error('Error creando notificación de ruta:', error);
            throw error;
        }
    }

    /**
     * Obtener notificaciones activas de una ruta
     */
    static async obtenerActivasPorRuta(idRuta) {
        try {
            const [notificaciones] = await pool.query(`
                SELECT * FROM notificaciones_ruta
                WHERE idRuta = ?
                AND activa = true
                AND (tiempoInicio IS NULL OR tiempoInicio <= NOW())
                AND (tiempoFin IS NULL OR tiempoFin >= NOW())
                ORDER BY prioridad DESC, fechaCreacion DESC
            `, [idRuta]);

            return notificaciones;
        } catch (error) {
            console.error('Error obteniendo notificaciones activas:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las notificaciones activas
     */
    static async obtenerTodasActivas() {
        try {
            const [notificaciones] = await pool.query(`
                SELECT
                    nr.*,
                    r.nomRuta,
                    r.oriRuta,
                    r.desRuta
                FROM notificaciones_ruta nr
                INNER JOIN Rutas r ON nr.idRuta = r.idRuta
                WHERE nr.activa = true
                AND (nr.tiempoInicio IS NULL OR nr.tiempoInicio <= NOW())
                AND (nr.tiempoFin IS NULL OR nr.tiempoFin >= NOW())
                ORDER BY nr.prioridad DESC, nr.fechaCreacion DESC
            `);

            return notificaciones;
        } catch (error) {
            console.error('Error obteniendo todas las notificaciones activas:', error);
            throw error;
        }
    }

    /**
     * Obtener notificaciones por tipo
     */
    static async obtenerPorTipo(tipoNotificacion, activas = true) {
        try {
            let query = `
                SELECT
                    nr.*,
                    r.nomRuta
                FROM notificaciones_ruta nr
                INNER JOIN Rutas r ON nr.idRuta = r.idRuta
                WHERE nr.tipoNotificacion = ?
            `;
            let params = [tipoNotificacion];

            if (activas) {
                query += `
                    AND nr.activa = true
                    AND (nr.tiempoInicio IS NULL OR nr.tiempoInicio <= NOW())
                    AND (nr.tiempoFin IS NULL OR nr.tiempoFin >= NOW())
                `;
            }

            query += ' ORDER BY nr.fechaCreacion DESC';

            const [notificaciones] = await pool.query(query, params);
            return notificaciones;
        } catch (error) {
            console.error('Error obteniendo notificaciones por tipo:', error);
            throw error;
        }
    }

    /**
     * Obtener notificaciones por prioridad
     */
    static async obtenerPorPrioridad(prioridad, activas = true) {
        try {
            let query = `
                SELECT * FROM notificaciones_ruta
                WHERE prioridad = ?
            `;
            let params = [prioridad];

            if (activas) {
                query += `
                    AND activa = true
                    AND (tiempoInicio IS NULL OR tiempoInicio <= NOW())
                    AND (tiempoFin IS NULL OR tiempoFin >= NOW())
                `;
            }

            query += ' ORDER BY fechaCreacion DESC';

            const [notificaciones] = await pool.query(query, params);
            return notificaciones;
        } catch (error) {
            console.error('Error obteniendo notificaciones por prioridad:', error);
            throw error;
        }
    }

    /**
     * Actualizar notificación
     */
    static async actualizar(idNotificacion, data) {
        try {
            const campos = [];
            const valores = [];

            Object.keys(data).forEach(campo => {
                if (data[campo] !== undefined) {
                    campos.push(`${campo} = ?`);
                    valores.push(data[campo]);
                }
            });

            if (campos.length === 0) {
                throw new Error('No hay campos para actualizar');
            }

            valores.push(idNotificacion);

            const [result] = await pool.query(`
                UPDATE notificaciones_ruta
                SET ${campos.join(', ')}
                WHERE idNotificacion = ?
            `, valores);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error actualizando notificación:', error);
            throw error;
        }
    }

    /**
     * Desactivar notificación
     */
    static async desactivar(idNotificacion) {
        try {
            const [result] = await pool.query(`
                UPDATE notificaciones_ruta
                SET activa = false
                WHERE idNotificacion = ?
            `, [idNotificacion]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error desactivando notificación:', error);
            throw error;
        }
    }

    /**
     * Obtener notificación por ID
     */
    static async obtenerPorId(idNotificacion) {
        try {
            const [notificaciones] = await pool.query(`
                SELECT
                    nr.*,
                    r.nomRuta,
                    r.oriRuta,
                    r.desRuta
                FROM notificaciones_ruta nr
                INNER JOIN Rutas r ON nr.idRuta = r.idRuta
                WHERE nr.idNotificacion = ?
            `, [idNotificacion]);

            return notificaciones[0] || null;
        } catch (error) {
            console.error('Error obteniendo notificación:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de notificaciones
     */
    static async obtenerEstadisticas(fechaDesde, fechaHasta) {
        try {
            let query = `
                SELECT
                    tipoNotificacion,
                    prioridad,
                    COUNT(*) as total,
                    COUNT(CASE WHEN activa = true THEN 1 END) as activas,
                    COUNT(CASE WHEN activa = false THEN 1 END) as inactivas
                FROM notificaciones_ruta
                WHERE 1=1
            `;
            let params = [];

            if (fechaDesde) {
                query += ' AND fechaCreacion >= ?';
                params.push(fechaDesde);
            }

            if (fechaHasta) {
                query += ' AND fechaCreacion <= ?';
                params.push(fechaHasta);
            }

            query += ' GROUP BY tipoNotificacion, prioridad ORDER BY tipoNotificacion, prioridad';

            const [estadisticas] = await pool.query(query, params);
            return estadisticas;
        } catch (error) {
            console.error('Error obteniendo estadísticas de notificaciones:', error);
            throw error;
        }
    }

    /**
     * Limpiar notificaciones antiguas
     */
    static async limpiarAntiguas(dias = 90) {
        try {
            const [result] = await pool.query(`
                DELETE FROM notificaciones_ruta
                WHERE activa = false
                AND fechaCreacion < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [dias]);

            return result.affectedRows;
        } catch (error) {
            console.error('Error limpiando notificaciones antiguas:', error);
            throw error;
        }
    }

    /**
     * Obtener notificaciones en área geográfica
     */
    static async obtenerEnArea(latitud, longitud, radioKm = 10) {
        try {
            const [notificaciones] = await pool.query(`
                SELECT
                    nr.*,
                    r.nomRuta,
                    calcular_distancia_haversine(?, ?, nr.ubicacionAfectada->'$.lat', nr.ubicacionAfectada->'$.lng') as distancia_km
                FROM notificaciones_ruta nr
                INNER JOIN Rutas r ON nr.idRuta = r.idRuta
                WHERE nr.activa = true
                AND nr.ubicacionAfectada IS NOT NULL
                AND (nr.tiempoInicio IS NULL OR nr.tiempoInicio <= NOW())
                AND (nr.tiempoFin IS NULL OR nr.tiempoFin >= NOW())
                AND calcular_distancia_haversine(?, ?, nr.ubicacionAfectada->'$.lat', nr.ubicacionAfectada->'$.lng') <= ?
                ORDER BY distancia_km ASC
            `, [latitud, longitud, latitud, longitud, radioKm]);

            return notificaciones;
        } catch (error) {
            console.error('Error obteniendo notificaciones en área:', error);
            throw error;
        }
    }
}

module.exports = NotificacionRuta;