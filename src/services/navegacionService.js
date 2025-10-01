// src/services/navegacionService.js

const UbicacionService = require('./ubicacionService');
const PuntoInteres = require('../models/PuntoInteres');

/**
 * Servicio avanzado de navegación y cálculo de rutas estilo Waze
 */
class NavegacionService {

    /**
     * Calcular ruta óptima entre dos puntos
     */
    static async calcularRutaOptima(origen, destino, opciones = {}) {
        try {
            const {
                modo = 'rapido', // rapido, corto, ecologico
                evitarPeajes = false,
                evitarTrafico = true,
                horaSalida = new Date()
            } = opciones;

            // Validar coordenadas
            const origenValido = UbicacionService.validarCoordenadas(origen.latitud, origen.longitud);
            const destinoValido = UbicacionService.validarCoordenadas(destino.latitud, destino.longitud);

            if (!origenValido.valido || !destinoValido.valido) {
                throw new Error('Coordenadas de origen o destino inválidas');
            }

            // Calcular distancia directa
            const distanciaDirecta = UbicacionService.calcularDistanciaHaversine(
                origenValido.latitud, origenValido.longitud,
                destinoValido.latitud, destinoValido.longitud
            );

            // Obtener rutas existentes cercanas
            const rutasCercanas = await this.obtenerRutasCercanasConPuntos(
                origenValido.latitud, origenValido.longitud,
                destinoValido.latitud, destinoValido.longitud
            );

            // Calcular rutas alternativas
            const rutasAlternativas = await this.calcularRutasAlternativas(
                origenValido, destinoValido, rutasCercanas
            );

            // Seleccionar mejor ruta según criterios
            const mejorRuta = this.seleccionarMejorRuta(rutasAlternativas, modo, {
                evitarPeajes,
                evitarTrafico,
                horaSalida
            });

            return {
                origen: origenValido,
                destino: destinoValido,
                distanciaDirecta,
                rutasDisponibles: rutasAlternativas,
                rutaRecomendada: mejorRuta,
                criterios: {
                    modo,
                    evitarPeajes,
                    evitarTrafico,
                    horaSalida
                }
            };

        } catch (error) {
            console.error('Error calculando ruta óptima:', error);
            throw error;
        }
    }

    /**
     * Calcular tiempo estimado de llegada (ETA)
     */
    static async calcularETA(idRuta, ubicacionUsuario, opciones = {}) {
        try {
            const {
                considerarTrafico = true,
                horaActual = new Date()
            } = opciones;

            // Obtener información de la ruta
            const pool = require('../config/db');
            const [rutas] = await pool.query(`
                SELECT * FROM Rutas WHERE idRuta = ?
            `, [idRuta]);

            if (rutas.length === 0) {
                throw new Error('Ruta no encontrada');
            }

            const ruta = rutas[0];

            // Calcular distancia desde ubicación usuario hasta inicio de ruta
            let distanciaInicio = 0;
            if (ruta.coordenadasRuta) {
                const coordenadas = JSON.parse(ruta.coordenadasRuta);
                if (coordenadas.length > 0) {
                    const primerPunto = coordenadas[0];
                    distanciaInicio = UbicacionService.calcularDistanciaHaversine(
                        ubicacionUsuario.latitud, ubicacionUsuario.longitud,
                        primerPunto.lat, primerPunto.lng
                    );
                }
            }

            // Obtener velocidad promedio basada en condiciones
            let velocidadPromedio = this.obtenerVelocidadPromedio(ruta, horaActual, considerarTrafico);

            // Calcular tiempo base de la ruta
            const tiempoRutaBase = ruta.tiempoEstimadoMin || 60; // Default 60 min

            // Ajustar por distancia adicional hasta inicio
            const tiempoInicio = UbicacionService.calcularETA(distanciaInicio, velocidadPromedio);

            // Calcular tiempo total estimado
            const tiempoTotalMin = tiempoRutaBase + tiempoInicio.tiempoMinutos;

            // Calcular hora estimada de llegada
            const horaLlegada = new Date(horaActual.getTime() + (tiempoTotalMin * 60 * 1000));

            return {
                ruta: {
                    idRuta: ruta.idRuta,
                    nombre: ruta.nomRuta,
                    distanciaKm: ruta.distanciaKm,
                    tiempoEstimadoBaseMin: tiempoRutaBase
                },
                ubicacionUsuario: {
                    latitud: ubicacionUsuario.latitud,
                    longitud: ubicacionUsuario.longitud,
                    distanciaHastaInicioKm: distanciaInicio
                },
                calculos: {
                    velocidadPromedioKmh: velocidadPromedio,
                    tiempoInicioMin: tiempoInicio.tiempoMinutos,
                    tiempoRutaMin: tiempoRutaBase,
                    tiempoTotalMin: tiempoTotalMin,
                    horaLlegada: horaLlegada.toISOString(),
                    considerarTrafico,
                    horaCalculo: horaActual.toISOString()
                }
            };

        } catch (error) {
            console.error('Error calculando ETA:', error);
            throw error;
        }
    }

    /**
     * Obtener rutas cercanas con puntos de interés asociados
     */
    static async obtenerRutasCercanasConPuntos(latitud, longitud, latitudDestino, longitudDestino, radioKm = 10) {
        try {
            // Obtener puntos de interés cercanos
            const puntosCercanos = await PuntoInteres.obtenerCercanos(
                latitud,
                longitud,
                radioKm,
                ['TERMINAL', 'ESTACION']
            );

            // Obtener puntos cercanos al destino
            const puntosDestino = await PuntoInteres.obtenerCercanos(
                latitudDestino,
                longitudDestino,
                radioKm,
                ['TERMINAL', 'ESTACION']
            );

            // Cruzar información para encontrar rutas que conecten origen y destino
            const rutasEncontradas = {};

            puntosCercanos.forEach(puntoOrigen => {
                if (puntoOrigen.idRutaAsociada) {
                    puntosDestino.forEach(puntoDestino => {
                        if (puntoDestino.idRutaAsociada === puntoOrigen.idRutaAsociada) {
                            if (!rutasEncontradas[puntoOrigen.idRutaAsociada]) {
                                rutasEncontradas[puntoOrigen.idRutaAsociada] = {
                                    idRuta: puntoOrigen.idRutaAsociada,
                                    puntoOrigen,
                                    puntoDestino,
                                    distanciaOrigen: puntoOrigen.distancia_km,
                                    distanciaDestino: puntoDestino.distancia_km
                                };
                            }
                        }
                    });
                }
            });

            return Object.values(rutasEncontradas);

        } catch (error) {
            console.error('Error obteniendo rutas cercanas con puntos:', error);
            throw error;
        }
    }

    /**
     * Calcular rutas alternativas
     */
    static async calcularRutasAlternativas(origen, destino, rutasBase) {
        try {
            const rutasAlternativas = [];

            // Agregar ruta directa (sin usar transporte público)
            rutasAlternativas.push({
                tipo: 'directa',
                nombre: 'Ruta directa',
                origen,
                destino,
                distancia: UbicacionService.calcularDistanciaHaversine(
                    origen.latitud, origen.longitud,
                    destino.latitud, destino.longitud
                ),
                tiempoEstimado: this.estimarTiempoRutaDirecta(origen, destino),
                costo: 'bajo',
                descripcion: 'Ruta directa en vehículo particular'
            });

            // Agregar rutas de transporte público encontradas
            for (const rutaBase of rutasBase) {
                const distanciaTotal = rutaBase.puntoDestino.distancia_km + rutaBase.puntoOrigen.distancia_km +
                                     (rutaBase.puntoDestino.idRutaAsociada ? await this.obtenerDistanciaRuta(rutaBase.puntoDestino.idRutaAsociada) : 0);

                rutasAlternativas.push({
                    tipo: 'transporte',
                    idRuta: rutaBase.idRuta,
                    nombre: `Transporte público - ${rutaBase.puntoDestino.nombrePoi}`,
                    origen: rutaBase.puntoOrigen,
                    destino: rutaBase.puntoDestino,
                    distancia: distanciaTotal,
                    tiempoEstimado: await this.estimarTiempoRutaTransporte(rutaBase.idRuta),
                    costo: 'medio',
                    descripcion: `Usar transporte público desde ${rutaBase.puntoOrigen.nombrePoi} hasta ${rutaBase.puntoDestino.nombrePoi}`
                });
            }

            return rutasAlternativas;

        } catch (error) {
            console.error('Error calculando rutas alternativas:', error);
            throw error;
        }
    }

    /**
     * Seleccionar mejor ruta según criterios
     */
    static seleccionarMejorRuta(rutas, modo, opciones) {
        if (rutas.length === 0) {
            return null;
        }

        let mejorRuta;

        switch (modo) {
            case 'rapido':
                mejorRuta = rutas.reduce((mejor, actual) =>
                    actual.tiempoEstimado < mejor.tiempoEstimado ? actual : mejor
                );
                break;

            case 'corto':
                mejorRuta = rutas.reduce((mejor, actual) =>
                    actual.distancia < mejor.distancia ? actual : mejor
                );
                break;

            case 'ecologico':
                // Priorizar rutas con menor impacto ambiental (transporte público)
                const rutasEco = rutas.filter(r => r.tipo === 'transporte');
                mejorRuta = rutasEco.length > 0 ? rutasEco[0] : rutas[0];
                break;

            default:
                mejorRuta = rutas[0];
        }

        return mejorRuta;
    }

    /**
     * Obtener velocidad promedio según condiciones
     */
    static obtenerVelocidadPromedio(ruta, horaActual, considerarTrafico) {
        let velocidadBase = 40; // km/h velocidad base en ciudad

        // Ajustar por hora del día
        const hora = horaActual.getHours();
        if (hora >= 7 && hora <= 9) {
            velocidadBase *= 0.7; // Hora pico mañana
        } else if (hora >= 17 && hora <= 19) {
            velocidadBase *= 0.7; // Hora pico tarde
        } else if (hora >= 22 || hora <= 6) {
            velocidadBase *= 1.2; // Horas de baja congestión
        }

        // Ajustar por tráfico si está disponible
        if (considerarTrafico && ruta.datosTrafico) {
            const trafico = JSON.parse(ruta.datosTrafico);
            if (trafico.nivel === 'ALTO') {
                velocidadBase *= 0.6;
            } else if (trafico.nivel === 'MODERADO') {
                velocidadBase *= 0.8;
            }
        }

        return Math.max(velocidadBase, 15); // Velocidad mínima 15 km/h
    }

    /**
     * Estimar tiempo para ruta directa
     */
    static estimarTiempoRutaDirecta(origen, destino) {
        const distancia = UbicacionService.calcularDistanciaHaversine(
            origen.latitud, origen.longitud,
            destino.latitud, destino.longitud
        );

        // Asumir velocidad promedio de 35 km/h en ciudad
        return UbicacionService.calcularETA(distancia, 35).tiempoMinutos;
    }

    /**
     * Estimar tiempo para ruta de transporte público
     */
    static async estimarTiempoRutaTransporte(idRuta) {
        try {
            const pool = require('../config/db');
            const [rutas] = await pool.query(`
                SELECT tiempoEstimadoMin FROM Rutas WHERE idRuta = ?
            `, [idRuta]);

            return rutas[0]?.tiempoEstimadoMin || 60; // Default 60 minutos
        } catch (error) {
            console.error('Error estimando tiempo de ruta transporte:', error);
            return 60;
        }
    }

    /**
     * Obtener distancia de una ruta
     */
    static async obtenerDistanciaRuta(idRuta) {
        try {
            const pool = require('../config/db');
            const [rutas] = await pool.query(`
                SELECT distanciaKm FROM Rutas WHERE idRuta = ?
            `, [idRuta]);

            return rutas[0]?.distanciaKm || 0;
        } catch (error) {
            console.error('Error obteniendo distancia de ruta:', error);
            return 0;
        }
    }

    /**
     * Obtener información de tráfico para una ruta
     */
    static async obtenerInfoTrafico(idRuta) {
        try {
            const pool = require('../config/db');
            const [rutas] = await pool.query(`
                SELECT datosTrafico FROM Rutas WHERE idRuta = ?
            `, [idRuta]);

            if (rutas[0]?.datosTrafico) {
                return JSON.parse(rutas[0].datosTrafico);
            }

            return {
                nivel: 'DESCONOCIDO',
                descripcion: 'Información de tráfico no disponible',
                ultimaActualizacion: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error obteniendo información de tráfico:', error);
            throw error;
        }
    }

    /**
     * Registrar uso de ruta para analytics
     */
    static async registrarUsoRuta(data) {
        try {
            const {
                idRuta,
                idUsuario,
                ubicacionUsuario,
                tiempoReal,
                calificacion
            } = data;

            const pool = require('../config/db');

            // Aquí se integraría con el modelo AnalyticsRuta cuando esté listo
            console.log('Registrando uso de ruta:', {
                idRuta,
                idUsuario,
                ubicacionUsuario,
                tiempoReal,
                calificacion,
                timestamp: new Date().toISOString()
            });

            // Por ahora solo logueamos, después integraremos con AnalyticsRuta
            return true;

        } catch (error) {
            console.error('Error registrando uso de ruta:', error);
            throw error;
        }
    }

    /**
     * Obtener rutas alternativas excluyendo una específica
     */
    static async obtenerRutasAlternativas(origen, destino, excluirRutaId = null) {
        try {
            const rutasBase = await this.obtenerRutasCercanasConPuntos(
                origen.latitud, origen.longitud,
                destino.latitud, destino.longitud
            );

            let rutasFiltradas = rutasBase;

            if (excluirRutaId) {
                rutasFiltradas = rutasBase.filter(r => r.idRuta !== excluirRutaId);
            }

            return await this.calcularRutasAlternativas(origen, destino, rutasFiltradas);

        } catch (error) {
            console.error('Error obteniendo rutas alternativas:', error);
            throw error;
        }
    }

    /**
     * Calcular ruta con múltiples destinos (multi-stop)
     */
    static async calcularRutaMultiStop(destinos, opciones = {}) {
        try {
            if (destinos.length < 2) {
                throw new Error('Se necesitan al menos 2 destinos');
            }

            const origen = destinos[0];
            const destinoFinal = destinos[destinos.length - 1];
            const puntosIntermedios = destinos.slice(1, -1);

            // Calcular ruta general
            const rutaPrincipal = await this.calcularRutaOptima(origen, destinoFinal, opciones);

            // Calcular optimización de puntos intermedios
            const rutaOptimizada = await this.optimizarPuntosIntermedios(
                origen,
                puntosIntermedios,
                destinoFinal,
                opciones
            );

            return {
                ...rutaPrincipal,
                puntosIntermedios: rutaOptimizada.puntosOptimizados,
                distanciaTotal: rutaOptimizada.distanciaTotal,
                tiempoTotal: rutaOptimizada.tiempoTotal,
                rutaCompleta: rutaOptimizada.rutaCompleta
            };

        } catch (error) {
            console.error('Error calculando ruta multi-stop:', error);
            throw error;
        }
    }

    /**
     * Optimizar orden de puntos intermedios
     */
    static async optimizarPuntosIntermedios(origen, puntosIntermedios, destino, opciones) {
        try {
            // Algoritmo simple de optimización (en producción usar TSP - Traveling Salesman Problem)
            const puntosOrdenados = [origen, ...puntosIntermedios, destino];

            let distanciaTotal = 0;
            let tiempoTotal = 0;

            for (let i = 0; i < puntosOrdenados.length - 1; i++) {
                const distancia = UbicacionService.calcularDistanciaHaversine(
                    puntosOrdenados[i].latitud, puntosOrdenados[i].longitud,
                    puntosOrdenados[i + 1].latitud, puntosOrdenados[i + 1].longitud
                );

                distanciaTotal += distancia;
                tiempoTotal += UbicacionService.calcularETA(distancia, 35).tiempoMinutos;
            }

            return {
                puntosOptimizados: puntosOrdenados,
                distanciaTotal,
                tiempoTotal,
                rutaCompleta: puntosOrdenados
            };

        } catch (error) {
            console.error('Error optimizando puntos intermedios:', error);
            throw error;
        }
    }
}

module.exports = NavegacionService;