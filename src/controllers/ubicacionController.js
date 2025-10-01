// src/controllers/ubicacionController.js

const UbicacionUsuario = require('../models/UbicacionUsuario');
const PuntoInteres = require('../models/PuntoInteres');
const UbicacionService = require('../services/ubicacionService');

/**
 * Controlador para gestión avanzada de ubicación y geolocalización
 */
class UbicacionController {

    /**
     * POST /api/ubicacion/usuario
     * Recibir y almacenar ubicación del usuario
     */
    static async registrarUbicacion(req, res) {
        try {
            const { idUsuario } = req.usuario; // Del middleware de autenticación
            const {
                latitud,
                longitud,
                precisionMetros,
                velocidadKmh,
                rumboGrados,
                fuenteUbicacion = 'GPS',
                dispositivoInfo
            } = req.body;

            // Validaciones básicas
            if (!latitud || !longitud) {
                return res.status(400).json({
                    error: 'Latitud y longitud son requeridas'
                });
            }

            // Registrar ubicación usando el servicio
            const idUbicacion = await UbicacionService.registrarUbicacionUsuario({
                idUsuario,
                latitud,
                longitud,
                precisionMetros,
                velocidadKmh,
                rumboGrados,
                fuenteUbicacion,
                dispositivoInfo
            });

            res.status(201).json({
                mensaje: 'Ubicación registrada exitosamente',
                idUbicacion,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error registrando ubicación:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/ubicacion/usuario/historial
     * Obtener historial de ubicaciones del usuario
     */
    static async obtenerHistorial(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const {
                limite = 100,
                fechaDesde,
                fechaHasta
            } = req.query;

            const ubicaciones = await UbicacionUsuario.obtenerHistorialUsuario(idUsuario, {
                limite: parseInt(limite),
                fechaDesde,
                fechaHasta
            });

            res.json({
                total: ubicaciones.length,
                ubicaciones,
                filtros: {
                    limite,
                    fechaDesde,
                    fechaHasta
                }
            });

        } catch (error) {
            console.error('Error obteniendo historial de ubicaciones:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * PUT /api/ubicacion/usuario/{id}
     * Actualizar ubicación del usuario
     */
    static async actualizarUbicacion(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const {
                latitud,
                longitud,
                precisionMetros,
                velocidadKmh,
                rumboGrados,
                fuenteUbicacion,
                dispositivoInfo
            } = req.body;

            // Validaciones básicas
            if (!latitud || !longitud) {
                return res.status(400).json({
                    error: 'Latitud y longitud son requeridas'
                });
            }

            const exito = await UbicacionUsuario.actualizar(idUsuario, {
                latitud,
                longitud,
                precisionMetros,
                velocidadKmh,
                rumboGrados,
                fuenteUbicacion,
                dispositivoInfo
            });

            if (exito) {
                res.json({
                    mensaje: 'Ubicación actualizada exitosamente',
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(404).json({
                    error: 'Usuario no encontrado'
                });
            }

        } catch (error) {
            console.error('Error actualizando ubicación:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/rutas/cerca
     * Obtener rutas cercanas a ubicación del usuario
     */
    static async obtenerRutasCercanas(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const {
                lat,
                lng,
                radio = 5
            } = req.query;

            // Validaciones básicas
            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Coordenadas (lat, lng) son requeridas'
                });
            }

            // Obtener ubicación óptima del usuario para contexto adicional
            const ubicacionUsuario = await UbicacionService.obtenerUbicacionOptimaUsuario(idUsuario);

            // Obtener rutas cercanas
            const rutasCercanas = await UbicacionService.obtenerRutasCercanas(
                parseFloat(lat),
                parseFloat(lng),
                parseFloat(radio)
            );

            // Obtener información enriquecida de la ubicación
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
                ubicacionUsuario,
                rutasCercanas,
                puntosInteres: infoUbicacion.puntosCercanos,
                estadisticas: {
                    rutasEncontradas: rutasCercanas.length,
                    puntosInteresEncontrados: infoUbicacion.puntosCercanos.length
                }
            });

        } catch (error) {
            console.error('Error obteniendo rutas cercanas:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/paradas/cercanas
     * Buscar paradas cercanas a coordenadas específicas
     */
    static async obtenerParadasCercanas(req, res) {
        try {
            const {
                lat,
                lng,
                radio = 2,
                tipos = 'TERMINAL,ESTACION,PARADERO'
            } = req.query;

            // Validaciones básicas
            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Coordenadas (lat, lng) son requeridas'
                });
            }

            const tiposArray = tipos.split(',').map(t => t.trim());

            const paradas = await PuntoInteres.obtenerCercanos(
                parseFloat(lat),
                parseFloat(lng),
                parseFloat(radio),
                tiposArray
            );

            res.json({
                ubicacion: {
                    latitud: parseFloat(lat),
                    longitud: parseFloat(lng),
                    radio: parseFloat(radio)
                },
                tipos: tiposArray,
                paradas,
                total: paradas.length
            });

        } catch (error) {
            console.error('Error obteniendo paradas cercanas:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/ubicacion/info
     * Obtener información enriquecida de ubicación
     */
    static async obtenerInfoUbicacion(req, res) {
        try {
            const { lat, lng } = req.query;

            // Validaciones básicas
            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Coordenadas (lat, lng) son requeridas'
                });
            }

            const infoUbicacion = await UbicacionService.obtenerInfoUbicacionEnriquecida(
                parseFloat(lat),
                parseFloat(lng)
            );

            res.json(infoUbicacion);

        } catch (error) {
            console.error('Error obteniendo información de ubicación:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/ubicacion/usuarios/cercanos
     * Obtener usuarios cercanos (solo para administradores)
     */
    static async obtenerUsuariosCercanos(req, res) {
        try {
            // Verificar permisos de administrador
            if (req.usuario.idRol !== 1) { // Asumiendo 1 es SUPERADMIN
                return res.status(403).json({
                    error: 'Acceso denegado. Se requieren permisos de administrador.'
                });
            }

            const { lat, lng, radio = 5 } = req.query;

            // Validaciones básicas
            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Coordenadas (lat, lng) son requeridas'
                });
            }

            const usuariosCercanos = await UbicacionUsuario.obtenerUsuariosCercanos(
                parseFloat(lat),
                parseFloat(lng),
                parseFloat(radio)
            );

            res.json({
                ubicacion: {
                    latitud: parseFloat(lat),
                    longitud: parseFloat(lng),
                    radio: parseFloat(radio)
                },
                usuariosCercanos,
                total: usuariosCercanos.length
            });

        } catch (error) {
            console.error('Error obteniendo usuarios cercanos:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * GET /api/ubicacion/estadisticas
     * Obtener estadísticas de ubicaciones del usuario
     */
    static async obtenerEstadisticasUbicacion(req, res) {
        try {
            const { idUsuario } = req.usuario;
            const { fechaDesde, fechaHasta } = req.query;

            const estadisticas = await UbicacionUsuario.obtenerEstadisticasUsuario(
                idUsuario,
                fechaDesde,
                fechaHasta
            );

            res.json({
                usuario: idUsuario,
                estadisticas,
                periodo: {
                    fechaDesde,
                    fechaHasta
                }
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas de ubicación:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }

    /**
     * POST /api/ubicacion/validar
     * Validar coordenadas GPS
     */
    static async validarCoordenadas(req, res) {
        try {
            const { latitud, longitud } = req.body;

            if (!latitud || !longitud) {
                return res.status(400).json({
                    error: 'Latitud y longitud son requeridas'
                });
            }

            const validacion = UbicacionService.validarCoordenadas(latitud, longitud);

            res.json({
                coordenadas: {
                    latitud: parseFloat(latitud),
                    longitud: parseFloat(longitud)
                },
                validacion,
                formatos: UbicacionService.formatearCoordenadas(latitud, longitud, 'dms')
            });

        } catch (error) {
            console.error('Error validando coordenadas:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                mensaje: error.message
            });
        }
    }
}

module.exports = UbicacionController;