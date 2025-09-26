// src/utils/queryEngine.js
// Motor de Consultas Inteligentes para TransSync ChatBot

class QueryEngine {
    constructor() {
        this.tableSchemas = this.getTableSchemas();
        this.queryTemplates = this.getQueryTemplates();
    }

    /**
     * Generar consulta SQL desde lenguaje natural
     */
    generateQuery(intent, entities, context, options = {}) {
        try {
            const { idUsuario, idEmpresa } = options;

            // Determinar tabla principal basada en intención
            const mainTable = this.determineMainTable(intent);

            // Casos especiales para consultas complejas
            if (intent === 'system_status') {
                return this.generateSystemStatusQuery(idEmpresa);
            }

            // Consultas de rendimiento
            if (intent.includes('performance') || intent.includes('eficiencia') || intent.includes('rendimiento')) {
                return this.generatePerformanceQuery(intent, entities, idEmpresa);
            }

            // Consultas predictivas
            if (intent.includes('predictive') || intent.includes('pronóstico') || intent.includes('predicción')) {
                return this.generatePredictiveQuery(intent, entities, idEmpresa);
            }

            // Consultas de alertas inteligentes
            if ((intent === 'alerts' || intent === 'expiry_alerts') && context && context.isQuestion) {
                return this.generateSmartAlertsQuery(idEmpresa);
            }

            if (!mainTable) {
                return {
                    sql: null,
                    params: [],
                    complexity: 0,
                    explanation: 'No se pudo determinar la tabla principal para la consulta'
                };
            }

            // Generar consulta base
            const baseQuery = this.generateBaseQuery(intent, mainTable, entities, context);

            // Aplicar filtros
            const filteredQuery = this.applyFilters(baseQuery, entities, context, idEmpresa);

            // Optimizar consulta
            const optimizedQuery = this.optimizeQuery(filteredQuery);

            // Calcular complejidad
            const complexity = this.calculateComplexity(optimizedQuery);

            return {
                sql: optimizedQuery.sql,
                params: optimizedQuery.params,
                complexity: complexity,
                explanation: this.generateExplanation(optimizedQuery, intent),
                estimatedRows: this.estimateResultSize(optimizedQuery)
            };

        } catch (error) {
            console.error('Error generando consulta:', error);
            return {
                sql: null,
                params: [],
                complexity: 0,
                explanation: 'Error interno al generar la consulta',
                error: error.message
            };
        }
    }

    /**
     * Determinar tabla principal basada en intención
     */
    determineMainTable(intent) {
        const tableMapping = {
            driver: 'Conductores',
            vehicle: 'Vehiculos',
            route: 'Rutas',
            schedule: 'Viajes',
            license: 'Conductores', // Para consultas de licencias
            maintenance: 'Vehiculos', // Para consultas de mantenimiento
            status: 'Conductores', // Estado general podría requerir múltiples tablas
            count_driver: 'Conductores',
            count_vehicle: 'Vehiculos',
            list_vehicle: 'Vehiculos',
            list_route: 'Rutas',
            list_schedule: 'Viajes',
            system_status: null, // Estado general - no usa tabla principal, genera consultas múltiples
            license_expiry: 'Conductores',
            vehicle_maintenance: 'Vehiculos',
            alerts: 'AlertasVencimientos', // Alertas de vencimientos
            expiry_alerts: 'AlertasVencimientos', // Alertas de vencimientos
            dashboard: 'ResumenOperacional', // Dashboard y reportes
            summary: 'ResumenOperacional' // Resumen operacional
        };

        return tableMapping[intent] || null;
    }

    /**
     * Generar consulta base
     */
    generateBaseQuery(intent, mainTable, entities, context) {
        const schema = this.tableSchemas[mainTable];
        if (!schema) {
            throw new Error(`Esquema no encontrado para tabla: ${mainTable}`);
        }

        let query = {
            select: [],
            from: mainTable,
            where: [],
            joins: [],
            groupBy: [],
            orderBy: [],
            limit: null,
            params: []
        };

        // Determinar campos a seleccionar
        query.select = this.determineSelectFields(intent, mainTable, entities);

        // Agregar condiciones WHERE básicas
        if (schema.companyField) {
            query.where.push(`${schema.companyField} = ?`);
            query.params.push('idEmpresa'); // Será reemplazado por el valor real
        }

        // Agregar condiciones específicas de intención
        const specificConditions = this.getIntentSpecificConditions(intent, entities, context);
        query.where.push(...specificConditions.conditions);
        query.params.push(...specificConditions.params);

        // Agregar JOINs si son necesarios
        query.joins = this.determineJoins(intent, mainTable);

        return query;
    }

    /**
     * Determinar campos a seleccionar
     */
    determineSelectFields(intent, mainTable, entities) {
        const fieldMapping = {
            Conductores: {
                basic: ['idConductor', 'nomConductor', 'apeConductor', 'estConductor'],
                license: ['fecVenLicConductor', 'numLicConductor'],
                vehicle: ['idVehiculoAsignado']
            },
            Vehiculos: {
                basic: ['idVehiculo', 'plaVehiculo', 'estVehiculo', 'modVehiculo'],
                maintenance: ['fecVenSOAT', 'fecVenTec'],
                driver: ['idConductorAsignado']
            },
            Rutas: {
                basic: ['idRuta', 'nomRuta', 'oriRuta', 'desRuta']
            },
            Viajes: {
                basic: ['idViaje', 'fecHorSalViaje', 'estViaje'],
                route: ['idRuta'],
                vehicle: ['idVehiculo']
            }
        };

        const tableFields = fieldMapping[mainTable];
        if (!tableFields) return ['*'];

        // Para consultas de conteo
        if (intent.startsWith('count_')) {
            return ['COUNT(*) as total'];
        }

        // Para consultas de lista
        if (intent.startsWith('list_')) {
            return tableFields.basic || ['*'];
        }

        // Campos específicos basados en intención
        if (intent === 'license_expiry' && tableFields.license) {
            return [...tableFields.basic, ...tableFields.license];
        }

        if (intent === 'vehicle_maintenance' && tableFields.maintenance) {
            return [...tableFields.basic, ...tableFields.maintenance];
        }

        return tableFields.basic || ['*'];
    }

    /**
     * Obtener condiciones específicas de intención
     */
    getIntentSpecificConditions(intent, entities, context) {
        const conditions = [];
        const params = [];

        switch (intent) {
            case 'count_driver':
            case 'count_vehicle':
                // No additional conditions for counts
                break;

            case 'list_vehicle':
                if (entities.numbers && entities.numbers.length > 0) {
                    // Limitar resultados
                    conditions.push('LIMIT ?');
                    params.push(Math.min(entities.numbers[0].value, 50));
                }
                break;

            case 'license_expiry':
                conditions.push('fecVenLicConductor <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
                conditions.push('fecVenLicConductor >= CURDATE()');
                break;

            case 'vehicle_maintenance':
                conditions.push('estVehiculo = ?');
                params.push('EN_MANTENIMIENTO');
                break;

            case 'system_status':
                // Estado general - condiciones específicas en generateSystemStatusQuery
                break;

            default:
                // Condiciones basadas en contexto
                if (context.scope === 'available') {
                    if (intent.includes('driver')) {
                        conditions.push('estConductor = ?');
                        params.push('ACTIVO');
                    } else if (intent.includes('vehicle')) {
                        conditions.push('estVehiculo = ?');
                        params.push('DISPONIBLE');
                    }
                }
                break;
        }

        return { conditions, params };
    }

    /**
     * Determinar JOINs necesarios
     */
    determineJoins(intent, mainTable) {
        const joins = [];

        if (intent === 'system_status') {
            // Para estado general, necesitamos JOIN con múltiples tablas
            if (mainTable === 'Conductores') {
                joins.push({
                    type: 'LEFT JOIN',
                    table: 'Vehiculos',
                    on: 'Conductores.idConductor = Vehiculos.idConductorAsignado'
                });
            }
        }

        if (intent.includes('vehicle') && mainTable === 'Conductores') {
            joins.push({
                type: 'LEFT JOIN',
                table: 'Vehiculos',
                on: 'Conductores.idConductor = Vehiculos.idConductorAsignado'
            });
        }

        if (intent.includes('driver') && mainTable === 'Vehiculos') {
            joins.push({
                type: 'LEFT JOIN',
                table: 'Conductores',
                on: 'Vehiculos.idConductorAsignado = Conductores.idConductor'
            });
        }

        if (mainTable === 'Viajes') {
            joins.push({
                type: 'JOIN',
                table: 'Vehiculos',
                on: 'Viajes.idVehiculo = Vehiculos.idVehiculo'
            });
            if (intent.includes('route')) {
                joins.push({
                    type: 'JOIN',
                    table: 'Rutas',
                    on: 'Viajes.idRuta = Rutas.idRuta'
                });
            }
        }

        return joins;
    }

    /**
     * Aplicar filtros adicionales
     */
    applyFilters(query, entities, context, idEmpresa) {
        // Reemplazar placeholder de empresa
        query.params = query.params.map(param =>
            param === 'idEmpresa' ? idEmpresa : param
        );

        // Aplicar filtros de ubicación
        if (entities.locations && entities.locations.length > 0) {
            const locationFilter = this.createLocationFilter(entities.locations[0]);
            if (locationFilter) {
                query.where.push(locationFilter.condition);
                query.params.push(...locationFilter.params);
            }
        }

        // Aplicar filtros temporales
        if (entities.dates && entities.dates.length > 0) {
            const dateFilter = this.createDateFilter(entities.dates[0]);
            if (dateFilter) {
                query.where.push(dateFilter.condition);
                query.params.push(...dateFilter.params);
            }
        }

        // Aplicar filtros de números
        if (entities.numbers && entities.numbers.length > 0) {
            const numberFilter = this.createNumberFilter(entities.numbers, context);
            if (numberFilter) {
                query.where.push(numberFilter.condition);
                query.params.push(...numberFilter.params);
            }
        }

        return query;
    }

    /**
     * Crear filtro de ubicación
     */
    createLocationFilter(location) {
        // Implementar lógica para filtrar por ubicación
        // Esto dependerá de cómo se almacenen las ubicaciones en la base de datos
        return null; // Placeholder
    }

    /**
     * Crear filtro de fecha
     */
    createDateFilter(date) {
        return {
            condition: 'DATE(fecHorSalViaje) = ?',
            params: [date.normalized || date.value]
        };
    }

    /**
     * Crear filtro de números
     */
    createNumberFilter(numbers, context) {
        if (!numbers || numbers.length === 0) return null;

        const number = numbers[0];

        // Para límites
        if (context.isLimit || number.value < 100) {
            return {
                condition: 'LIMIT ?',
                params: [Math.min(number.value, 100)]
            };
        }

        return null;
    }

    /**
     * Optimizar consulta
     */
    optimizeQuery(query) {
        // Agregar índices útiles
        if (query.where.some(condition => condition.includes('estConductor'))) {
            query.orderBy = ['estConductor'];
        }

        if (query.where.some(condition => condition.includes('estVehiculo'))) {
            query.orderBy = ['estVehiculo'];
        }

        // Limitar resultados por defecto
        if (!query.limit && !query.where.some(c => c.includes('LIMIT'))) {
            query.limit = 50;
        }

        return query;
    }

    /**
     * Calcular complejidad de la consulta
     */
    calculateComplexity(query) {
        let complexity = 1;

        // Aumentar por JOINs
        complexity += query.joins.length * 0.5;

        // Aumentar por condiciones WHERE
        complexity += query.where.length * 0.2;

        // Aumentar por GROUP BY
        complexity += query.groupBy.length * 0.3;

        // Aumentar por ORDER BY
        complexity += query.orderBy.length * 0.1;

        return Math.min(complexity, 5);
    }

    /**
     * Generar explicación de la consulta
     */
    generateExplanation(query, intent) {
        const explanations = {
            count_driver: 'Contando conductores registrados',
            count_vehicle: 'Contando vehículos en la flota',
            list_vehicle: 'Listando vehículos disponibles',
            license_expiry: 'Buscando licencias próximas a vencer',
            vehicle_maintenance: 'Buscando vehículos en mantenimiento',
            system_status: 'Obteniendo estado general del sistema',
            alerts: 'Consultando alertas de vencimientos',
            expiry_alerts: 'Buscando documentos próximos a vencer',
            dashboard: 'Obteniendo datos del dashboard',
            summary: 'Consultando resumen operacional'
        };

        return explanations[intent] || 'Ejecutando consulta personalizada';
    }

    /**
     * Estimar tamaño del resultado
     */
    estimateResultSize(query) {
        // Estimación simple basada en complejidad
        const baseSize = 10;
        const complexityMultiplier = Math.max(1, query.joins.length + query.where.length);

        return Math.min(baseSize * complexityMultiplier, 1000);
    }

    /**
     * Construir SQL final
     */
    buildSQL(query) {
        let sql = 'SELECT ';

        // SELECT
        sql += query.select.join(', ');

        // FROM
        sql += ` FROM ${query.from}`;

        // JOINs
        query.joins.forEach(join => {
            sql += ` ${join.type} ${join.table} ON ${join.on}`;
        });

        // WHERE
        if (query.where.length > 0) {
            sql += ' WHERE ' + query.where.join(' AND ');
        }

        // GROUP BY
        if (query.groupBy.length > 0) {
            sql += ' GROUP BY ' + query.groupBy.join(', ');
        }

        // ORDER BY
        if (query.orderBy.length > 0) {
            sql += ' ORDER BY ' + query.orderBy.join(', ');
        }

        // LIMIT
        if (query.limit) {
            sql += ` LIMIT ${query.limit}`;
        }

        return sql;
    }

    /**
     * Obtener esquemas de tablas
     */
    getTableSchemas() {
        return {
            Conductores: {
                primaryKey: 'idConductor',
                companyField: 'idEmpresa',
                fields: [
                    'idConductor', 'nomConductor', 'apeConductor', 'estConductor',
                    'fecVenLicConductor', 'numLicConductor', 'idVehiculoAsignado', 'idEmpresa'
                ]
            },
            Vehiculos: {
                primaryKey: 'idVehiculo',
                companyField: 'idEmpresa',
                fields: [
                    'idVehiculo', 'plaVehiculo', 'estVehiculo', 'modVehiculo',
                    'fecVenSOAT', 'fecVenTec', 'idConductorAsignado', 'idEmpresa'
                ]
            },
            Rutas: {
                primaryKey: 'idRuta',
                companyField: 'idEmpresa',
                fields: [
                    'idRuta', 'nomRuta', 'oriRuta', 'desRuta', 'idEmpresa'
                ]
            },
            Viajes: {
                primaryKey: 'idViaje',
                companyField: null, // Viajes no tienen idEmpresa directo, usar JOIN
                fields: [
                    'idViaje', 'fecHorSalViaje', 'estViaje', 'idVehiculo', 'idRuta'
                ]
            },
            ResumenOperacional: {
                primaryKey: 'id',
                companyField: 'idEmpresa',
                fields: [
                    'id', 'idEmpresa', 'conductoresActivos', 'vehiculosDisponibles',
                    'viajesEnCurso', 'viajesCompletados', 'alertasPendientes', 'fechaActualizacion'
                ]
            },
            AlertasVencimientos: {
                primaryKey: 'id',
                companyField: 'idEmpresa',
                fields: [
                    'id', 'idEmpresa', 'tipoDocumento', 'idReferencia', 'descripcion',
                    'fechaVencimiento', 'diasParaVencer', 'estado', 'fechaCreacion', 'fechaResolucion'
                ]
            }
        };
    }

    /**
     * Generar consulta especial para estado del sistema
     */
    generateSystemStatusQuery(idEmpresa) {
        const sql = `
            SELECT
                (SELECT COUNT(*) FROM Conductores WHERE estConductor = 'ACTIVO' AND idEmpresa = ?) as conductoresActivos,
                (SELECT COUNT(*) FROM Vehiculos WHERE estVehiculo = 'DISPONIBLE' AND idEmpresa = ?) as vehiculosDisponibles,
                (SELECT COUNT(*) FROM Viajes WHERE estViaje = 'EN_CURSO') as viajesEnCurso,
                (SELECT COUNT(*) FROM Conductores WHERE estConductor = 'INACTIVO' AND idEmpresa = ?) as conductoresInactivos,
                (SELECT COUNT(*) FROM Vehiculos WHERE estVehiculo = 'EN_MANTENIMIENTO' AND idEmpresa = ?) as vehiculosMantenimiento,
                (SELECT COUNT(*) FROM Viajes WHERE estViaje = 'COMPLETADO' AND DATE(fecHorSalViaje) = CURDATE()) as viajesCompletadosHoy,
                (SELECT COUNT(*) FROM Conductores WHERE fecVenLicConductor BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND idEmpresa = ?) as licenciasPorVencer,
                (SELECT COUNT(*) FROM Vehiculos WHERE fecVenSOAT BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND idEmpresa = ?) as soatPorVencer,
                (SELECT COUNT(*) FROM Vehiculos WHERE fecVenTec BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND idEmpresa = ?) as tecPorVencer
        `;

        return {
            sql: sql,
            params: [idEmpresa, idEmpresa, idEmpresa, idEmpresa, idEmpresa, idEmpresa, idEmpresa, idEmpresa],
            complexity: 3,
            explanation: 'Obteniendo estado completo del sistema con métricas detalladas',
            estimatedRows: 1,
            isMultipleQuery: true
        };
    }

    /**
     * Generar consulta para análisis de rendimiento
     */
    generatePerformanceQuery(intent, entities, idEmpresa) {
        let sql = '';
        let params = [idEmpresa];

        switch (intent) {
            case 'performance_drivers':
                sql = `
                    SELECT
                        c.nomConductor,
                        c.apeConductor,
                        COUNT(v.idViaje) as viajesRealizados,
                        AVG(TIMESTAMPDIFF(HOUR, v.fecHorSalViaje, v.fecHorLleViaje)) as horasPromedio
                    FROM Conductores c
                    LEFT JOIN Viajes v ON c.idConductor = v.idConductorAsignado
                        AND v.fecHorSalViaje >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                    WHERE c.idEmpresa = ? AND c.estConductor = 'ACTIVO'
                    GROUP BY c.idConductor, c.nomConductor, c.apeConductor
                    ORDER BY viajesRealizados DESC
                    LIMIT 10
                `;
                break;

            case 'performance_vehicles':
                sql = `
                    SELECT
                        v.plaVehiculo,
                        v.modVehiculo,
                        COUNT(via.idViaje) as viajesRealizados,
                        AVG(TIMESTAMPDIFF(HOUR, via.fecHorSalViaje, via.fecHorLleViaje)) as horasUso
                    FROM Vehiculos v
                    LEFT JOIN Viajes via ON v.idVehiculo = via.idVehiculo
                        AND via.fecHorSalViaje >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                    WHERE v.idEmpresa = ? AND v.estVehiculo = 'DISPONIBLE'
                    GROUP BY v.idVehiculo, v.plaVehiculo, v.modVehiculo
                    ORDER BY viajesRealizados DESC
                    LIMIT 10
                `;
                break;

            case 'route_efficiency':
                sql = `
                    SELECT
                        r.nomRuta,
                        r.oriRuta,
                        r.desRuta,
                        COUNT(v.idViaje) as vecesUtilizada,
                        AVG(TIMESTAMPDIFF(MINUTE, v.fecHorSalViaje, v.fecHorLleViaje)) as tiempoPromedio
                    FROM Rutas r
                    LEFT JOIN Viajes v ON r.idRuta = v.idRuta
                        AND v.fecHorSalViaje >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                    WHERE r.idEmpresa = ?
                    GROUP BY r.idRuta, r.nomRuta, r.oriRuta, r.desRuta
                    ORDER BY vecesUtilizada DESC
                    LIMIT 10
                `;
                break;

            default:
                return null;
        }

        return {
            sql: sql,
            params: params,
            complexity: 3,
            explanation: `Análisis de rendimiento: ${intent}`,
            estimatedRows: 10
        };
    }

    /**
     * Generar consulta para alertas inteligentes
     */
    generateSmartAlertsQuery(idEmpresa, days = 30) {
        const sql = `
            SELECT
                'LICENCIAS' as tipo,
                COUNT(*) as total,
                GROUP_CONCAT(CONCAT(c.nomConductor, ' ', c.apeConductor) SEPARATOR ', ') as detalles
            FROM Conductores c
            WHERE c.idEmpresa = ? AND c.fecVenLicConductor BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            UNION ALL
            SELECT
                'SOAT' as tipo,
                COUNT(*) as total,
                GROUP_CONCAT(v.plaVehiculo SEPARATOR ', ') as detalles
            FROM Vehiculos v
            WHERE v.idEmpresa = ? AND v.fecVenSOAT BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            UNION ALL
            SELECT
                'TECNICO' as tipo,
                COUNT(*) as total,
                GROUP_CONCAT(v.plaVehiculo SEPARATOR ', ') as detalles
            FROM Vehiculos v
            WHERE v.idEmpresa = ? AND v.fecVenTec BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY tipo
        `;

        return {
            sql: sql,
            params: [idEmpresa, days, idEmpresa, days, idEmpresa, days],
            complexity: 3,
            explanation: 'Generando alertas inteligentes de vencimientos',
            estimatedRows: 3
        };
    }

    /**
     * Generar consulta para análisis predictivo
     */
    generatePredictiveQuery(intent, entities, idEmpresa) {
        let sql = '';
        let params = [idEmpresa];

        switch (intent) {
            case 'predictive_maintenance':
                sql = `
                    SELECT
                        v.plaVehiculo,
                        v.modVehiculo,
                        DATEDIFF(v.fecVenSOAT, CURDATE()) as diasParaSOAT,
                        DATEDIFF(v.fecVenTec, CURDATE()) as diasParaTecnico,
                        CASE
                            WHEN DATEDIFF(v.fecVenSOAT, CURDATE()) <= 15 OR DATEDIFF(v.fecVenTec, CURDATE()) <= 15
                            THEN 'ALTA'
                            WHEN DATEDIFF(v.fecVenSOAT, CURDATE()) <= 30 OR DATEDIFF(v.fecVenTec, CURDATE()) <= 30
                            THEN 'MEDIA'
                            ELSE 'BAJA'
                        END as prioridadMantenimiento
                    FROM Vehiculos v
                    WHERE v.idEmpresa = ? AND v.estVehiculo = 'DISPONIBLE'
                    ORDER BY diasParaSOAT, diasParaTecnico
                `;
                break;

            case 'predictive_staff':
                sql = `
                    SELECT
                        c.nomConductor,
                        c.apeConductor,
                        DATEDIFF(c.fecVenLicConductor, CURDATE()) as diasParaVencimiento,
                        CASE
                            WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) <= 15 THEN 'URGENTE'
                            WHEN DATEDIFF(c.fecVenLicConductor, CURDATE()) <= 30 THEN 'PRONTO'
                            ELSE 'NORMAL'
                        END as estadoLicencia
                    FROM Conductores c
                    WHERE c.idEmpresa = ? AND c.estConductor = 'ACTIVO'
                    ORDER BY diasParaVencimiento
                `;
                break;

            default:
                return null;
        }

        return {
            sql: sql,
            params: params,
            complexity: 3,
            explanation: `Análisis predictivo: ${intent}`,
            estimatedRows: 20
        };
    }

    /**
     * Generar consulta para alertas de vencimientos
     */
    generateAlertsQuery(idEmpresa) {
        const sql = `
            SELECT
                COUNT(*) as totalAlertas,
                tipoDocumento,
                GROUP_CONCAT(DISTINCT descripcion SEPARATOR '; ') as descripciones
            FROM AlertasVencimientos
            WHERE idEmpresa = ? AND estado = 'PENDIENTE'
            GROUP BY tipoDocumento
            ORDER BY tipoDocumento
        `;

        return {
            sql: sql,
            params: [idEmpresa],
            complexity: 1,
            explanation: 'Obteniendo alertas de vencimientos pendientes',
            estimatedRows: 5
        };
    }

    /**
     * Obtener plantillas de consultas
     */
    getQueryTemplates() {
        return {
            count_active_drivers: {
                sql: 'SELECT COUNT(*) as total FROM Conductores WHERE estConductor = ? AND idEmpresa = ?',
                params: ['ACTIVO', 'idEmpresa']
            },
            count_available_vehicles: {
                sql: 'SELECT COUNT(*) as total FROM Vehiculos WHERE estVehiculo = ? AND idEmpresa = ?',
                params: ['DISPONIBLE', 'idEmpresa']
            },
            list_routes: {
                sql: 'SELECT idRuta, nomRuta, oriRuta, desRuta FROM Rutas WHERE idEmpresa = ? LIMIT 10',
                params: ['idEmpresa']
            }
        };
    }
}

module.exports = new QueryEngine();