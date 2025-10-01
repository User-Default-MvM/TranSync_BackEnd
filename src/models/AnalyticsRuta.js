// src/models/AnalyticsRuta.js

const pool = require('../config/db');

/**
 * Modelo para analytics y métricas avanzadas de rutas
 */
class AnalyticsRuta {

    /**
     * Registrar uso de ruta
     */
    static async registrarUso(data) {
        try {
            const {
                idRuta,
                idUsuario,
                origenUbicacion,
                destinoUbicacion,
                distanciaRealKm,
                tiempoRealMin,
                tiempoEstimadoMin,
                calificacionViaje,
                comentarios,
                fechaHoraInicio,
                fechaHoraFin
            } = data;

            const [result] = await pool.query(`
                INSERT INTO analytics_ruta_uso
                (idRuta, idUsuario, origenUbicacion, destinoUbicacion, distanciaRealKm, tiempoRealMin,
                 tiempoEstimadoMin, calificacionViaje, comentarios, fechaHoraInicio, fechaHoraFin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [idRuta, idUsuario, origenUbicacion, destinoUbicacion, distanciaRealKm, tiempoRealMin,
                tiempoEstimadoMin, calificacionViaje, comentarios, fechaHoraInicio, fechaHoraFin]);

            // Actualizar contador de uso en tabla rutas
            await pool.query(`
                UPDATE Rutas
                SET usoContador = usoContador + 1
                WHERE idRuta = ?
            `, [idRuta]);

            return result.insertId;
        } catch (error) {
            console.error('Error registrando uso de ruta:', error);
            throw error;
        }
    }

    /**
     * Obtener métricas de rutas populares
     */
    static async obtenerRutasPopulares(fechaDesde, fechaHasta, limite = 10) {
        try {
            let query = `
                SELECT
                    r.idRuta,
                    r.nomRuta,
                    r.oriRuta,
                    r.desRuta,
                    COUNT(aru.idRegistro) as total_viajes,
                    AVG(aru.calificacionViaje) as calificacion_promedio,
                    AVG(aru.tiempoRealMin) as tiempo_promedio_real,
                    AVG(aru.tiempoEstimadoMin) as tiempo_promedio_estimado,
                    SUM(aru.distanciaRealKm) as distancia_total_recorrida
                FROM Rutas r
                LEFT JOIN analytics_ruta_uso aru ON r.idRuta = aru.idRuta
                WHERE 1=1
            `;
            let params = [];

            if (fechaDesde) {
                query += ' AND aru.fechaHoraInicio >= ?';
                params.push(fechaDesde);
            }

            if (fechaHasta) {
                query += ' AND aru.fechaHoraInicio <= ?';
                params.push(fechaHasta);
            }

            query += `
                GROUP BY r.idRuta, r.nomRuta, r.oriRuta, r.desRuta
                ORDER BY total_viajes DESC, calificacion_promedio DESC
                LIMIT ?
            `;
            params.push(limite);

            const [rutas] = await pool.query(query, params);
            return rutas;
        } catch (error) {
            console.error('Error obteniendo rutas populares:', error);
            throw error;
        }
    }

    /**
     * Obtener métricas de rendimiento de rutas
     */
    static async obtenerRendimientoRutas(fechaDesde, fechaHasta) {
        try {
            let query = `
                SELECT
                    r.idRuta,
                    r.nomRuta,
                    COUNT(aru.idRegistro) as total_viajes,
                    AVG(aru.tiempoRealMin) as tiempo_promedio_real,
                    AVG(aru.tiempoEstimadoMin) as tiempo_promedio_estimado,
                    AVG(aru.tiempoRealMin / aru.tiempoEstimadoMin) as ratio_tiempo_real_vs_estimado,
                    AVG(aru.distanciaRealKm) as distancia_promedio_real,
                    AVG(aru.calificacionViaje) as calificacion_promedio,
                    MIN(aru.fechaHoraInicio) as primer_viaje,
                    MAX(aru.fechaHoraInicio) as ultimo_viaje
                FROM Rutas r
                INNER JOIN analytics_ruta_uso aru ON r.idRuta = aru.idRuta
                WHERE 1=1
            `;
            let params = [];

            if (fechaDesde) {
                query += ' AND aru.fechaHoraInicio >= ?';
                params.push(fechaDesde);
            }

            if (fechaHasta) {
                query += ' AND aru.fechaHoraInicio <= ?';
                params.push(fechaHasta);
            }

            query += `
                GROUP BY r.idRuta, r.nomRuta
                ORDER BY total_viajes DESC
            `;

            const [rendimiento] = await pool.query(query, params);
            return rendimiento;
        } catch (error) {
            console.error('Error obteniendo rendimiento de rutas:', error);
            throw error;
        }
    }

    /**
     * Obtener patrones de uso por usuario
     */
    static async obtenerPatronesUsuario(idUsuario, fechaDesde, fechaHasta) {
        try {
            let query = `
                SELECT
                    r.idRuta,
                    r.nomRuta,
                    COUNT(*) as veces_usada,
                    AVG(aru.calificacionViaje) as calificacion_promedio,
                    AVG(aru.tiempoRealMin) as tiempo_promedio,
                    MIN(aru.fechaHoraInicio) as primer_uso,
                    MAX(aru.fechaHoraInicio) as ultimo_uso,
                    GROUP_CONCAT(DISTINCT DAYOFWEEK(aru.fechaHoraInicio) ORDER BY aru.fechaHoraInicio) as dias_semana,
                    GROUP_CONCAT(DISTINCT HOUR(aru.fechaHoraInicio) ORDER BY aru.fechaHoraInicio) as horas_uso
                FROM analytics_ruta_uso aru
                INNER JOIN Rutas r ON aru.idRuta = r.idRuta
                WHERE aru.idUsuario = ?
            `;
            let params = [idUsuario];

            if (fechaDesde) {
                query += ' AND aru.fechaHoraInicio >= ?';
                params.push(fechaDesde);
            }

            if (fechaHasta) {
                query += ' AND aru.fechaHoraInicio <= ?';
                params.push(fechaHasta);
            }

            query += `
                GROUP BY r.idRuta, r.nomRuta
                ORDER BY veces_usada DESC
            `;

            const [patrones] = await pool.query(query, params);
            return patrones;
        } catch (error) {
            console.error('Error obteniendo patrones de usuario:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas por período de tiempo
     */
    static async obtenerEstadisticasPorPeriodo(periodo = 'dia', fechaDesde, fechaHasta) {
        try {
            let groupBy;
            let dateFormat;

            switch (periodo) {
                case 'hora':
                    groupBy = 'HOUR(aru.fechaHoraInicio)';
                    dateFormat = '%Y-%m-%d %H:00:00';
                    break;
                case 'dia':
                    groupBy = 'DATE(aru.fechaHoraInicio)';
                    dateFormat = '%Y-%m-%d';
                    break;
                case 'semana':
                    groupBy = 'YEARWEEK(aru.fechaHoraInicio)';
                    dateFormat = '%Y-%u';
                    break;
                case 'mes':
                    groupBy = 'DATE_FORMAT(aru.fechaHoraInicio, "%Y-%m")';
                    dateFormat = '%Y-%m';
                    break;
                default:
                    groupBy = 'DATE(aru.fechaHoraInicio)';
                    dateFormat = '%Y-%m-%d';
            }

            let query = `
                SELECT
                    DATE_FORMAT(aru.fechaHoraInicio, '${dateFormat}') as periodo,
                    COUNT(*) as total_viajes,
                    COUNT(DISTINCT aru.idUsuario) as usuarios_unicos,
                    COUNT(DISTINCT aru.idRuta) as rutas_utilizadas,
                    AVG(aru.calificacionViaje) as calificacion_promedio,
                    AVG(aru.tiempoRealMin) as tiempo_promedio,
                    SUM(aru.distanciaRealKm) as distancia_total
                FROM analytics_ruta_uso aru
                WHERE 1=1
            `;
            let params = [];

            if (fechaDesde) {
                query += ' AND aru.fechaHoraInicio >= ?';
                params.push(fechaDesde);
            }

            if (fechaHasta) {
                query += ' AND aru.fechaHoraInicio <= ?';
                params.push(fechaHasta);
            }

            query += `
                GROUP BY ${groupBy}
                ORDER BY periodo DESC
            `;

            const [estadisticas] = await pool.query(query, params);
            return estadisticas;
        } catch (error) {
            console.error('Error obteniendo estadísticas por período:', error);
            throw error;
        }
    }

    /**
     * Obtener puntos de congestión recurrentes
     */
    static async obtenerPuntosCongestion(fechaDesde, fechaHasta) {
        try {
            // Esta consulta identifica áreas donde frecuentemente hay demoras
            let query = `
                SELECT
                    origenUbicacion->'$.lat' as latitud,
                    origenUbicacion->'$.lng' as longitud,
                    COUNT(*) as veces_reportado,
                    AVG(tiempoRealMin - tiempoEstimadoMin) as demora_promedio_min,
                    COUNT(DISTINCT idRuta) as rutas_afectadas
                FROM analytics_ruta_uso
                WHERE tiempoRealMin > tiempoEstimadoMin
            `;
            let params = [];

            if (fechaDesde) {
                query += ' AND fechaHoraInicio >= ?';
                params.push(fechaDesde);
            }

            if (fechaHasta) {
                query += ' AND fechaHoraInicio <= ?';
                params.push(fechaHasta);
            }

            query += `
                GROUP BY latitud, longitud
                HAVING veces_reportado >= 3
                ORDER BY demora_promedio_min DESC, veces_reportado DESC
            `;

            const [puntos] = await pool.query(query, params);
            return puntos;
        } catch (error) {
            console.error('Error obteniendo puntos de congestión:', error);
            throw error;
        }
    }

    /**
     * Obtener análisis de calificaciones
     */
    static async obtenerAnalisisCalificaciones(fechaDesde, fechaHasta) {
        try {
            let query = `
                SELECT
                    r.idRuta,
                    r.nomRuta,
                    COUNT(aru.calificacionViaje) as total_calificaciones,
                    AVG(aru.calificacionViaje) as calificacion_promedio,
                    MIN(aru.calificacionViaje) as calificacion_minima,
                    MAX(aru.calificacionViaje) as calificacion_maxima,
                    COUNT(CASE WHEN aru.calificacionViaje >= 4 THEN 1 END) as calificaciones_altas,
                    COUNT(CASE WHEN aru.calificacionViaje <= 2 THEN 1 END) as calificaciones_bajas,
                    GROUP_CONCAT(aru.comentarios SEPARATOR '||') as comentarios
                FROM Rutas r
                LEFT JOIN analytics_ruta_uso aru ON r.idRuta = aru.idRuta
                WHERE aru.calificacionViaje IS NOT NULL
            `;
            let params = [];

            if (fechaDesde) {
                query += ' AND aru.fechaHoraInicio >= ?';
                params.push(fechaDesde);
            }

            if (fechaHasta) {
                query += ' AND aru.fechaHoraInicio <= ?';
                params.push(fechaHasta);
            }

            query += `
                GROUP BY r.idRuta, r.nomRuta
                ORDER BY calificacion_promedio DESC
            `;

            const [analisis] = await pool.query(query, params);
            return analisis;
        } catch (error) {
            console.error('Error obteniendo análisis de calificaciones:', error);
            throw error;
        }
    }

    /**
     * Obtener métricas de usuario específico
     */
    static async obtenerMetricasUsuario(idUsuario, fechaDesde, fechaHasta) {
        try {
            let query = `
                SELECT
                    COUNT(*) as total_viajes,
                    COUNT(DISTINCT idRuta) as rutas_utilizadas,
                    SUM(distanciaRealKm) as distancia_total_km,
                    AVG(tiempoRealMin) as tiempo_promedio_min,
                    AVG(calificacionViaje) as calificacion_promedio,
                    MIN(fechaHoraInicio) as primer_viaje,
                    MAX(fechaHoraInicio) as ultimo_viaje,
                    COUNT(CASE WHEN calificacionViaje >= 4 THEN 1 END) as viajes_bien_calificados,
                    COUNT(CASE WHEN comentarios IS NOT NULL AND comentarios != '' THEN 1 END) as viajes_con_comentarios
                FROM analytics_ruta_uso
                WHERE idUsuario = ?
            `;
            let params = [idUsuario];

            if (fechaDesde) {
                query += ' AND fechaHoraInicio >= ?';
                params.push(fechaDesde);
            }

            if (fechaHasta) {
                query += ' AND fechaHoraInicio <= ?';
                params.push(fechaHasta);
            }

            const [metricas] = await pool.query(query, params);
            return metricas[0];
        } catch (error) {
            console.error('Error obteniendo métricas de usuario:', error);
            throw error;
        }
    }
}

module.exports = AnalyticsRuta;