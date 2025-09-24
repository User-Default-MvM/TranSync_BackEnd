// src/utils/dashboardQueries.js
// Consultas optimizadas para el dashboard

const pool = require('../config/db');

/**
 * Consultas optimizadas para el dashboard
 */
class DashboardQueries {

    /**
     * Obtener estadísticas generales optimizadas
     */
    static async getGeneralStats(empresaId) {
        const query = `
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
        `;

        const [rows] = await pool.query(query, [empresaId]);
        return rows[0];
    }

    /**
     * Obtener datos en tiempo real optimizados
     */
    static async getRealTimeData(empresaId) {
        const query = `
            SELECT
                COUNT(DISTINCT CASE WHEN v.estVehiculo = 'EN_RUTA' THEN v.idVehiculo END) as vehiculosEnRuta,
                COUNT(DISTINCT CASE WHEN vi.estViaje = 'EN_CURSO' THEN vi.idViaje END) as viajesEnCurso,
                COUNT(DISTINCT CASE WHEN c.estConductor = 'ACTIVO' THEN c.idConductor END) as conductoresActivos,
                (COUNT(DISTINCT CASE WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) BETWEEN -30 AND 30 THEN c.idConductor END) +
                 COUNT(DISTINCT CASE WHEN DATEDIFF(v.fecVenSOAT, CURDATE()) BETWEEN -30 AND 30 THEN v.idVehiculo END) +
                 COUNT(DISTINCT CASE WHEN DATEDIFF(v.fecVenTec, CURDATE()) BETWEEN -30 AND 30 THEN v.idVehiculo END)) as alertasCriticas
            FROM Empresas e
            LEFT JOIN Vehiculos v ON e.idEmpresa = v.idEmpresa
            LEFT JOIN Conductores c ON e.idEmpresa = c.idEmpresa
            LEFT JOIN Viajes vi ON v.idVehiculo = vi.idVehiculo
            WHERE e.idEmpresa = ?
        `;

        const [rows] = await pool.query(query, [empresaId]);
        return rows[0];
    }

    /**
     * Obtener alertas activas optimizadas
     */
    static async getActiveAlerts(empresaId) {
        const query = `
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
        `;

        const [rows] = await pool.query(query, [empresaId]);
        return rows;
    }

    /**
     * Obtener datos para gráficos optimizados
     */
    static async getChartsData(empresaId, periodo) {
        let dateCondition = '';
        let groupBy = '';
        let orderBy = '';

        // Configurar consulta según el período
        switch (periodo) {
            case 'dia':
                dateCondition = "DATE(vi.fecHorSalViaje) = CURDATE()";
                groupBy = "HOUR(vi.fecHorSalViaje)";
                orderBy = "HOUR(vi.fecHorSalViaje)";
                break;
            case 'semana':
                dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 6 DAY";
                groupBy = "DATE(vi.fecHorSalViaje)";
                orderBy = "DATE(vi.fecHorSalViaje)";
                break;
            case 'mes':
                dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 29 DAY";
                groupBy = "WEEK(vi.fecHorSalViaje, 1)";
                orderBy = "WEEK(vi.fecHorSalViaje, 1)";
                break;
            case 'trimestre':
                dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 89 DAY";
                groupBy = "MONTH(vi.fecHorSalViaje)";
                orderBy = "MONTH(vi.fecHorSalViaje)";
                break;
            case 'ano':
                dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 364 DAY";
                groupBy = "MONTH(vi.fecHorSalViaje)";
                orderBy = "MONTH(vi.fecHorSalViaje)";
                break;
            default:
                dateCondition = "DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 6 DAY";
                groupBy = "DATE(vi.fecHorSalViaje)";
                orderBy = "DATE(vi.fecHorSalViaje)";
        }

        // Consulta optimizada para viajes por período
        const viajesQuery = `
            SELECT
                ${groupBy} as periodo,
                COUNT(*) as totalViajes,
                COUNT(CASE WHEN vi.estViaje = 'FINALIZADO' THEN 1 END) as viajesCompletados
            FROM Viajes vi
            JOIN Vehiculos v ON vi.idVehiculo = v.idVehiculo
            WHERE v.idEmpresa = ? AND ${dateCondition}
            GROUP BY ${groupBy}
            ORDER BY ${orderBy}
        `;

        // Consulta optimizada para distribución por rutas
        const rutasQuery = `
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
        `;

        const [[viajesData], [rutasData]] = await Promise.all([
            pool.query(viajesQuery, [empresaId]),
            pool.query(rutasQuery, [empresaId])
        ]);

        return {
            viajes: viajesData,
            rutas: rutasData
        };
    }

    /**
     * Obtener KPIs optimizados
     */
    static async getKPIs(empresaId, fechaInicio = null, fechaFin = null) {
        let dateCondition = '';
        const params = [empresaId, empresaId];

        if (fechaInicio && fechaFin) {
            dateCondition = `AND DATE(vi.fecHorSalViaje) BETWEEN ? AND ?`;
            params.push(fechaInicio, fechaFin);
        } else {
            dateCondition = `AND DATE(vi.fecHorSalViaje) >= CURDATE() - INTERVAL 30 DAY`;
        }

        const query = `
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
        `;

        const [rows] = await pool.query(query, params);
        return rows[0];
    }

    /**
     * Obtener actividad reciente optimizada
     */
    static async getRecentActivity(empresaId, limite = 10) {
        const query = `
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
        `;

        const [rows] = await pool.query(query, [empresaId, limite]);
        return rows;
    }

    /**
     * Obtener resumen ejecutivo optimizado
     */
    static async getExecutiveSummary(empresaId, periodo) {
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

        const query = `
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
        `;

        const params = [empresaId, empresaId, empresaId, empresaId, empresaId, empresaId, empresaId, empresaId, empresaId, empresaId];
        const [rows] = await pool.query(query, params);
        return rows[0];
    }
}

module.exports = DashboardQueries;