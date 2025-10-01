// src/controllers/navegacionController.js

const NavegacionService = require('../services/navegacionService');
const UbicacionService = require('../services/ubicacionService');

/**
 * Controlador para sistema avanzado de navegación y rutas
 */
class NavegacionController {

    /**
     * POST /api/navegacion/ruta
     * Calcular ruta óptima entre dos puntos
     */
    static async calcularRuta(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const {
                origen,
                destino,
                modo = 'rapido',
                evitarPeajes = false,
                evitarTrafico = true,
                horaSalida
            } = req.body;

            // Validaciones básicas
            if (!origen || !destino) {
                return res.status(400).json({
                    error: 'Origen y destino son requeridos'
                });
            }

            if (!origen.latitud || !origen.longitud || !destino.latitud || !destino.longitud) {
                return res.status(400).json({
                    error: 'Coordenadas de origen y destino son requeridas'
                });
            }

            // Calcular ruta óptima
            const resultadoRuta = await NavegacionService.calcularRutaOptima(origen, destino, {
                modo,
                evitarPeajes,
                evitarTrafico,
                horaSalida: horaSalida ? new Date(horaSalida) : new Date()
            });

            // Registrar uso para analytics (si el usuario está usando una ruta específica)
            if (resultadoRuta.rutaRecomendada.idRuta) {
                await NavegacionService.registrarUsoRuta({
                    idRuta: resultadoRuta.rutaRecomendada.idRuta,
                    idUsuario,
                    ubicacionUsuario: origen,
                    tiempoReal: resultadoRuta.rutaRecomendada.tiempoEstimado
                });
            }

            res.json({
                resultado: resultadoRuta,
                calculado: new Date().toISOString(),
                usuario: idUsuario
            });

        } catch (error) {
            console.error('Error calculando ruta:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/navegacion/rutas/{id}/eta
     * Calcular tiempo estimado de llegada para una ruta específica
     */
    static async calcularETA(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const { id } = req.params; // idRuta
            const {
                lat,
                lng,
                considerarTrafico = true
            } = req.query;

            // Validaciones básicas
            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Ubicación actual (lat, lng) es requerida'
                });
            }

            const ubicacionUsuario = {
                latitud: parseFloat(lat),
                longitud: parseFloat(lng)
            };

            // Calcular ETA
            const resultadoETA = await NavegacionService.calcularETA(
                parseInt(id),
                ubicacionUsuario,
                {
                    considerarTrafico: considerarTrafico === 'true',
                    horaActual: new Date()
                }
            );

            res.json({
                resultado: resultadoETA,
                calculado: new Date().toISOString(),
                usuario: idUsuario
            });

        } catch (error) {
            console.error('Error calculando ETA:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * POST /api/navegacion/rutas/uso
     * Registrar uso de ruta para analytics
     */
    static async registrarUsoRuta(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const {
                idRuta,
                ubicacionUsuario,
                tiempoReal,
                calificacion,
                comentarios
            } = req.body;

            // Validaciones básicas
            if (!idRuta || !ubicacionUsuario) {
                return res.status(400).json({
                    error: 'ID de ruta y ubicación del usuario son requeridos'
                });
            }

            const resultado = await NavegacionService.registrarUsoRuta({
                idRuta,
                idUsuario,
                ubicacionUsuario,
                tiempoReal,
                calificacion,
                comentarios
            });

            res.json({
                mensaje: 'Uso de ruta registrado exitosamente',
                registrado: resultado,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error registrando uso de ruta:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/navegacion/rutas/alternativas
     * Encontrar rutas alternativas
     */
    static async obtenerRutasAlternativas(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const {
                origen,
                destino,
                excluirRutaId
            } = req.query;

            // Validaciones básicas
            if (!origen || !destino) {
                return res.status(400).json({
                    error: 'Origen y destino son requeridos'
                });
            }

            // Parsear coordenadas
            const origenCoords = {
                latitud: parseFloat(origen.split(',')[0]),
                longitud: parseFloat(origen.split(',')[1])
            };

            const destinoCoords = {
                latitud: parseFloat(destino.split(',')[0]),
                longitud: parseFloat(destino.split(',')[1])
            };

            // Obtener rutas alternativas
            const rutasAlternativas = await NavegacionService.obtenerRutasAlternativas(
                origenCoords,
                destinoCoords,
                excluirRutaId ? parseInt(excluirRutaId) : null
            );

            res.json({
                origen: origenCoords,
                destino: destinoCoords,
                rutasAlternativas,
                total: rutasAlternativas.length,
                calculado: new Date().toISOString(),
                usuario: idUsuario
            });

        } catch (error) {
            console.error('Error obteniendo rutas alternativas:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/navegacion/rutas/{id}/trafico
     * Información de tráfico en tiempo real para una ruta
     */
    static async obtenerInfoTrafico(req, res) {
        try {
            const { id } = req.params; // idRuta

            const infoTrafico = await NavegacionService.obtenerInfoTrafico(parseInt(id));

            res.json({
                idRuta: parseInt(id),
                informacionTrafico: infoTrafico,
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
     * POST /api/navegacion/ruta/multi-stop
     * Calcular ruta con múltiples destinos
     */
    static async calcularRutaMultiStop(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const {
                destinos,
                modo = 'rapido',
                evitarPeajes = false,
                evitarTrafico = true
            } = req.body;

            // Validaciones básicas
            if (!destinos || !Array.isArray(destinos) || destinos.length < 2) {
                return res.status(400).json({
                    error: 'Se necesitan al menos 2 destinos'
                });
            }

            // Validar que todos los destinos tengan coordenadas
            for (const destino of destinos) {
                if (!destino.latitud || !destino.longitud) {
                    return res.status(400).json({
                        error: 'Todos los destinos deben tener latitud y longitud'
                    });
                }
            }

            // Calcular ruta multi-stop
            const resultadoRuta = await NavegacionService.calcularRutaMultiStop(destinos, {
                modo,
                evitarPeajes,
                evitarTrafico
            });

            res.json({
                resultado: resultadoRuta,
                calculado: new Date().toISOString(),
                usuario: idUsuario,
                totalDestinos: destinos.length
            });

        } catch (error) {
            console.error('Error calculando ruta multi-stop:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/navegacion/rutas/cercanas-optimizadas
     * Obtener rutas cercanas con paradas optimizadas
     */
    static async obtenerRutasCercanasOptimizadas(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const {
                lat,
                lng,
                radio = 5,
                destinoLat,
                destinoLng
            } = req.query;

            // Validaciones básicas
            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Ubicación actual (lat, lng) es requerida'
                });
            }

            // Si hay destino, calcular rutas optimizadas hacia ese punto
            let resultadoOptimizado = null;
            if (destinoLat && destinoLng) {
                resultadoOptimizado = await NavegacionService.calcularRutaOptima(
                    { latitud: parseFloat(lat), longitud: parseFloat(lng) },
                    { latitud: parseFloat(destinoLat), longitud: parseFloat(destinoLng) }
                );
            }

            // Obtener ubicación enriquecida
            const infoUbicacion = await UbicacionService.obtenerInfoUbicacionEnriquecida(
                parseFloat(lat),
                parseFloat(lng)
            );

            res.json({
                ubicacion: {
                    latitud: parseFloat(lat),
                    longitud: parseFloat(lng),
                    radio: parseFloat(radio)
                },
                destino: destinoLat && destinoLng ? {
                    latitud: parseFloat(destinoLat),
                    longitud: parseFloat(destinoLng)
                } : null,
                rutasOptimizadas: resultadoOptimizado,
                puntosInteres: infoUbicacion.puntosCercanos.slice(0, 10), // Top 10
                rutasCercanas: infoUbicacion.rutasCercanas,
                calculado: new Date().toISOString(),
                usuario: idUsuario
            });

        } catch (error) {
            console.error('Error obteniendo rutas cercanas optimizadas:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/navegacion/estimacion-tiempo
     * Obtener estimación de tiempo entre dos puntos
     */
    static async obtenerEstimacionTiempo(req, res) {
        try {
            const {
                origenLat,
                origenLng,
                destinoLat,
                destinoLng,
                velocidadKmh = 35
            } = req.query;

            // Validaciones básicas
            if (!origenLat || !origenLng || !destinoLat || !destinoLng) {
                return res.status(400).json({
                    error: 'Coordenadas de origen y destino son requeridas'
                });
            }

            const distancia = UbicacionService.calcularDistanciaHaversine(
                parseFloat(origenLat),
                parseFloat(origenLng),
                parseFloat(destinoLat),
                parseFloat(destinoLng)
            );

            const estimacion = UbicacionService.calcularETA(distancia, parseFloat(velocidadKmh));

            res.json({
                origen: {
                    latitud: parseFloat(origenLat),
                    longitud: parseFloat(origenLng)
                },
                destino: {
                    latitud: parseFloat(destinoLat),
                    longitud: parseFloat(destinoLng)
                },
                distanciaKm: distancia,
                velocidadKmh: parseFloat(velocidadKmh),
                estimacion,
                calculado: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error obteniendo estimación de tiempo:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/navegacion/rutas/{id}/paradas-optimizadas
     * Obtener paradas de ruta ordenadas por distancia desde ubicación usuario
     */
    static async obtenerParadasOptimizadas(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const { id } = req.params; // idRuta
            const { lat, lng } = req.query;

            // Validaciones básicas
            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Ubicación actual (lat, lng) es requerida'
                });
            }

            // Obtener ubicación del usuario
            const ubicacionUsuario = {
                latitud: parseFloat(lat),
                longitud: parseFloat(lng)
            };

            // Obtener paradas de la ruta
            const PuntoInteres = require('../models/PuntoInteres');
            const paradas = await PuntoInteres.obtenerPorRuta(parseInt(id));

            // Calcular distancias y tiempos estimados para cada parada
            const paradasOptimizadas = [];

            for (const parada of paradas) {
                const distancia = UbicacionService.calcularDistanciaHaversine(
                    ubicacionUsuario.latitud,
                    ubicacionUsuario.longitud,
                    parada.latitud,
                    parada.longitud
                );

                const tiempoEstimado = UbicacionService.calcularETA(distancia, 35);

                paradasOptimizadas.push({
                    ...parada,
                    distanciaDesdeUsuario: distancia,
                    tiempoEstimadoMin: tiempoEstimado.tiempoMinutos,
                    tiempoLlegada: new Date(Date.now() + tiempoEstimado.tiempoMinutos * 60 * 1000).toISOString()
                });
            }

            // Ordenar por distancia
            paradasOptimizadas.sort((a, b) => a.distanciaDesdeUsuario - b.distanciaDesdeUsuario);

            res.json({
                ruta: {
                    idRuta: parseInt(id)
                },
                ubicacionUsuario,
                paradas: paradasOptimizadas,
                totalParadas: paradasOptimizadas.length,
                calculado: new Date().toISOString(),
                usuario: idUsuario
            });

        } catch (error) {
            console.error('Error obteniendo paradas optimizadas:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }
}

module.exports = NavegacionController;