// src/controllers/dashboardController.js

const pool = require('../config/db');
const cacheService = require('../utils/cacheService');

// Obtener estadísticas generales del dashboard
const getGeneralStatistics = async (req, res) => {
    try {
        const idEmpresa = req.user.idEmpresa;

        // Usar cache para estadísticas generales (TTL de 2 minutos para datos dinámicos)
        const cacheKey = 'dashboard_stats_general';
        const context = { idEmpresa };

        const result = await cacheService.getWithCache(cacheKey, [idEmpresa], context, async () => {
            // Consulta optimizada con JOINs más eficientes
            const [stats] = await pool.query(`
                SELECT
                    COUNT(DISTINCT v.idVehiculo) as totalVehiculos,
                    COUNT(DISTINCT CASE WHEN v.estVehiculo = 'DISPONIBLE' THEN v.idVehiculo END) as vehiculosDisponibles,
                    COUNT(DISTINCT CASE WHEN v.estVehiculo = 'EN_RUTA' THEN v.idVehiculo END) as vehiculosEnRuta,
                    COUNT(DISTINCT CASE WHEN v.estVehiculo = 'EN_MANTENIMIENTO' THEN v.idVehiculo END) as vehiculosEnMantenimiento,
                    COUNT(DISTINCT c.idConductor) as totalConductores,
                    COUNT(DISTINCT CASE WHEN c.estConductor = 'ACTIVO' THEN c.idConductor END) as conductoresActivos,
                    COUNT(DISTINCT CASE WHEN c.estConductor = 'INACTIVO' THEN c.idConductor END) as conductoresInactivos,
                    COUNT(DISTINCT r.idRuta) as totalRutas,
                    COUNT(DISTINCT vi.idViaje) as totalViajes,
                    COUNT(DISTINCT CASE WHEN vi.estViaje = 'EN_CURSO' THEN vi.idViaje END) as viajesEnCurso,
                    COUNT(DISTINCT CASE WHEN vi.estViaje = 'PROGRAMADO' THEN vi.idViaje END) as viajesProgramados
                FROM Empresas e
                LEFT JOIN Vehiculos v ON e.idEmpresa = v.idEmpresa
                LEFT JOIN Conductores c ON e.idEmpresa = c.idEmpresa
                LEFT JOIN Rutas r ON e.idEmpresa = r.idEmpresa
                LEFT JOIN Viajes vi ON v.idVehiculo = vi.idVehiculo
                WHERE e.idEmpresa = ?
            `, [idEmpresa]);

            const data = stats[0] || {};
            return {
                totalVehiculos: parseInt(data.totalVehiculos) || 0,
                vehiculosDisponibles: parseInt(data.vehiculosDisponibles) || 0,
                vehiculosEnRuta: parseInt(data.vehiculosEnRuta) || 0,
                vehiculosEnMantenimiento: parseInt(data.vehiculosEnMantenimiento) || 0,
                totalConductores: parseInt(data.totalConductores) || 0,
                conductoresActivos: parseInt(data.conductoresActivos) || 0,
                conductoresInactivos: parseInt(data.conductoresInactivos) || 0,
                totalRutas: parseInt(data.totalRutas) || 0,
                totalViajes: parseInt(data.totalViajes) || 0,
                viajesEnCurso: parseInt(data.viajesEnCurso) || 0,
                viajesProgramados: parseInt(data.viajesProgramados) || 0,
                timestamp: new Date().toISOString()
            };
        });

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error del servidor al obtener estadísticas'
        });
    }
};

// Obtener datos para gráficos por período
const getChartsData = async (req, res) => {
    try {
        const idEmpresa = req.user.idEmpresa;
        const periodo = req.query.periodo || 'semana';

        // Usar cache para datos de gráficos (TTL de 5 minutos)
        const cacheKey = `dashboard_charts_${periodo}`;
        const context = { idEmpresa };

        const result = await cacheService.getWithCache(cacheKey, [idEmpresa, periodo], context, async () => {
            let dateCondition = '';
            let groupBy = '';
            let orderBy = '';
            let labels = [];

            // Configurar consulta según el período
            switch (periodo) {
                case 'dia':
                    dateCondition = "DATE(vi.fecHorSalViaje) = CURDATE()";
                    groupBy = "HOUR(vi.fecHorSalViaje)";
                    orderBy = "HOUR(vi.fecHorSalViaje)";
                    labels = Array.from({length: 24}, (_, i) => `${String(i).padStart(2, '0')}:00`);
                    break;
                case 'semana':
                    dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 6 DAY";
                    groupBy = "DATE(vi.fecHorSalViaje)";
                    orderBy = "DATE(vi.fecHorSalViaje)";
                    // Generar etiquetas de los últimos 7 días
                    labels = [];
                    for (let i = 6; i >= 0; i--) {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        labels.push(date.toLocaleDateString('es-CO', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                        }));
                    }
                    break;
                case 'mes':
                    dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 29 DAY";
                    groupBy = "WEEK(vi.fecHorSalViaje, 1)";
                    orderBy = "WEEK(vi.fecHorSalViaje, 1)";
                    labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
                    break;
                case 'trimestre':
                    dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 89 DAY";
                    groupBy = "MONTH(vi.fecHorSalViaje)";
                    orderBy = "MONTH(vi.fecHorSalViaje)";
                    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    const currentMonth = new Date().getMonth();
                    labels = [];
                    for (let i = 2; i >= 0; i--) {
                        const monthIndex = (currentMonth - i + 12) % 12;
                        labels.push(monthNames[monthIndex]);
                    }
                    break;
                case 'ano':
                    dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 364 DAY";
                    groupBy = "MONTH(vi.fecHorSalViaje)";
                    orderBy = "MONTH(vi.fecHorSalViaje)";
                    labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    break;
                default:
                    dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 6 DAY";
                    groupBy = "DATE(vi.fecHorSalViaje)";
                    orderBy = "DATE(vi.fecHorSalViaje)";
                    labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
            }

            // Obtener viajes por período - Consulta optimizada
            const [viajesData] = await pool.query(`
                SELECT
                    ${groupBy} as periodo,
                    COUNT(*) as totalViajes,
                    COUNT(CASE WHEN vi.estViaje = 'FINALIZADO' THEN 1 END) as viajesCompletados
                FROM Viajes vi
                JOIN Vehiculos v ON vi.idVehiculo = v.idVehiculo
                WHERE v.idEmpresa = ? AND ${dateCondition}
                GROUP BY ${groupBy}
                ORDER BY ${orderBy}
            `, [idEmpresa]);

            // Obtener distribución por rutas (top 5) - Consulta optimizada
            const [rutasData] = await pool.query(`
                SELECT
                    r.nomRuta,
                    COUNT(vi.idViaje) as totalViajes,
                    COALESCE(AVG(CASE
                        WHEN vi.fecHorLleViaje IS NOT NULL AND vi.fecHorSalViaje IS NOT NULL
                        THEN TIMESTAMPDIFF(MINUTE, vi.fecHorSalViaje, vi.fecHorLleViaje)
                        ELSE NULL
                    END), 0) as tiempoPromedio
                FROM Rutas r
                LEFT JOIN Viajes vi ON r.idRuta = vi.idRuta
                    AND vi.fecHorSalViaje IS NOT NULL
                    AND ${dateCondition}
                WHERE r.idEmpresa = ?
                GROUP BY r.idRuta, r.nomRuta
                HAVING COUNT(vi.idViaje) > 0
                ORDER BY totalViajes DESC
                LIMIT 5
            `, [idEmpresa]);

            return {
                viajes: {
                    labels,
                    data: viajesData.map(v => ({
                        periodo: v.periodo,
                        totalViajes: parseInt(v.totalViajes) || 0,
                        viajesCompletados: parseInt(v.viajesCompletados) || 0
                    }))
                },
                rutas: rutasData.map(r => ({
                    nomRuta: r.nomRuta,
                    totalViajes: parseInt(r.totalViajes) || 0,
                    tiempoPromedio: parseFloat(r.tiempoPromedio) || 0
                })),
                periodo,
                timestamp: new Date().toISOString()
            };
        });

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Error al obtener datos de gráficos:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error del servidor al obtener datos de gráficos'
        });
    }
};

// Obtener alertas activas - CORREGIDO Y OPTIMIZADO
const getActiveAlerts = async (req, res) => {
    try {
        const idEmpresa = req.user.idEmpresa;

        // Usar cache para alertas (TTL de 1 hora ya que cambian menos frecuentemente)
        const cacheKey = 'dashboard_alerts_active';
        const context = { idEmpresa };

        const alerts = await cacheService.getWithCache(cacheKey, [idEmpresa], context, async () => {
            // Consulta optimizada para alertas
            const [alertsData] = await pool.query(`
                SELECT
                    'LICENCIA' AS tipoDocumento,
                    CONCAT(u.nomUsuario, ' ', u.apeUsuario) AS titular,
                    c.fecVenLicConductor AS fechaVencimiento,
                    DATEDIFF(c.fecVenLicConductor, CURDATE()) AS diasParaVencer,

                    CASE
                        WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) < 0 THEN 'VENCIDO'
                        WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) <= 30 THEN 'CRITICO'
                        WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) <= 60 THEN 'ADVERTENCIA'
                        ELSE 'NORMAL'
                    END AS estado,

                    CASE
                        WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) < 0 THEN 'critical'
                        WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) <= 30 THEN 'critical'
                        WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) <= 60 THEN 'warning'
                        ELSE 'info'
                    END AS severity,

                    CONCAT(
                        'Licencia de conducción de ', u.nomUsuario, ' ', u.apeUsuario,
                        CASE
                            WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) < 0 THEN ' está vencida'
                            WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) = 0 THEN ' vence hoy'
                            ELSE CONCAT(' vence en ', DATEDIFF(c.fecVenLicConductor, CURDATE()), ' días')
                        END
                    ) AS title,

                    DATE_FORMAT(c.fecVenLicConductor, '%d/%m/%Y') AS time

                FROM Conductores c
                JOIN Usuarios u ON c.idUsuario = u.idUsuario
                WHERE c.idEmpresa = ?
                    AND DATEDIFF(c.fecVenLicConductor, CURDATE()) <= 60
                ORDER BY
                    CASE
                        WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) < 0 THEN 0
                        WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) <= 30 THEN 1
                        ELSE 2
                    END,
                    c.fecVenLicConductor ASC
            `, [idEmpresa]);

            return alertsData;
        });

        res.json({
            status: 'success',
            data: alerts,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error al obtener alertas activas:", error);
        res.status(500).json({
            status: 'error',
            message: "Error al obtener alertas activas"
        });
    }
};

// Obtener actividad reciente
const getRecentActivity = async (req, res) => {
    try {
        const idEmpresa = req.user.idEmpresa;
        const limite = parseInt(req.query.limite) || 10;
        
        const [actividad] = await pool.query(`
            SELECT 
                'VIAJE' as tipo,
                CONCAT(
                    'Viaje en ruta ', 
                    COALESCE(r.nomRuta, 'Sin ruta'), 
                    ' - ', 
                    CASE vi.estViaje 
                        WHEN 'PROGRAMADO' THEN 'Programado'
                        WHEN 'EN_CURSO' THEN 'En curso'
                        WHEN 'FINALIZADO' THEN 'Finalizado'
                        WHEN 'CANCELADO' THEN 'Cancelado'
                        ELSE 'Estado desconocido'
                    END
                ) as descripcion,
                CONCAT(
                    COALESCE(c.nomConductor, 'Sin conductor'), 
                    ' ', 
                    COALESCE(c.apeConductor, '')
                ) as usuario,
                CONCAT(
                    COALESCE(v.marVehiculo, 'Marca'), 
                    ' ', 
                    COALESCE(v.modVehiculo, 'Modelo'), 
                    ' - ', 
                    COALESCE(v.plaVehiculo, 'SIN-PLACA')
                ) as recurso,
                vi.fecHorSalViaje as fecha,
                vi.estViaje as estado
            FROM Viajes vi
            JOIN Vehiculos v ON vi.idVehiculo = v.idVehiculo
            LEFT JOIN Conductores c ON vi.idConductor = c.idConductor
            LEFT JOIN Rutas r ON vi.idRuta = r.idRuta
            WHERE v.idEmpresa = ?
            AND vi.fecHorSalViaje IS NOT NULL
            ORDER BY vi.fecHorSalViaje DESC
            LIMIT ?
        `, [idEmpresa, limite]);

        res.json({
            status: 'success',
            data: actividad || []
        });
    } catch (error) {
        console.error('Error al obtener actividad reciente:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error del servidor al obtener actividad reciente' 
        });
    }
};

// Obtener KPIs (indicadores clave)
const getKPIs = async (req, res) => {
    try {
        const idEmpresa = req.user.idEmpresa;
        const { fechaInicio, fechaFin } = req.query;
        
        let dateCondition = '';
        const params = [idEmpresa, idEmpresa];
        
        if (fechaInicio && fechaFin) {
            dateCondition = `AND DATE(vi.fecHorSalViaje) BETWEEN ? AND ?`;
            params.push(fechaInicio, fechaFin);
        } else {
            dateCondition = `AND DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 30 DAY`;
        }

        const [kpis] = await pool.query(`
            SELECT 
                COUNT(DISTINCT vi.idViaje) as totalViajes,
                COUNT(DISTINCT CASE WHEN vi.estViaje = 'FINALIZADO' THEN vi.idViaje END) as viajesCompletados,
                ROUND(
                    (COUNT(DISTINCT CASE WHEN vi.estViaje = 'FINALIZADO' THEN vi.idViaje END) * 100.0 / 
                     NULLIF(COUNT(DISTINCT vi.idViaje), 0)), 2
                ) as porcentajeCompletados,
                COALESCE(AVG(CASE 
                    WHEN vi.fecHorLleViaje IS NOT NULL AND vi.fecHorSalViaje IS NOT NULL 
                    THEN TIMESTAMPDIFF(MINUTE, vi.fecHorSalViaje, vi.fecHorLleViaje) 
                    ELSE NULL 
                END), 0) as tiempoPromedioViaje,
                COUNT(DISTINCT vi.idConductor) as conductoresActivos,
                COUNT(DISTINCT vi.idVehiculo) as vehiculosUtilizados,
                ROUND(
                    (COUNT(DISTINCT vi.idVehiculo) * 100.0 / 
                     NULLIF((SELECT COUNT(*) FROM Vehiculos WHERE idEmpresa = ? AND estVehiculo != 'FUERA_DE_SERVICIO'), 0)), 2
                ) as porcentajeUsoFlota
            FROM Viajes vi
            JOIN Vehiculos v ON vi.idVehiculo = v.idVehiculo
            WHERE v.idEmpresa = ? ${dateCondition}
        `, params);

        const data = kpis[0] || {};
        const result = {
            totalViajes: parseInt(data.totalViajes) || 0,
            viajesCompletados: parseInt(data.viajesCompletados) || 0,
            porcentajeCompletados: parseFloat(data.porcentajeCompletados) || 0,
            tiempoPromedioViaje: parseFloat(data.tiempoPromedioViaje) || 0,
            conductoresActivos: parseInt(data.conductoresActivos) || 0,
            vehiculosUtilizados: parseInt(data.vehiculosUtilizados) || 0,
            porcentajeUsoFlota: parseFloat(data.porcentajeUsoFlota) || 0
        };

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Error al obtener KPIs:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error del servidor al obtener KPIs' 
        });
    }
};

// Obtener resumen ejecutivo
const getExecutiveSummary = async (req, res) => {
    try {
        const idEmpresa = req.user.idEmpresa;
        const periodo = req.query.periodo || 'mes';
        
        let dateCondition = '';
        switch (periodo) {
            case 'dia':
                dateCondition = "DATE(vi.fecHorSalViaje) = CURDATE()";
                break;
            case 'semana':
                dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 7 DAY";
                break;
            case 'mes':
                dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 30 DAY";
                break;
            case 'trimestre':
                dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 90 DAY";
                break;
            default:
                dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 30 DAY";
        }

        // Consulta directa sin usar vistas problemáticas
        const [resumen] = await pool.query(`
            SELECT 
                e.nomEmpresa,
                COUNT(DISTINCT c.idConductor) as conductoresTotales,
                COUNT(DISTINCT v.idVehiculo) as flotaTotal,
                COUNT(DISTINCT r.idRuta) as rutasTotales,
                (SELECT COUNT(*) FROM Viajes vi2 
                 JOIN Vehiculos v2 ON vi2.idVehiculo = v2.idVehiculo 
                 WHERE v2.idEmpresa = ? AND ${dateCondition}) as viajesRealizados,
                (SELECT COUNT(*) FROM Viajes vi2 
                 JOIN Vehiculos v2 ON vi2.idVehiculo = v2.idVehiculo 
                 WHERE v2.idEmpresa = ? AND vi2.estViaje = 'FINALIZADO' AND ${dateCondition}) as viajesCompletados,
                (SELECT COUNT(*) FROM Viajes vi2 
                 JOIN Vehiculos v2 ON vi2.idVehiculo = v2.idVehiculo 
                 WHERE v2.idEmpresa = ? AND vi2.estViaje = 'CANCELADO' AND ${dateCondition}) as viajesCancelados,
                -- Contar documentos vencidos directamente
                (SELECT COUNT(*) FROM Conductores c2 WHERE c2.idEmpresa = ? AND c2.fecVenLicConductor < CURDATE()) +
                (SELECT COUNT(*) FROM Vehiculos v2 WHERE v2.idEmpresa = ? AND v2.fecVenSOAT < CURDATE()) +
                (SELECT COUNT(*) FROM Vehiculos v2 WHERE v2.idEmpresa = ? AND v2.fecVenTec < CURDATE()) as documentosVencidos,
                -- Contar documentos críticos directamente
                (SELECT COUNT(*) FROM Conductores c2 WHERE c2.idEmpresa = ? AND DATEDIFF(c2.fecVenLicConductor, CURDATE()) BETWEEN 0 AND 30) +
                (SELECT COUNT(*) FROM Vehiculos v2 WHERE v2.idEmpresa = ? AND DATEDIFF(v2.fecVenSOAT, CURDATE()) BETWEEN 0 AND 30) +
                (SELECT COUNT(*) FROM Vehiculos v2 WHERE v2.idEmpresa = ? AND DATEDIFF(v2.fecVenTec, CURDATE()) BETWEEN 0 AND 30) as documentosCriticos
            FROM Empresas e
            LEFT JOIN Conductores c ON e.idEmpresa = c.idEmpresa
            LEFT JOIN Vehiculos v ON e.idEmpresa = v.idEmpresa
            LEFT JOIN Rutas r ON e.idEmpresa = r.idEmpresa
            WHERE e.idEmpresa = ?
            GROUP BY e.idEmpresa, e.nomEmpresa
        `, [idEmpresa, idEmpresa, idEmpresa, idEmpresa, idEmpresa, idEmpresa, idEmpresa, idEmpresa, idEmpresa, idEmpresa]);

        const data = resumen[0] || {};
        const result = {
            nomEmpresa: data.nomEmpresa || 'Empresa sin nombre',
            flotaTotal: parseInt(data.flotaTotal) || 0,
            conductoresTotales: parseInt(data.conductoresTotales) || 0,
            rutasTotales: parseInt(data.rutasTotales) || 0,
            viajesRealizados: parseInt(data.viajesRealizados) || 0,
            viajesCompletados: parseInt(data.viajesCompletados) || 0,
            viajesCancelados: parseInt(data.viajesCancelados) || 0,
            documentosVencidos: parseInt(data.documentosVencidos) || 0,
            documentosCriticos: parseInt(data.documentosCriticos) || 0,
            periodo,
            fechaGeneracion: new Date().toISOString()
        };

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Error al obtener resumen ejecutivo:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error del servidor al obtener resumen ejecutivo' 
        });
    }
};

// Obtener datos en tiempo real - OPTIMIZADO
const getRealTimeData = async (req, res) => {
    try {
        const idEmpresa = req.user.idEmpresa;

        // Usar cache para datos en tiempo real (TTL de 30 segundos para datos muy dinámicos)
        const cacheKey = 'dashboard_realtime_data';
        const context = { idEmpresa };

        const result = await cacheService.getWithCache(cacheKey, [idEmpresa], context, async () => {
            // Consulta optimizada con una sola query
            const [datos] = await pool.query(`
                SELECT
                    COUNT(DISTINCT CASE WHEN v.estVehiculo = 'EN_RUTA' THEN v.idVehiculo END) as vehiculosEnRuta,
                    COUNT(DISTINCT CASE WHEN vi.estViaje = 'EN_CURSO' THEN vi.idViaje END) as viajesEnCurso,
                    COUNT(DISTINCT CASE WHEN c.estConductor = 'ACTIVO' THEN c.idConductor END) as conductoresActivos,
                    -- Contar alertas críticas (licencias, SOAT y tecno próximas a vencer o vencidas)
                    (COUNT(DISTINCT CASE WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) BETWEEN -30 AND 30 THEN c.idConductor END) +
                     COUNT(DISTINCT CASE WHEN DATEDIFF(v.fecVenSOAT, CURDATE()) BETWEEN -30 AND 30 THEN v.idVehiculo END) +
                     COUNT(DISTINCT CASE WHEN DATEDIFF(v.fecVenTec, CURDATE()) BETWEEN -30 AND 30 THEN v.idVehiculo END)) as alertasCriticas
                FROM Empresas e
                LEFT JOIN Vehiculos v ON e.idEmpresa = v.idEmpresa
                LEFT JOIN Conductores c ON e.idEmpresa = c.idEmpresa
                LEFT JOIN Viajes vi ON v.idVehiculo = vi.idVehiculo
                WHERE e.idEmpresa = ?
            `, [idEmpresa]);

            const data = datos[0] || {};
            return {
                vehiculosEnRuta: parseInt(data.vehiculosEnRuta) || 0,
                viajesEnCurso: parseInt(data.viajesEnCurso) || 0,
                conductoresActivos: parseInt(data.conductoresActivos) || 0,
                alertasCriticas: parseInt(data.alertasCriticas) || 0,
                timestamp: new Date().toISOString()
            };
        });

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Error al obtener datos en tiempo real:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error del servidor al obtener datos en tiempo real'
        });
    }
};

module.exports = {
    getGeneralStatistics,
    getChartsData,
    getActiveAlerts,
    getRecentActivity,
    getKPIs,
    getExecutiveSummary,
    getRealTimeData
};

// Función para notificar cambios en el dashboard (para uso interno)
const notifyDashboardChange = async (empresaId, changeType, data) => {
    try {
        if (global.dashboardRealTimeService) {
            await global.dashboardRealTimeService.notifyEntityChange(
                changeType,
                data.id,
                empresaId,
                data.action || 'update'
            );
        }
    } catch (error) {
        console.error('Error notificando cambio en dashboard:', error);
    }
};

module.exports.notifyDashboardChange = notifyDashboardChange;