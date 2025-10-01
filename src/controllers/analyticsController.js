// src/controllers/analyticsController.js

const AnalyticsRuta = require('../models/AnalyticsRuta');

/**
 * Controlador para analytics y métricas avanzadas de rutas
 */
class AnalyticsController {

    /**
     * GET /api/analytics/rutas/populares
     * Obtener rutas más utilizadas por período de tiempo
     */
    static async obtenerRutasPopulares(req, res) {
        try {
            const { fechaDesde, fechaHasta, limite = 10 } = req.query;

            const rutasPopulares = await AnalyticsRuta.obtenerRutasPopulares(
                fechaDesde,
                fechaHasta,
                parseInt(limite)
            );

            res.json({
                rutas: rutasPopulares,
                total: rutasPopulares.length,
                periodo: {
                    fechaDesde,
                    fechaHasta
                },
                limite: parseInt(limite),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo rutas populares:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/analytics/rutas/rendimiento
     * Obtener métricas de rendimiento de rutas
     */
    static async obtenerRendimientoRutas(req, res) {
        try {
            const { fechaDesde, fechaHasta } = req.query;

            const rendimiento = await AnalyticsRuta.obtenerRendimientoRutas(fechaDesde, fechaHasta);

            res.json({
                rendimiento,
                totalRutas: rendimiento.length,
                periodo: {
                    fechaDesde,
                    fechaHasta
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo rendimiento de rutas:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/analytics/usuarios/patrones
     * Obtener patrones de uso de transporte público por usuario
     */
    static async obtenerPatronesUsuario(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const { fechaDesde, fechaHasta } = req.query;

            const patrones = await AnalyticsRuta.obtenerPatronesUsuario(
                idUsuario,
                fechaDesde,
                fechaHasta
            );

            res.json({
                usuario: idUsuario,
                patrones,
                totalPatrones: patrones.length,
                periodo: {
                    fechaDesde,
                    fechaHasta
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo patrones de usuario:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/analytics/usuarios/{id}/metricas
     * Obtener métricas específicas de un usuario
     */
    static async obtenerMetricasUsuario(req, res) {
        try {
            const { id } = req.params; // idUsuario
            const { fechaDesde, fechaHasta } = req.query;

            // Verificar permisos (usuarios solo pueden ver sus propias métricas, admins pueden ver todas)
            if (req.usuario.idRol !== 1 && req.usuario.idUsuario !== parseInt(id)) {
                return res.status(403).json({
                    error: 'Acceso denegado. Solo puedes ver tus propias métricas.'
                });
            }

            const metricas = await AnalyticsRuta.obtenerMetricasUsuario(
                parseInt(id),
                fechaDesde,
                fechaHasta
            );

            res.json({
                usuario: parseInt(id),
                metricas,
                periodo: {
                    fechaDesde,
                    fechaHasta
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo métricas de usuario:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/analytics/periodo
     * Obtener estadísticas por período de tiempo
     */
    static async obtenerEstadisticasPorPeriodo(req, res) {
        try {
            const {
                periodo = 'dia',
                fechaDesde,
                fechaHasta
            } = req.query;

            // Validar período
            const periodosValidos = ['hora', 'dia', 'semana', 'mes'];
            if (!periodosValidos.includes(periodo)) {
                return res.status(400).json({
                    error: `Período inválido. Valores permitidos: ${periodosValidos.join(', ')}`
                });
            }

            const estadisticas = await AnalyticsRuta.obtenerEstadisticasPorPeriodo(
                periodo,
                fechaDesde,
                fechaHasta
            );

            res.json({
                periodo,
                estadisticas,
                totalPeriodos: estadisticas.length,
                filtros: {
                    fechaDesde,
                    fechaHasta
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas por período:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/analytics/congestion
     * Obtener puntos de congestión recurrentes
     */
    static async obtenerPuntosCongestion(req, res) {
        try {
            const { fechaDesde, fechaHasta } = req.query;

            const puntosCongestion = await AnalyticsRuta.obtenerPuntosCongestion(fechaDesde, fechaHasta);

            res.json({
                puntosCongestion,
                totalPuntos: puntosCongestion.length,
                periodo: {
                    fechaDesde,
                    fechaHasta
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo puntos de congestión:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/analytics/calificaciones
     * Obtener análisis de calificaciones
     */
    static async obtenerAnalisisCalificaciones(req, res) {
        try {
            const { fechaDesde, fechaHasta } = req.query;

            const analisis = await AnalyticsRuta.obtenerAnalisisCalificaciones(fechaDesde, fechaHasta);

            res.json({
                analisis,
                totalRutas: analisis.length,
                periodo: {
                    fechaDesde,
                    fechaHasta
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo análisis de calificaciones:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * POST /api/analytics/viaje
     * Registrar viaje completo para analytics
     */
    static async registrarViaje(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const {
                idRuta,
                origenUbicacion,
                destinoUbicacion,
                distanciaRealKm,
                tiempoRealMin,
                tiempoEstimadoMin,
                calificacionViaje,
                comentarios
            } = req.body;

            // Validaciones básicas
            if (!idRuta || !origenUbicacion || !destinoUbicacion) {
                return res.status(400).json({
                    error: 'ID de ruta, ubicación de origen y destino son requeridos'
                });
            }

            // Validar calificación si está presente
            if (calificacionViaje !== undefined &&
                (calificacionViaje < 1 || calificacionViaje > 5)) {
                return res.status(400).json({
                    error: 'La calificación debe estar entre 1 y 5'
                });
            }

            const idRegistro = await AnalyticsRuta.registrarUso({
                idRuta,
                idUsuario,
                origenUbicacion,
                destinoUbicacion,
                distanciaRealKm,
                tiempoRealMin,
                tiempoEstimadoMin,
                calificacionViaje,
                comentarios,
                fechaHoraInicio: new Date(),
                fechaHoraFin: new Date()
            });

            res.status(201).json({
                mensaje: 'Viaje registrado exitosamente para análisis',
                idRegistro,
                timestamp: new Date().toISOString(),
                registradoPor: idUsuario
            });

        } catch (error) {
            console.error('Error registrando viaje:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/analytics/dashboard
     * Obtener datos para dashboard de analytics
     */
    static async obtenerDatosDashboard(req, res) {
        try {
            const { fechaDesde, fechaHasta } = req.query;

            // Obtener múltiples métricas en paralelo
            const [
                rutasPopulares,
                rendimientoRutas,
                puntosCongestion,
                analisisCalificaciones
            ] = await Promise.all([
                AnalyticsRuta.obtenerRutasPopulares(fechaDesde, fechaHasta, 5),
                AnalyticsRuta.obtenerRendimientoRutas(fechaDesde, fechaHasta),
                AnalyticsRuta.obtenerPuntosCongestion(fechaDesde, fechaHasta),
                AnalyticsRuta.obtenerAnalisisCalificaciones(fechaDesde, fechaHasta)
            ]);

            res.json({
                resumen: {
                    rutasMasPopulares: rutasPopulares.length,
                    rutasAnalizadas: rendimientoRutas.length,
                    puntosCongestion: puntosCongestion.length,
                    rutasConCalificaciones: analisisCalificaciones.length
                },
                rutasPopulares,
                rendimientoRutas,
                puntosCongestion,
                analisisCalificaciones,
                periodo: {
                    fechaDesde,
                    fechaHasta
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo datos de dashboard:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/analytics/exportar
     * Exportar datos de analytics (formato CSV o JSON)
     */
    static async exportarDatos(req, res) {
        try {
            const {
                tipo = 'rutas-populares',
                formato = 'json',
                fechaDesde,
                fechaHasta
            } = req.query;

            let datos;

            // Obtener datos según el tipo solicitado
            switch (tipo) {
                case 'rutas-populares':
                    datos = await AnalyticsRuta.obtenerRutasPopulares(fechaDesde, fechaHasta, 1000);
                    break;
                case 'rendimiento':
                    datos = await AnalyticsRuta.obtenerRendimientoRutas(fechaDesde, fechaHasta);
                    break;
                case 'congestion':
                    datos = await AnalyticsRuta.obtenerPuntosCongestion(fechaDesde, fechaHasta);
                    break;
                case 'calificaciones':
                    datos = await AnalyticsRuta.obtenerAnalisisCalificaciones(fechaDesde, fechaHasta);
                    break;
                default:
                    return res.status(400).json({
                        error: 'Tipo de datos no válido'
                    });
            }

            // Formatear respuesta según formato solicitado
            if (formato === 'csv') {
                // Convertir a CSV
                const csv = this.convertirACSV(datos);

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${tipo}-${new Date().toISOString().split('T')[0]}.csv"`);
                res.send(csv);

            } else {
                // Formato JSON por defecto
                res.json({
                    tipo,
                    formato,
                    datos,
                    totalRegistros: datos.length,
                    periodo: {
                        fechaDesde,
                        fechaHasta
                    },
                    exportado: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error('Error exportando datos:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * Convertir datos a formato CSV
     */
    static convertirACSV(datos) {
        if (datos.length === 0) return '';

        // Obtener encabezados de la primera fila
        const encabezados = Object.keys(datos[0]);

        // Crear línea de encabezados
        const csvEncabezados = encabezados.join(',');

        // Crear líneas de datos
        const csvDatos = datos.map(fila => {
            return encabezados.map(encabezado => {
                let valor = fila[encabezado];

                // Escapar valores que contienen comas o comillas
                if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"'))) {
                    valor = `"${valor.replace(/"/g, '""')}"`;
                }

                return valor;
            }).join(',');
        }).join('\n');

        return `${csvEncabezados}\n${csvDatos}`;
    }

    /**
     * GET /api/analytics/usuarios/activos
     * Obtener usuarios más activos
     */
    static async obtenerUsuariosActivos(req, res) {
        try {
            const { fechaDesde, fechaHasta, limite = 10 } = req.query;

            const pool = require('../config/db');

            let query = `
                SELECT
                    u.idUsuario,
                    u.nomUsuario,
                    u.apeUsuario,
                    COUNT(aru.idRegistro) as total_viajes,
                    SUM(aru.distanciaRealKm) as distancia_total_km,
                    AVG(aru.calificacionViaje) as calificacion_promedio,
                    MIN(aru.fechaHoraInicio) as primer_viaje,
                    MAX(aru.fechaHoraInicio) as ultimo_viaje
                FROM Usuarios u
                INNER JOIN analytics_ruta_uso aru ON u.idUsuario = aru.idUsuario
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
                GROUP BY u.idUsuario, u.nomUsuario, u.apeUsuario
                ORDER BY total_viajes DESC, distancia_total_km DESC
                LIMIT ?
            `;
            params.push(parseInt(limite));

            const [usuariosActivos] = await pool.query(query, params);

            res.json({
                usuarios: usuariosActivos,
                total: usuariosActivos.length,
                periodo: {
                    fechaDesde,
                    fechaHasta
                },
                limite: parseInt(limite),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo usuarios activos:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }
}

module.exports = AnalyticsController;