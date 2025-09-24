// src/utils/cacheService.js
// Sistema de Cache Inteligente para TransSync ChatBot

const NodeCache = require('node-cache');

class CacheService {
    constructor() {
        // Cache principal con TTL de 5 minutos por defecto
        this.mainCache = new NodeCache({
            stdTTL: 300, // 5 minutos
            checkperiod: 60, // Verificar expiración cada minuto
            useClones: false
        });

        // Cache para consultas comunes con TTL más largo
        this.commonQueriesCache = new NodeCache({
            stdTTL: 1800, // 30 minutos
            checkperiod: 300, // Verificar cada 5 minutos
        });

        // Estadísticas de rendimiento
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            lastCleanup: Date.now()
        };

        // Configuración de TTL por tipo de consulta
        this.ttlConfig = {
            driver_queries: 600, // 10 minutos
            vehicle_queries: 600,
            route_queries: 1800, // 30 minutos (menos cambiantes)
            schedule_queries: 300, // 5 minutos (más dinámicas)
            system_status: 120, // 2 minutos (muy dinámico)
            license_queries: 3600, // 1 hora (cambios mensuales)
            maintenance_queries: 1800, // 30 minutos
            // Configuraciones específicas para dashboard
            dashboard_stats_general: 120, // 2 minutos para estadísticas generales
            dashboard_charts_data: 300, // 5 minutos para datos de gráficos
            dashboard_alerts_active: 3600, // 1 hora para alertas (cambian menos)
            dashboard_realtime_data: 30, // 30 segundos para datos en tiempo real
            dashboard_kpis: 180, // 3 minutos para KPIs
            dashboard_activity: 60 // 1 minuto para actividad reciente
        };

        // Iniciar limpieza automática
        this.startAutoCleanup();
    }

    /**
     * Obtener dato con cache inteligente
     */
    async getWithCache(key, params = [], context = {}, fetchFunction) {
        try {
            const cacheKey = this.generateCacheKey(key, params, context);
            const cachedResult = this.mainCache.get(cacheKey);

            if (cachedResult !== undefined) {
                this.stats.hits++;
                console.log(`Cache HIT para: ${cacheKey}`);
                return cachedResult;
            }

            this.stats.misses++;
            console.log(`Cache MISS para: ${cacheKey}`);

            // Ejecutar función de fetch
            const result = await fetchFunction();

            // Almacenar en cache
            const ttl = this.determineTTL(key, context);
            this.mainCache.set(cacheKey, result, ttl);
            this.stats.sets++;

            // Actualizar estadísticas de rendimiento
            this.updatePerformanceStats(cacheKey, 'miss');

            return result;

        } catch (error) {
            console.error('Error en getWithCache:', error);
            // En caso de error, intentar ejecutar sin cache
            return await fetchFunction();
        }
    }

    /**
     * Generar clave de cache única
     */
    generateCacheKey(sql, params = [], context = {}) {
        const { idUsuario, idEmpresa } = context;

        // Normalizar SQL (remover espacios extra, convertir a minúsculas)
        const normalizedSQL = sql
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

        // Crear hash de parámetros
        const paramsHash = this.hashParams(params);

        // Incluir contexto de usuario/empresa para aislamiento
        const contextKey = `${idEmpresa || 'global'}_${idUsuario || 'anonymous'}`;

        return `${contextKey}_${normalizedSQL}_${paramsHash}`;
    }

    /**
     * Crear hash simple de parámetros
     */
    hashParams(params) {
        if (!params || params.length === 0) return 'no_params';

        return params
            .map(param => {
                if (param === null || param === undefined) return 'null';
                if (typeof param === 'object') return JSON.stringify(param);
                return String(param);
            })
            .join('_')
            .replace(/[^a-zA-Z0-9_]/g, '_');
    }

    /**
     * Determinar TTL basado en tipo de consulta
     */
    determineTTL(sql, context = {}) {
        const sqlLower = sql.toLowerCase();

        // Determinar tipo de consulta
        if (sqlLower.includes('conductores') || sqlLower.includes('driver')) {
            return this.ttlConfig.driver_queries;
        }

        if (sqlLower.includes('vehiculos') || sqlLower.includes('vehicle')) {
            return this.ttlConfig.vehicle_queries;
        }

        if (sqlLower.includes('rutas') || sqlLower.includes('route')) {
            return this.ttlConfig.route_queries;
        }

        if (sqlLower.includes('viajes') || sqlLower.includes('schedule')) {
            return this.ttlConfig.schedule_queries;
        }

        if (sqlLower.includes('estado') || sqlLower.includes('status')) {
            return this.ttlConfig.system_status;
        }

        if (sqlLower.includes('licencia') || sqlLower.includes('license')) {
            return this.ttlConfig.license_queries;
        }

        if (sqlLower.includes('mantenimiento') || sqlLower.includes('maintenance')) {
            return this.ttlConfig.maintenance_queries;
        }

        // TTL por defecto
        return 300; // 5 minutos
    }

    /**
     * Invalidar cache por tabla
     */
    invalidateByTable(tableName, companyId = null) {
        const keys = this.mainCache.keys();
        let invalidated = 0;

        keys.forEach(key => {
            if (key.toLowerCase().includes(tableName.toLowerCase())) {
                if (!companyId || key.includes(`_${companyId}_`)) {
                    this.mainCache.del(key);
                    invalidated++;
                    this.stats.deletes++;
                }
            }
        });

        console.log(`Invalidado cache para tabla ${tableName}: ${invalidated} entradas`);
        return invalidated;
    }

    /**
     * Invalidar cache por empresa
     */
    invalidateByCompany(companyId) {
        const keys = this.mainCache.keys();
        let invalidated = 0;

        keys.forEach(key => {
            if (key.startsWith(`${companyId}_`)) {
                this.mainCache.del(key);
                invalidated++;
                this.stats.deletes++;
            }
        });

        console.log(`Invalidado cache para empresa ${companyId}: ${invalidated} entradas`);
        return invalidated;
    }

    /**
     * Invalidar cache específico del dashboard
     */
    invalidateDashboardCache(empresaId, cacheType = null) {
        const keys = this.mainCache.keys();
        let invalidated = 0;

        keys.forEach(key => {
            const isDashboardKey = key.includes('dashboard_');
            const isCompanyKey = key.startsWith(`${empresaId}_`);

            if (isDashboardKey && isCompanyKey) {
                if (!cacheType || key.includes(cacheType)) {
                    this.mainCache.del(key);
                    invalidated++;
                    this.stats.deletes++;
                }
            }
        });

        console.log(`Invalidado cache del dashboard para empresa ${empresaId}${cacheType ? ` (${cacheType})` : ''}: ${invalidated} entradas`);
        return invalidated;
    }

    /**
     * Precargar datos del dashboard para una empresa
     */
    async preloadDashboardData(pool, empresaId) {
        console.log(`Precargando datos del dashboard para empresa ${empresaId}...`);

        try {
            // Precargar estadísticas generales
            const statsResult = await pool.query(`
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
            `, [empresaId]);

            const cacheKey = this.generateCacheKey('dashboard_stats_general', [empresaId], { idEmpresa: empresaId });
            this.mainCache.set(cacheKey, statsResult[0], this.ttlConfig.dashboard_stats_general);

            // Precargar datos en tiempo real
            const realtimeResult = await pool.query(`
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
            `, [empresaId]);

            const realtimeCacheKey = this.generateCacheKey('dashboard_realtime_data', [empresaId], { idEmpresa: empresaId });
            this.mainCache.set(realtimeCacheKey, realtimeResult[0], this.ttlConfig.dashboard_realtime_data);

            console.log(`✅ Datos del dashboard precargados para empresa ${empresaId}`);
            return { stats: statsResult[0], realtime: realtimeResult[0] };

        } catch (error) {
            console.error(`❌ Error precargando datos del dashboard para empresa ${empresaId}:`, error);
            throw error;
        }
    }

    /**
     * Precargar consultas comunes
     */
    async preloadCommonQueries(pool, companyId) {
        const commonQueries = [
            {
                sql: 'SELECT COUNT(*) as total FROM Conductores WHERE idEmpresa = ? AND estConductor = ?',
                params: [companyId, 'ACTIVO'],
                key: 'active_drivers_count'
            },
            {
                sql: 'SELECT COUNT(*) as total FROM Vehiculos WHERE idEmpresa = ? AND estVehiculo = ?',
                params: [companyId, 'DISPONIBLE'],
                key: 'available_vehicles_count'
            },
            {
                sql: 'SELECT COUNT(*) as total FROM Viajes v JOIN Vehiculos ve ON v.idVehiculo = ve.idVehiculo WHERE ve.idEmpresa = ? AND v.estViaje = ?',
                params: [companyId, 'EN_CURSO'],
                key: 'ongoing_trips_count'
            }
        ];

        for (const query of commonQueries) {
            try {
                const result = await pool.query(query.sql, query.params);
                const cacheKey = this.generateCacheKey(query.sql, query.params, { idEmpresa: companyId });

                this.commonQueriesCache.set(cacheKey, result[0], this.ttlConfig.system_status);
                console.log(`Precargada consulta común: ${query.key}`);
            } catch (error) {
                console.error(`Error precargando consulta ${query.key}:`, error);
            }
        }
    }

    /**
     * Obtener estadísticas de rendimiento
     */
    getPerformanceStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

        return {
            cacheStats: {
                hits: this.stats.hits,
                misses: this.stats.misses,
                sets: this.stats.sets,
                deletes: this.stats.deletes,
                hitRate: hitRate.toFixed(2) + '%'
            },
            cacheInfo: {
                mainCacheKeys: this.mainCache.keys().length,
                commonCacheKeys: this.commonQueriesCache.keys().length,
                lastCleanup: new Date(this.stats.lastCleanup).toISOString()
            },
            memoryUsage: this.getMemoryUsage()
        };
    }

    /**
     * Obtener uso de memoria
     */
    getMemoryUsage() {
        // Estimación simple del uso de memoria
        const mainCacheSize = this.mainCache.keys().length;
        const commonCacheSize = this.commonQueriesCache.keys().length;

        return {
            estimatedEntries: mainCacheSize + commonCacheSize,
            mainCacheEntries: mainCacheSize,
            commonCacheEntries: commonCacheSize
        };
    }

    /**
     * Actualizar estadísticas de rendimiento
     */
    updatePerformanceStats(cacheKey, result) {
        // Aquí podríamos almacenar estadísticas por consulta específica
        // Por ahora, solo mantenemos contadores globales
    }

    /**
     * Limpiar entradas expiradas manualmente
     */
    cleanup() {
        const mainCleaned = this.mainCache.getStats().keys - this.mainCache.keys().length;
        const commonCleaned = this.commonQueriesCache.getStats().keys - this.commonQueriesCache.keys().length;

        this.stats.lastCleanup = Date.now();

        console.log(`Limpieza de cache completada: ${mainCleaned + commonCleaned} entradas eliminadas`);
        return mainCleaned + commonCleaned;
    }

    /**
     * Iniciar limpieza automática
     */
    startAutoCleanup() {
        // Limpiar cada hora
        setInterval(() => {
            this.cleanup();
        }, 60 * 60 * 1000); // 1 hora
    }

    /**
     * Limpiar todo el cache
     */
    clearAll() {
        this.mainCache.flushAll();
        this.commonQueriesCache.flushAll();

        // Resetear estadísticas
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            lastCleanup: Date.now()
        };

        console.log('Cache completamente limpiado');
    }

    /**
     * Obtener claves de cache para debugging
     */
    getCacheKeys(limit = 10) {
        const mainKeys = this.mainCache.keys().slice(0, limit);
        const commonKeys = this.commonQueriesCache.keys().slice(0, limit);

        return {
            mainCache: mainKeys,
            commonCache: commonKeys
        };
    }

    /**
     * Verificar si una clave existe en cache
     */
    has(key, params = [], context = {}) {
        const cacheKey = this.generateCacheKey(key, params, context);
        return this.mainCache.has(cacheKey) || this.commonQueriesCache.has(cacheKey);
    }

    /**
     * Obtener TTL restante para una clave
     */
    getTTL(key, params = [], context = {}) {
        const cacheKey = this.generateCacheKey(key, params, context);

        let ttl = this.mainCache.getTtl(cacheKey);
        if (ttl) return ttl;

        ttl = this.commonQueriesCache.getTtl(cacheKey);
        return ttl || 0;
    }

    /**
     * Forzar refresh de una consulta específica
     */
    async refreshQuery(key, params = [], context = {}, fetchFunction) {
        const cacheKey = this.generateCacheKey(key, params, context);

        // Eliminar de cache
        this.mainCache.del(cacheKey);
        this.commonQueriesCache.del(cacheKey);

        // Re-ejecutar y cachear
        if (fetchFunction) {
            const result = await fetchFunction();
            const ttl = this.determineTTL(key, context);
            this.mainCache.set(cacheKey, result, ttl);
            return result;
        }

        return null;
    }
}

module.exports = new CacheService();