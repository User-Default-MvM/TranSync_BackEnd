// src/services/integracionExternaService.js

const axios = require('axios');

/**
 * Servicio para integración con APIs externas (Google Maps, Weather, etc.)
 */
class IntegracionExternaService {

    constructor() {
        this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
        this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Obtener coordenadas desde dirección (Geocoding)
     */
    async geocoding(direccion) {
        try {
            if (!this.googleMapsApiKey) {
                throw new Error('Google Maps API key no configurada');
            }

            const cacheKey = `geocode_${direccion}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: {
                    address: direccion,
                    key: this.googleMapsApiKey
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error(`Error en geocoding: ${response.data.status}`);
            }

            const resultado = {
                direccion: direccion,
                coordenadas: response.data.results[0].geometry.location,
                formattedAddress: response.data.results[0].formatted_address,
                componentes: response.data.results[0].address_components,
                timestamp: new Date().toISOString()
            };

            this.setCache(cacheKey, resultado);
            return resultado;

        } catch (error) {
            console.error('Error en geocoding:', error);
            throw error;
        }
    }

    /**
     * Obtener dirección desde coordenadas (Reverse Geocoding)
     */
    async reverseGeocoding(latitud, longitud) {
        try {
            if (!this.googleMapsApiKey) {
                throw new Error('Google Maps API key no configurada');
            }

            const cacheKey = `reverse_${latitud}_${longitud}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: {
                    latlng: `${latitud},${longitud}`,
                    key: this.googleMapsApiKey
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error(`Error en reverse geocoding: ${response.data.status}`);
            }

            const resultado = {
                coordenadas: { latitud, longitud },
                direccion: response.data.results[0].formatted_address,
                componentes: response.data.results[0].address_components,
                tipos: response.data.results[0].types,
                timestamp: new Date().toISOString()
            };

            this.setCache(cacheKey, resultado);
            return resultado;

        } catch (error) {
            console.error('Error en reverse geocoding:', error);
            throw error;
        }
    }

    /**
     * Obtener información de tráfico para coordenadas
     */
    async obtenerInfoTrafico(latitud, longitud, radioKm = 5) {
        try {
            if (!this.googleMapsApiKey) {
                throw new Error('Google Maps API key no configurada');
            }

            const cacheKey = `traffic_${latitud}_${longitud}_${radioKm}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            // Nota: Esta funcionalidad requiere Google Maps Platform Roads API
            // o Traffic API específica que puede tener costos adicionales

            const resultado = {
                coordenadas: { latitud, longitud },
                radioKm,
                nivelTrafico: 'DESCONOCIDO',
                descripcion: 'Información de tráfico no disponible sin API específica',
                alternativas: [],
                timestamp: new Date().toISOString()
            };

            this.setCache(cacheKey, resultado);
            return resultado;

        } catch (error) {
            console.error('Error obteniendo información de tráfico:', error);
            throw error;
        }
    }

    /**
     * Obtener condiciones climáticas actuales
     */
    async obtenerClimaActual(latitud, longitud) {
        try {
            if (!this.openWeatherApiKey) {
                throw new Error('OpenWeather API key no configurada');
            }

            const cacheKey = `weather_${latitud}_${longitud}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
                params: {
                    lat: latitud,
                    lon: longitud,
                    appid: this.openWeatherApiKey,
                    units: 'metric',
                    lang: 'es'
                }
            });

            const resultado = {
                coordenadas: { latitud, longitud },
                temperatura: response.data.main.temp,
                sensacionTermica: response.data.main.feels_like,
                humedad: response.data.main.humidity,
                presion: response.data.main.pressure,
                visibilidad: response.data.visibility,
                velocidadViento: response.data.wind.speed,
                direccionViento: response.data.wind.deg,
                descripcion: response.data.weather[0].description,
                icono: response.data.weather[0].icon,
                nubosidad: response.data.clouds.all,
                ciudad: response.data.name,
                pais: response.data.sys.country,
                timestamp: new Date().toISOString(),
                fuente: 'OpenWeatherMap'
            };

            this.setCache(cacheKey, resultado);
            return resultado;

        } catch (error) {
            console.error('Error obteniendo clima actual:', error);
            throw error;
        }
    }

    /**
     * Obtener pronóstico del clima
     */
    async obtenerPronosticoClima(latitud, longitud, dias = 5) {
        try {
            if (!this.openWeatherApiKey) {
                throw new Error('OpenWeather API key no configurada');
            }

            const cacheKey = `forecast_${latitud}_${longitud}_${dias}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
                params: {
                    lat: latitud,
                    lon: longitud,
                    appid: this.openWeatherApiKey,
                    units: 'metric',
                    lang: 'es'
                }
            });

            // Procesar pronóstico por días
            const pronosticoPorDias = {};
            response.data.list.forEach(item => {
                const fecha = new Date(item.dt * 1000).toISOString().split('T')[0];
                if (!pronosticoPorDias[fecha]) {
                    pronosticoPorDias[fecha] = {
                        fecha,
                        items: []
                    };
                }
                pronosticoPorDias[fecha].items.push({
                    hora: new Date(item.dt * 1000).toISOString(),
                    temperatura: item.main.temp,
                    descripcion: item.weather[0].description,
                    icono: item.weather[0].icon,
                    probabilidadLluvia: item.pop,
                    velocidadViento: item.wind.speed
                });
            });

            const resultado = {
                coordenadas: { latitud, longitud },
                ciudad: response.data.city.name,
                pronostico: Object.values(pronosticoPorDias).slice(0, dias),
                timestamp: new Date().toISOString(),
                fuente: 'OpenWeatherMap'
            };

            this.setCache(cacheKey, resultado);
            return resultado;

        } catch (error) {
            console.error('Error obteniendo pronóstico del clima:', error);
            throw error;
        }
    }

    /**
     * Buscar lugares cercanos usando Google Places API
     */
    async buscarLugaresCercanos(latitud, longitud, tipo, radio = 1000) {
        try {
            if (!this.googleMapsApiKey) {
                throw new Error('Google Maps API key no configurada');
            }

            const tiposValidos = [
                'restaurant', 'gas_station', 'hospital', 'pharmacy',
                'bank', 'atm', 'parking', 'shopping_mall', 'supermarket'
            ];

            if (!tiposValidos.includes(tipo)) {
                throw new Error(`Tipo no válido. Valores permitidos: ${tiposValidos.join(', ')}`);
            }

            const cacheKey = `places_${latitud}_${longitud}_${tipo}_${radio}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
                params: {
                    location: `${latitud},${longitud}`,
                    radius: radio,
                    type: tipo,
                    key: this.googleMapsApiKey,
                    language: 'es'
                }
            });

            if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
                throw new Error(`Error buscando lugares: ${response.data.status}`);
            }

            const resultado = {
                coordenadas: { latitud, longitud },
                tipo,
                radio,
                lugares: response.data.results.map(lugar => ({
                    id: lugar.place_id,
                    nombre: lugar.name,
                    direccion: lugar.vicinity,
                    coordenadas: lugar.geometry.location,
                    calificacion: lugar.rating,
                    tipos: lugar.types,
                    abiertoAhora: lugar.opening_hours?.open_now,
                    precioNivel: lugar.price_level,
                    distancia: this.calcularDistanciaHaversine(
                        latitud, longitud,
                        lugar.geometry.location.lat,
                        lugar.geometry.location.lng
                    )
                })),
                timestamp: new Date().toISOString(),
                fuente: 'Google Places'
            };

            this.setCache(cacheKey, resultado);
            return resultado;

        } catch (error) {
            console.error('Error buscando lugares cercanos:', error);
            throw error;
        }
    }

    /**
     * Obtener detalles de un lugar específico
     */
    async obtenerDetallesLugar(placeId) {
        try {
            if (!this.googleMapsApiKey) {
                throw new Error('Google Maps API key no configurada');
            }

            const cacheKey = `place_details_${placeId}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
                params: {
                    place_id: placeId,
                    key: this.googleMapsApiKey,
                    language: 'es',
                    fields: 'name,formatted_address,geometry,formatted_phone_number,website,opening_hours,rating,price_level,types'
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error(`Error obteniendo detalles del lugar: ${response.data.status}`);
            }

            const lugar = response.data.result;
            const resultado = {
                id: lugar.place_id,
                nombre: lugar.name,
                direccion: lugar.formatted_address,
                telefono: lugar.formatted_phone_number,
                sitioWeb: lugar.website,
                coordenadas: lugar.geometry.location,
                calificacion: lugar.rating,
                tipos: lugar.types,
                horario: lugar.opening_hours,
                precioNivel: lugar.price_level,
                timestamp: new Date().toISOString(),
                fuente: 'Google Places'
            };

            this.setCache(cacheKey, resultado);
            return resultado;

        } catch (error) {
            console.error('Error obteniendo detalles del lugar:', error);
            throw error;
        }
    }

    /**
     * Calcular distancia usando fórmula de Haversine
     */
    calcularDistanciaHaversine(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio de la Tierra en kilómetros
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Convertir grados a radianes
     */
    toRadians(grados) {
        return grados * (Math.PI / 180);
    }

    /**
     * Obtener datos desde caché
     */
    getFromCache(key) {
        const item = this.cache.get(key);
        if (item && (Date.now() - item.timestamp) < this.cacheTimeout) {
            return item.data;
        }
        this.cache.delete(key);
        return null;
    }

    /**
     * Guardar datos en caché
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Limpiar caché
     */
    limpiarCache() {
        this.cache.clear();
    }

    /**
     * Obtener estadísticas de uso de APIs externas
     */
    obtenerEstadisticasAPIs() {
        return {
            cacheSize: this.cache.size,
            cacheTimeout: this.cacheTimeout,
            apisConfiguradas: {
                googleMaps: !!this.googleMapsApiKey,
                openWeather: !!this.openWeatherApiKey
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Validar configuración de APIs externas
     */
    validarConfiguracion() {
        const errores = [];

        if (!this.googleMapsApiKey) {
            errores.push('Google Maps API key no configurada');
        }

        if (!this.openWeatherApiKey) {
            errores.push('OpenWeather API key no configurada');
        }

        return {
            configurado: errores.length === 0,
            errores,
            apisDisponibles: {
                googleMaps: !!this.googleMapsApiKey,
                openWeather: !!this.openWeatherApiKey
            }
        };
    }

    /**
     * Obtener información enriquecida de ubicación con datos externos
     */
    async obtenerInfoUbicacionEnriquecida(latitud, longitud) {
        try {
            const validacion = {
                valido: true,
                latitud: parseFloat(latitud),
                longitud: parseFloat(longitud)
            };

            // Obtener datos en paralelo
            const [direccion, clima, lugares] = await Promise.allSettled([
                this.reverseGeocoding(validacion.latitud, validacion.longitud),
                this.obtenerClimaActual(validacion.latitud, validacion.longitud),
                this.buscarLugaresCercanos(validacion.latitud, validacion.longitud, 'gas_station', 2000)
            ]);

            return {
                coordenadas: validacion,
                direccion: direccion.status === 'fulfilled' ? direccion.value : null,
                clima: clima.status === 'fulfilled' ? clima.value : null,
                lugaresCercanos: lugares.status === 'fulfilled' ? lugares.value.lugares.slice(0, 5) : [],
                timestamp: new Date().toISOString(),
                fuentes: {
                    geocoding: direccion.status === 'fulfilled',
                    clima: clima.status === 'fulfilled',
                    lugares: lugares.status === 'fulfilled'
                }
            };

        } catch (error) {
            console.error('Error obteniendo información enriquecida:', error);
            throw error;
        }
    }
}

module.exports = IntegracionExternaService;