// src/services/optimizacionService.js

const NodeCache = require('node-cache');

/**
 * Servicio de optimización de rendimiento y caché
 */
class OptimizacionService {

    constructor() {
        // Caché en memoria para consultas frecuentes
        this.cache = new NodeCache({
            stdTTL: 300, // 5 minutos
            checkperiod: 60, // Verificar expiración cada minuto
            maxKeys: 1000 // Máximo 1000 claves en caché
        });

        // Configuración de caché por tipo de datos
        this.cacheConfig = {
            ubicaciones: { ttl: 60, maxKeys: 500 }, // 1 minuto
            rutas: { ttl: 600, maxKeys: 200 }, // 10 minutos
            puntosInteres: { ttl: 1800, maxKeys: 300 }, // 30 minutos
            clima: { ttl: 600, maxKeys: 100 }, // 10 minutos
            analytics: { ttl: 300, maxKeys: 100 } // 5 minutos
        };

        this.estadisticas = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errores: 0
        };
    }

    /**
     * Obtener datos desde caché
     */
    get(cacheKey) {
        try {
            const data = this.cache.get(cacheKey);
            if (data !== undefined) {
                this.estadisticas.hits++;
                return data;
            }
            this.estadisticas.misses++;
            return null;
        } catch (error) {
            console.error('Error obteniendo de caché:', error);
            this.estadisticas.errores++;
            return null;
        }
    }

    /**
     * Guardar datos en caché
     */
    set(cacheKey, data, tipo = 'default') {
        try {
            const config = this.cacheConfig[tipo] || this.cacheConfig.default || { ttl: 300 };
            const success = this.cache.set(cacheKey, data, config.ttl);

            if (success) {
                this.estadisticas.sets++;
            }

            return success;
        } catch (error) {
            console.error('Error guardando en caché:', error);
            this.estadisticas.errores++;
            return false;
        }
    }

    /**
     * Eliminar datos de caché
     */
    del(cacheKey) {
        try {
            const success = this.cache.del(cacheKey);
            if (success) {
                this.estadisticas.deletes++;
            }
            return success;
        } catch (error) {
            console.error('Error eliminando de caché:', error);
            this.estadisticas.errores++;
            return false;
        }
    }

    /**
     * Limpiar todo el caché
     */
    flushAll() {
        try {
            this.cache.flushAll();
            this.estadisticas = { hits: 0, misses: 0, sets: 0, deletes: 0, errores: 0 };
            return true;
        } catch (error) {
            console.error('Error limpiando caché:', error);
            return false;
        }
    }

    /**
     * Obtener estadísticas de caché
     */
    getEstadisticas() {
        const keys = this.cache.getStats();

        return {
            ...this.estadisticas,
            keys,
            configuracion: this.cacheConfig,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generar clave de caché consistente
     */
    generarCacheKey(prefijo, parametros) {
        const paramsStr = JSON.stringify(parametros);
        const hash = require('crypto').createHash('md5').update(paramsStr).digest('hex');
        return `${prefijo}_${hash}`;
    }

    /**
     * Optimizar consulta de ubicaciones cercanas
     */
    async optimizarConsultaUbicacionesCercanas(latitud, longitud, radioKm, opciones = {}) {
        const cacheKey = this.generarCacheKey('ubicaciones_cercanas', {
            latitud, longitud, radioKm, opciones
        });

        // Verificar caché
        const cached = this.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const PuntoInteres = require('../models/PuntoInteres');

            // Usar consulta optimizada con índices espaciales
            const puntos = await PuntoInteres.obtenerCercanos(
                latitud,
                longitud,
                radioKm,
                opciones.tipos
            );

            // Aplicar filtros adicionales si es necesario
            let puntosFiltrados = puntos;

            if (opciones.nombre) {
                puntosFiltrados = puntosFiltrados.filter(p =>
                    p.nombrePoi.toLowerCase().includes(opciones.nombre.toLowerCase())
                );
            }

            if (opciones.minCalificacion) {
                puntosFiltrados = puntosFiltrados.filter(p =>
                    p.calificacion >= opciones.minCalificacion
                );
            }

            // Ordenar por distancia si no está ordenado
            if (opciones.ordenarPor === 'distancia') {
                puntosFiltrados.sort((a, b) => a.distancia_km - b.distancia_km);
            }

            // Limitar resultados
            if (opciones.limite) {
                puntosFiltrados = puntosFiltrados.slice(0, opciones.limite);
            }

            const resultado = {
                puntos: puntosFiltrados,
                total: puntosFiltrados.length,
                parametros: { latitud, longitud, radioKm, opciones }
            };

            // Guardar en caché
            this.set(cacheKey, resultado, 'ubicaciones');

            return resultado;

        } catch (error) {
            console.error('Error optimizando consulta de ubicaciones:', error);
            throw error;
        }
    }

    /**
     * Optimizar consulta de rutas populares
     */
    async optimizarConsultaRutasPopulares(opciones = {}) {
        const cacheKey = this.generarCacheKey('rutas_populares', opciones);

        // Verificar caché
        const cached = this.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const AnalyticsRuta = require('../models/AnalyticsRuta');

            const rutas = await AnalyticsRuta.obtenerRutasPopulares(
                opciones.fechaDesde,
                opciones.fechaHasta,
                opciones.limite || 10
            );

            const resultado = {
                rutas,
                total: rutas.length,
                parametros: opciones
            };

            // Guardar en caché
            this.set(cacheKey, resultado, 'rutas');

            return resultado;

        } catch (error) {
            console.error('Error optimizando consulta de rutas populares:', error);
            throw error;
        }
    }

    /**
     * Crear índice compuesto para consultas frecuentes
     */
    async crearIndicesOptimizacion() {
        try {
            const pool = require('../config/db');

            const indices = [
                // Índice para ubicaciones recientes
                `CREATE INDEX IF NOT EXISTS idx_ubicaciones_recientes
                 ON ubicaciones_usuario (idUsuario, fechaHora DESC)`,

                // Índice para puntos de interés por ubicación y tipo
                `CREATE INDEX IF NOT EXISTS idx_puntos_interes_tipo_ubicacion
                 ON puntos_interes (tipoPoi, latitud, longitud)`,

                // Índice para notificaciones activas
                `CREATE INDEX IF NOT EXISTS idx_notificaciones_activas
                 ON notificaciones_ruta (activa, tiempoInicio, tiempoFin)`,

                // Índice para analytics por período
                `CREATE INDEX IF NOT EXISTS idx_analytics_periodo
                 ON analytics_ruta_uso (fechaHoraInicio, idRuta)`,

                // Índice compuesto para rutas con coordenadas
                `CREATE INDEX IF NOT EXISTS idx_rutas_coordenadas_estado
                 ON Rutas (coordenadasRuta(255), estRuta)`
            ];

            const resultados = [];

            for (const indice of indices) {
                try {
                    await pool.query(indice);
                    resultados.push({ indice, estado: 'creado' });
                } catch (error) {
                    resultados.push({ indice, estado: 'error', error: error.message });
                }
            }

            return {
                resultados,
                total: indices.length,
                exitosos: resultados.filter(r => r.estado === 'creado').length
            };

        } catch (error) {
            console.error('Error creando índices de optimización:', error);
            throw error;
        }
    }

    /**
     * Analizar rendimiento de consultas lentas
     */
    async analizarConsultasLentas() {
        try {
            const pool = require('../config/db');

            // Obtener consultas lentas (simulado - en producción usarías el log de consultas lentas de MySQL)
            const consultasLentas = [
                {
                    query: 'SELECT * FROM ubicaciones_usuario WHERE idUsuario = ? ORDER BY fechaHora DESC',
                    tiempo: 150,
                    frecuencia: 45,
                    sugerencia: 'Agregar índice compuesto (idUsuario, fechaHora)'
                },
                {
                    query: 'SELECT * FROM puntos_interes WHERE calcular_distancia_haversine(latitud, longitud, ?, ?) <= ?',
                    tiempo: 300,
                    frecuencia: 23,
                    sugerencia: 'Optimizar función de distancia o usar PostGIS'
                }
            ];

            return {
                consultasLentas,
                total: consultasLentas.length,
                recomendaciones: [
                    'Implementar caché Redis para consultas frecuentes',
                    'Crear índices espaciales para consultas geográficas',
                    'Optimizar funciones de distancia Haversine',
                    'Implementar paginación para consultas grandes'
                ],
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error analizando consultas lentas:', error);
            throw error;
        }
    }

    /**
     * Optimizar imagen de ubicación para diferentes usos
     */
    optimizarImagenUbicacion(bufferImagen, opciones = {}) {
        try {
            // En producción usarías una librería como sharp o jimp para optimizar imágenes
            const {
                calidad = 80,
                ancho = 800,
                formato = 'jpeg'
            } = opciones;

            // Simulación de optimización
            const imagenOptimizada = {
                original: bufferImagen.length,
                optimizada: Math.floor(bufferImagen.length * 0.7), // Simular reducción del 30%
                formato,
                calidad,
                ancho,
                procesado: new Date().toISOString()
            };

            return imagenOptimizada;

        } catch (error) {
            console.error('Error optimizando imagen:', error);
            throw error;
        }
    }

    /**
     * Comprimir datos JSON para transmisión
     */
    comprimirDatosJSON(datos) {
        try {
            // En producción usarías una librería de compresión
            const jsonString = JSON.stringify(datos);

            // Simulación de compresión
            const comprimido = {
                original: jsonString.length,
                comprimido: Math.floor(jsonString.length * 0.6), // Simular compresión del 40%
                algoritmo: 'simulado',
                timestamp: new Date().toISOString()
            };

            return comprimido;

        } catch (error) {
            console.error('Error comprimiendo datos JSON:', error);
            throw error;
        }
    }

    /**
     * Generar reporte de optimización
     */
    async generarReporteOptimizacion() {
        try {
            const [
                estadisticasCache,
                indices,
                consultasLentas
            ] = await Promise.all([
                this.getEstadisticas(),
                this.crearIndicesOptimizacion(),
                this.analizarConsultasLentas()
            ]);

            return {
                resumen: {
                    cacheHits: estadisticasCache.hits,
                    cacheMisses: estadisticasCache.misses,
                    ratioCache: estadisticasCache.hits / (estadisticasCache.hits + estadisticasCache.misses),
                    indicesCreados: indices.exitosos,
                    consultasLentas: consultasLentas.total
                },
                cache: estadisticasCache,
                indices: indices,
                consultasLentas: consultasLentas,
                recomendaciones: [
                    'Implementar Redis para caché distribuido',
                    'Usar PostGIS para consultas espaciales avanzadas',
                    'Implementar CDN para archivos estáticos',
                    'Optimizar imágenes con WebP',
                    'Implementar compresión gzip/brotli'
                ],
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error generando reporte de optimización:', error);
            throw error;
        }
    }

    /**
     * Limpiar caché antiguo automáticamente
     */
    iniciarLimpiezaAutomatica() {
        // Limpiar caché cada hora
        setInterval(() => {
            const keysBefore = this.cache.getStats().keys;
            this.cache.flushAll();
            const keysAfter = 0;

            console.log(`🧹 Caché limpiado automáticamente: ${keysBefore} claves eliminadas`);
        }, 60 * 60 * 1000); // 1 hora

        console.log('✅ Limpieza automática de caché iniciada');
    }

    /**
     * Obtener métricas de rendimiento del sistema
     */
    obtenerMetricasRendimiento() {
        const memoria = process.memoryUsage();
        const uptime = process.uptime();

        return {
            memoria: {
                rss: Math.round(memoria.rss / 1024 / 1024), // MB
                heapTotal: Math.round(memoria.heapTotal / 1024 / 1024), // MB
                heapUsed: Math.round(memoria.heapUsed / 1024 / 1024), // MB
                external: Math.round(memoria.external / 1024 / 1024) // MB
            },
            sistema: {
                uptime: Math.round(uptime), // segundos
                plataforma: process.platform,
                arquitectura: process.arch,
                versionNode: process.version
            },
            cache: this.getEstadisticas(),
            timestamp: new Date().toISOString()
        };
    }
}

// Crear instancia singleton
const optimizacionService = new OptimizacionService();

// Iniciar limpieza automática
optimizacionService.iniciarLimpiezaAutomatica();

module.exports = optimizacionService;