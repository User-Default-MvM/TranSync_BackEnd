// src/controllers/integracionExternaController.js

const IntegracionExternaService = require('../services/integracionExternaService');

/**
 * Controlador para integración con servicios externos
 */
class IntegracionExternaController {

    /**
     * GET /api/integracion/geocoding
     * Obtener coordenadas desde dirección
     */
    static async geocoding(req, res) {
        try {
            const { direccion } = req.query;

            if (!direccion) {
                return res.status(400).json({
                    error: 'Dirección es requerida'
                });
            }

            const resultado = await IntegracionExternaService.geocoding(direccion);

            res.json({
                resultado,
                consulta: direccion,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error en geocoding:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/integracion/reverse-geocoding
     * Obtener dirección desde coordenadas
     */
    static async reverseGeocoding(req, res) {
        try {
            const { lat, lng } = req.query;

            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Latitud y longitud son requeridas'
                });
            }

            const resultado = await IntegracionExternaService.reverseGeocoding(
                parseFloat(lat),
                parseFloat(lng)
            );

            res.json({
                resultado,
                consulta: { latitud: parseFloat(lat), longitud: parseFloat(lng) },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error en reverse geocoding:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/integracion/clima
     * Obtener condiciones climáticas actuales
     */
    static async obtenerClima(req, res) {
        try {
            const { lat, lng } = req.query;

            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Latitud y longitud son requeridas'
                });
            }

            const resultado = await IntegracionExternaService.obtenerClimaActual(
                parseFloat(lat),
                parseFloat(lng)
            );

            res.json({
                resultado,
                consulta: { latitud: parseFloat(lat), longitud: parseFloat(lng) },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo clima:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/integracion/pronostico
     * Obtener pronóstico del clima
     */
    static async obtenerPronostico(req, res) {
        try {
            const { lat, lng, dias = 5 } = req.query;

            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Latitud y longitud son requeridas'
                });
            }

            const resultado = await IntegracionExternaService.obtenerPronosticoClima(
                parseFloat(lat),
                parseFloat(lng),
                parseInt(dias)
            );

            res.json({
                resultado,
                consulta: {
                    latitud: parseFloat(lat),
                    longitud: parseFloat(lng),
                    dias: parseInt(dias)
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo pronóstico:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/integracion/lugares
     * Buscar lugares cercanos
     */
    static async buscarLugares(req, res) {
        try {
            const { lat, lng, tipo, radio = 1000 } = req.query;

            if (!lat || !lng || !tipo) {
                return res.status(400).json({
                    error: 'Latitud, longitud y tipo son requeridos'
                });
            }

            const resultado = await IntegracionExternaService.buscarLugaresCercanos(
                parseFloat(lat),
                parseFloat(lng),
                tipo,
                parseInt(radio)
            );

            res.json({
                resultado,
                consulta: {
                    latitud: parseFloat(lat),
                    longitud: parseFloat(lng),
                    tipo,
                    radio: parseInt(radio)
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error buscando lugares:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/integracion/lugares/{placeId}
     * Obtener detalles de un lugar específico
     */
    static async obtenerDetallesLugar(req, res) {
        try {
            const { placeId } = req.params;

            if (!placeId) {
                return res.status(400).json({
                    error: 'ID del lugar es requerido'
                });
            }

            const resultado = await IntegracionExternaService.obtenerDetallesLugar(placeId);

            res.json({
                resultado,
                placeId,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo detalles del lugar:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/integracion/trafico
     * Obtener información de tráfico
     */
    static async obtenerInfoTrafico(req, res) {
        try {
            const { lat, lng, radio = 5 } = req.query;

            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Latitud y longitud son requeridas'
                });
            }

            const resultado = await IntegracionExternaService.obtenerInfoTrafico(
                parseFloat(lat),
                parseFloat(lng),
                parseFloat(radio)
            );

            res.json({
                resultado,
                consulta: {
                    latitud: parseFloat(lat),
                    longitud: parseFloat(lng),
                    radio: parseFloat(radio)
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo información de tráfico:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/integracion/ubicacion-enriquecida
     * Obtener información enriquecida de ubicación
     */
    static async obtenerUbicacionEnriquecida(req, res) {
        try {
            const { lat, lng } = req.query;

            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Latitud y longitud son requeridas'
                });
            }

            const resultado = await IntegracionExternaService.obtenerInfoUbicacionEnriquecida(
                parseFloat(lat),
                parseFloat(lng)
            );

            res.json({
                resultado,
                consulta: {
                    latitud: parseFloat(lat),
                    longitud: parseFloat(lng)
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo ubicación enriquecida:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/integracion/configuracion
     * Obtener estado de configuración de APIs externas
     */
    static async obtenerConfiguracion(req, res) {
        try {
            const configuracion = IntegracionExternaService.validarConfiguracion();
            const estadisticas = IntegracionExternaService.obtenerEstadisticasAPIs();

            res.json({
                configuracion,
                estadisticas,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo configuración:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * POST /api/integracion/cache/limpiar
     * Limpiar caché de APIs externas
     */
    static async limpiarCache(req, res) {
        try {
            IntegracionExternaService.limpiarCache();

            res.json({
                mensaje: 'Caché limpiado exitosamente',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error limpiando caché:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/integracion/tipos-lugares
     * Obtener tipos de lugares disponibles
     */
    static async obtenerTiposLugares(req, res) {
        try {
            const tiposLugares = [
                { tipo: 'restaurant', descripcion: 'Restaurantes y lugares para comer', icono: '🍽️' },
                { tipo: 'gas_station', descripcion: 'Estaciones de gasolina', icono: '⛽' },
                { tipo: 'hospital', descripcion: 'Hospitales y centros médicos', icono: '🏥' },
                { tipo: 'pharmacy', descripcion: 'Farmacias', icono: '💊' },
                { tipo: 'bank', descripcion: 'Bancos', icono: '🏦' },
                { tipo: 'atm', descripcion: 'Cajeros automáticos', icono: '💰' },
                { tipo: 'parking', descripcion: 'Estacionamientos', icono: '🅿️' },
                { tipo: 'shopping_mall', descripcion: 'Centros comerciales', icono: '🛍️' },
                { tipo: 'supermarket', descripcion: 'Supermercados', icono: '🛒' }
            ];

            res.json({
                tipos: tiposLugares,
                total: tiposLugares.length,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo tipos de lugares:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }
}

module.exports = IntegracionExternaController;