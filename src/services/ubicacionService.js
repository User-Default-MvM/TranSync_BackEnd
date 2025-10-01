// src/services/ubicacionService.js

const UbicacionUsuario = require('../models/UbicacionUsuario');
const PuntoInteres = require('../models/PuntoInteres');

/**
 * Servicio para funcionalidades avanzadas de ubicación y geolocalización
 */
class UbicacionService {

    /**
     * Validar coordenadas GPS
     */
    static validarCoordenadas(latitud, longitud) {
        const lat = parseFloat(latitud);
        const lng = parseFloat(longitud);

        if (isNaN(lat) || isNaN(lng)) {
            return { valido: false, error: 'Coordenadas deben ser números válidos' };
        }

        if (lat < -90 || lat > 90) {
            return { valido: false, error: 'Latitud debe estar entre -90 y 90' };
        }

        if (lng < -180 || lng > 180) {
            return { valido: false, error: 'Longitud debe estar entre -180 y 180' };
        }

        return { valido: true, latitud: lat, longitud: lng };
    }

    /**
     * Calcular distancia entre dos puntos usando fórmula de Haversine
     */
    static calcularDistanciaHaversine(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio de la Tierra en kilómetros
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distancia en kilómetros
    }

    /**
     * Convertir grados a radianes
     */
    static toRadians(grados) {
        return grados * (Math.PI / 180);
    }

    /**
     * Calcular tiempo estimado de llegada basado en distancia y velocidad
     */
    static calcularETA(distanciaKm, velocidadKmh) {
        if (velocidadKmh <= 0) {
            return { tiempoMinutos: 0, velocidad: velocidadKmh };
        }

        const tiempoHoras = distanciaKm / velocidadKmh;
        const tiempoMinutos = Math.round(tiempoHoras * 60);

        return {
            tiempoMinutos,
            velocidad: velocidadKmh,
            distancia: distanciaKm
        };
    }

    /**
     * Obtener rutas cercanas a ubicación del usuario
     */
    static async obtenerRutasCercanas(latitud, longitud, radioKm = 5) {
        try {
            // Obtener puntos de interés cercanos (terminales, estaciones)
            const puntosCercanos = await PuntoInteres.obtenerCercanos(
                latitud,
                longitud,
                radioKm,
                ['TERMINAL', 'ESTACION']
            );

            // Agrupar por ruta y calcular distancias mínimas
            const rutasCercanas = {};

            puntosCercanos.forEach(punto => {
                if (punto.idRutaAsociada) {
                    const distancia = punto.distancia_km;

                    if (!rutasCercanas[punto.idRutaAsociada] ||
                        distancia < rutasCercanas[punto.idRutaAsociada].distanciaMinima) {

                        rutasCercanas[punto.idRutaAsociada] = {
                            idRuta: punto.idRutaAsociada,
                            nombreRuta: punto.nombrePoi, // Usamos el nombre del punto como referencia
                            distanciaMinima: distancia,
                            puntoCercano: punto
                        };
                    }
                }
            });

            return Object.values(rutasCercanas);
        } catch (error) {
            console.error('Error obteniendo rutas cercanas:', error);
            throw error;
        }
    }

    /**
     * Registrar ubicación de usuario con validaciones
     */
    static async registrarUbicacionUsuario(data) {
        try {
            // Validar coordenadas
            const validacion = this.validarCoordenadas(data.latitud, data.longitud);
            if (!validacion.valido) {
                throw new Error(validacion.error);
            }

            // Validar precisión si está disponible
            if (data.precisionMetros !== undefined) {
                if (data.precisionMetros < 0 || data.precisionMetros > 10000) {
                    throw new Error('Precisión debe estar entre 0 y 10000 metros');
                }
            }

            // Validar velocidad si está disponible
            if (data.velocidadKmh !== undefined) {
                if (data.velocidadKmh < 0 || data.velocidadKmh > 300) {
                    throw new Error('Velocidad debe estar entre 0 y 300 km/h');
                }
            }

            // Crear ubicación
            const idUbicacion = await UbicacionUsuario.crear({
                ...data,
                latitud: validacion.latitud,
                longitud: validacion.longitud
            });

            return idUbicacion;
        } catch (error) {
            console.error('Error registrando ubicación de usuario:', error);
            throw error;
        }
    }

    /**
     * Obtener ubicación óptima para usuario (última conocida válida)
     */
    static async obtenerUbicacionOptimaUsuario(idUsuario) {
        try {
            // Obtener última ubicación conocida
            const ultimaUbicacion = await UbicacionUsuario.obtenerUltimaUbicacion(idUsuario);

            if (!ultimaUbicacion) {
                return null;
            }

            // Verificar si la ubicación es reciente (menos de 30 minutos)
            const minutosDesdeUltima = Math.floor(
                (new Date() - new Date(ultimaUbicacion.fechaHora)) / (1000 * 60)
            );

            if (minutosDesdeUltima > 30) {
                return null; // Ubicación muy antigua
            }

            // Verificar precisión
            if (ultimaUbicacion.precisionMetros > 100) {
                return null; // Precisión muy baja
            }

            return {
                latitud: ultimaUbicacion.latitud,
                longitud: ultimaUbicacion.longitud,
                precision: ultimaUbicacion.precisionMetros,
                velocidad: ultimaUbicacion.velocidadKmh,
                rumbo: ultimaUbicacion.rumboGrados,
                timestamp: ultimaUbicacion.fechaHora,
                fuente: ultimaUbicacion.fuenteUbicacion
            };
        } catch (error) {
            console.error('Error obteniendo ubicación óptima:', error);
            throw error;
        }
    }

    /**
     * Calcular área de cobertura alrededor de coordenadas
     */
    static calcularAreaCobertura(latitud, longitud, radioKm) {
        // Aproximación simple para área rectangular
        const latOffset = (radioKm / 111.32); // 1 grado ≈ 111.32 km
        const lngOffset = (radioKm / (111.32 * Math.cos(this.toRadians(latitud))));

        return {
            norte: latitud + latOffset,
            sur: latitud - latOffset,
            este: longitud + lngOffset,
            oeste: longitud - lngOffset,
            centro: { latitud, longitud },
            radio: radioKm
        };
    }

    /**
     * Verificar si coordenadas están dentro de área de cobertura
     */
    static estaDentroArea(latitud, longitud, area) {
        return latitud >= area.sur &&
               latitud <= area.norte &&
               longitud >= area.oeste &&
               longitud <= area.este;
    }

    /**
     * Obtener zona horaria basada en coordenadas
     */
    static obtenerZonaHoraria(latitud, longitud) {
        // Implementación básica - en producción usarías una librería como moment-timezone
        if (longitud >= -82 && longitud <= -34 && latitud >= -56 && latitud <= 15) {
            return 'America/Santiago'; // América del Sur
        }
        if (longitud >= -118 && longitud <= -34 && latitud >= 15 && latitud <= 84) {
            return 'America/New_York'; // América del Norte
        }
        return 'UTC'; // Default
    }

    /**
     * Formatear coordenadas para diferentes usos
     */
    static formatearCoordenadas(latitud, longitud, formato = 'decimal') {
        switch (formato) {
            case 'dms': // Grados, minutos, segundos
                const latDMS = this.decimalADMS(latitud, 'lat');
                const lngDMS = this.decimalADMS(longitud, 'lng');
                return { latitud: latDMS, longitud: lngDMS };

            case 'google': // Formato para Google Maps API
                return `${latitud},${longitud}`;

            case 'geo': // URI geo:
                return `geo:${latitud},${longitud}`;

            default:
                return { latitud, longitud };
        }
    }

    /**
     * Convertir coordenadas decimales a DMS
     */
    static decimalADMS(coordenada, tipo) {
        const absoluto = Math.abs(coordenada);
        const grados = Math.floor(absoluto);
        const minutosDecimal = (absoluto - grados) * 60;
        const minutos = Math.floor(minutosDecimal);
        const segundos = ((minutosDecimal - minutos) * 60).toFixed(2);

        const direccion = tipo === 'lat'
            ? (coordenada >= 0 ? 'N' : 'S')
            : (coordenada >= 0 ? 'E' : 'W');

        return `${grados}°${minutos}'${segundos}"${direccion}`;
    }

    /**
     * Calcular rumbo entre dos puntos
     */
    static calcularRumbo(lat1, lng1, lat2, lng2) {
        const dLng = this.toRadians(lng2 - lng1);

        const y = Math.sin(dLng) * Math.cos(this.toRadians(lat2));
        const x = Math.cos(this.toRadians(lat1)) * Math.sin(this.toRadians(lat2)) -
                  Math.sin(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.cos(dLng);

        let rumbo = Math.atan2(y, x);
        rumbo = this.toDegrees(rumbo);
        return (rumbo + 360) % 360; // Normalizar a 0-360
    }

    /**
     * Convertir radianes a grados
     */
    static toDegrees(radianes) {
        return radianes * (180 / Math.PI);
    }

    /**
     * Obtener información de ubicación enriquecida
     */
    static async obtenerInfoUbicacionEnriquecida(latitud, longitud) {
        try {
            const validacion = this.validarCoordenadas(latitud, longitud);
            if (!validacion.valido) {
                throw new Error(validacion.error);
            }

            // Obtener puntos de interés cercanos
            const puntosCercanos = await PuntoInteres.obtenerCercanos(
                validacion.latitud,
                validacion.longitud,
                2, // 2km de radio
                ['TERMINAL', 'ESTACION', 'COMERCIO']
            );

            // Obtener rutas cercanas
            const rutasCercanas = await this.obtenerRutasCercanas(
                validacion.latitud,
                validacion.longitud,
                5 // 5km de radio
            );

            // Calcular zona horaria
            const zonaHoraria = this.obtenerZonaHoraria(validacion.latitud, validacion.longitud);

            return {
                coordenadas: {
                    latitud: validacion.latitud,
                    longitud: validacion.longitud,
                    formatoDMS: this.formatearCoordenadas(validacion.latitud, validacion.longitud, 'dms'),
                    formatoGoogle: this.formatearCoordenadas(validacion.latitud, validacion.longitud, 'google')
                },
                zonaHoraria,
                puntosCercanos: puntosCercanos.slice(0, 5), // Top 5 más cercanos
                rutasCercanas: rutasCercanas.slice(0, 3), // Top 3 rutas más cercanas
                areaCobertura: this.calcularAreaCobertura(validacion.latitud, validacion.longitud, 1)
            };
        } catch (error) {
            console.error('Error obteniendo información enriquecida:', error);
            throw error;
        }
    }
}

module.exports = UbicacionService;