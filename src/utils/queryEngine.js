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

            // Caso especial para system_status - genera múltiples consultas
            if (intent === 'system_status') {
                return this.generateSystemStatusQuery(idEmpresa);
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
            vehicle_maintenance: 'Vehiculos'
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
            system_status: 'Obteniendo estado general del sistema'
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
            }
        };
    }

    /**
     * Generar consulta especial para estado del sistema
     */
    generateSystemStatusQuery(idEmpresa) {
        // Para system_status, necesitamos múltiples consultas agregadas
        // Simulamos una tabla virtual con los datos necesarios
        const sql = `
            SELECT
                (SELECT COUNT(*) FROM Conductores WHERE estConductor = 'ACTIVO' AND idEmpresa = ?) as conductoresActivos,
                (SELECT COUNT(*) FROM Vehiculos WHERE estVehiculo = 'DISPONIBLE' AND idEmpresa = ?) as vehiculosDisponibles,
                (SELECT COUNT(*) FROM Viajes WHERE estViaje = 'EN_CURSO') as viajesEnCurso
        `;

        return {
            sql: sql,
            params: [idEmpresa, idEmpresa],
            complexity: 2,
            explanation: 'Obteniendo estado general del sistema con múltiples consultas agregadas',
            estimatedRows: 1,
            isMultipleQuery: true
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