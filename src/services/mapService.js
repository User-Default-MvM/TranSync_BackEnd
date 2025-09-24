// services/mapService.js
const axios = require('axios');

class MapService {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.mapboxApiKey = process.env.MAPBOX_API_KEY;
    this.useProvider = process.env.MAP_PROVIDER || 'openstreetmap'; // 'google', 'mapbox' o 'openstreetmap'
  }

  // Método auxiliar para manejar requests
  async makeRequest(url, options = {}) {
    try {
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      return response.data;
    } catch (error) {
      console.error('Error en MapService:', error.response?.data || error.message);
      throw error;
    }
  }

  // 1. Buscar lugares usando Nominatim (OpenStreetMap)
  async searchPlaces(query, options = {}) {
    const { limit = 5, countrycodes = 'co' } = options;

    if (this.useProvider === 'openstreetmap') {
      const url = `https://nominatim.openstreetmap.org/search`;
      const params = {
        q: query,
        format: 'json',
        limit: limit,
        countrycodes: countrycodes,
        addressdetails: 1,
        extratags: 1,
        dedupe: 1,
        language: 'es'
      };

      const data = await this.makeRequest(url, { params });

      return {
        success: true,
        data: data.map(place => ({
          id: place.place_id,
          name: place.display_name.split(',')[0],
          address: place.display_name,
          location: {
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon)
          },
          types: place.type ? [place.type] : ['place'],
          vicinity: place.address?.road || place.address?.neighbourhood || '',
          importance: place.importance
        })),
        count: data.length
      };
    }

    if (this.useProvider === 'google' && this.googleMapsApiKey) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
      const params = {
        query: query,
        key: this.googleMapsApiKey,
        region: countrycodes,
        language: 'es'
      };

      const data = await this.makeRequest(url, { params });

      return {
        success: true,
        data: data.results.slice(0, limit).map(place => ({
          id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          location: place.geometry.location,
          types: place.types,
          rating: place.rating,
          vicinity: place.vicinity
        })),
        count: data.results.length
      };
    }

    // Fallback a Mapbox si no hay API key de Google
    if (this.useProvider === 'mapbox' && this.mapboxApiKey) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
      const params = {
        access_token: this.mapboxApiKey,
        limit: limit,
        proximity: '-74.0721,4.7110', // Centro de Bogotá por defecto
        language: 'es'
      };

      const data = await this.makeRequest(url, { params });

      return {
        success: true,
        data: data.features.map(feature => ({
          id: feature.id,
          name: feature.text,
          address: feature.place_name,
          location: feature.center,
          types: feature.place_type,
          vicinity: feature.properties?.address || ''
        })),
        count: data.features.length
      };
    }

    throw new Error('No hay API key configurada para el servicio de mapas');
  }

  // 2. Geocoding inverso usando Nominatim (OpenStreetMap)
  async reverseGeocode(lat, lon, zoom = 18) {
    if (this.useProvider === 'openstreetmap') {
      const url = `https://nominatim.openstreetmap.org/reverse`;
      const params = {
        lat: lat,
        lon: lon,
        format: 'json',
        addressdetails: 1,
        extratags: 1,
        zoom: Math.min(zoom, 18),
        language: 'es'
      };

      const data = await this.makeRequest(url, { params });

      return {
        success: true,
        data: [{
          formatted_address: data.display_name,
          address_components: data.address ? Object.keys(data.address).map(key => ({
            long_name: data.address[key],
            short_name: data.address[key],
            types: [key]
          })) : [],
          geometry: {
            location: {
              lat: parseFloat(data.lat),
              lng: parseFloat(data.lon)
            }
          },
          place_id: data.place_id,
          types: data.type ? [data.type] : ['place']
        }]
      };
    }

    if (this.useProvider === 'google' && this.googleMapsApiKey) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json`;
      const params = {
        latlng: `${lat},${lon}`,
        key: this.googleMapsApiKey,
        language: 'es'
      };

      const data = await this.makeRequest(url, { params });

      return {
        success: true,
        data: data.results.map(result => ({
          formatted_address: result.formatted_address,
          address_components: result.address_components,
          geometry: result.geometry,
          place_id: result.place_id,
          types: result.types
        }))
      };
    }

    // Fallback a Mapbox
    if (this.useProvider === 'mapbox' && this.mapboxApiKey) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json`;
      const params = {
        access_token: this.mapboxApiKey,
        language: 'es'
      };

      const data = await this.makeRequest(url, { params });

      return {
        success: true,
        data: data.features.map(feature => ({
          formatted_address: feature.place_name,
          address_components: feature.context || [],
          geometry: {
            location: {
              lat: feature.center[1],
              lng: feature.center[0]
            }
          },
          place_id: feature.id,
          types: feature.place_type
        }))
      };
    }

    throw new Error('No hay API key configurada para geocoding inverso');
  }

  // 3. Buscar lugares cercanos usando Overpass API (OpenStreetMap)
  async findNearbyPlaces(lat, lon, type, radius = 1000) {
    if (this.useProvider === 'openstreetmap') {
      // Mapear tipos comunes a tags de OpenStreetMap
      const typeMapping = {
        restaurant: 'amenity=restaurant',
        bank: 'amenity=bank',
        hospital: 'amenity=hospital',
        school: 'amenity=school',
        cafe: 'amenity=cafe',
        pharmacy: 'amenity=pharmacy',
        gas_station: 'amenity=fuel',
        atm: 'amenity=atm',
        hotel: 'tourism=hotel',
        supermarket: 'shop=supermarket'
      };

      const tag = typeMapping[type] || `amenity=${type}`;

      const query = `
        [out:json][timeout:25];
        (
          node[${tag}](around:${radius},${lat},${lon});
          way[${tag}](around:${radius},${lat},${lon});
          relation[${tag}](around:${radius},${lat},${lon});
        );
        out body;
      `;

      const url = `https://overpass-api.de/api/interpreter`;
      const params = { data: query };

      const data = await this.makeRequest(url, { params });

      return {
        success: true,
        data: data.elements.map(element => {
          const elementLat = element.lat || (element.center && element.center.lat);
          const elementLon = element.lon || (element.center && element.center.lon);

          return {
            id: element.id,
            name: element.tags?.name || 'Sin nombre',
            address: element.tags?.['addr:street'] || 'Dirección no disponible',
            location: {
              lat: parseFloat(elementLat),
              lng: parseFloat(elementLon)
            },
            types: [type],
            distance: elementLat && elementLon ?
              this.calculateDistance(lat, lon, elementLat, elementLon) : null,
            tags: element.tags
          };
        }).filter(place => place.location.lat && place.location.lng)
      };
    }

    if (this.useProvider === 'google' && this.googleMapsApiKey) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
      const params = {
        location: `${lat},${lon}`,
        radius: radius,
        type: type,
        key: this.googleMapsApiKey,
        language: 'es'
      };

      const data = await this.makeRequest(url, { params });

      return {
        success: true,
        data: data.results.map(place => ({
          id: place.place_id,
          name: place.name,
          address: place.vicinity,
          location: place.geometry.location,
          rating: place.rating,
          types: place.types,
          distance: this.calculateDistance(lat, lon, place.geometry.location.lat, place.geometry.location.lng)
        }))
      };
    }

    throw new Error('Nearby search solo disponible con Google Maps API');
  }

  // 4. Calcular ruta usando OSRM (OpenStreetMap)
  async calculateRoute(startLat, startLon, endLat, endLon, profile = 'driving') {
    if (this.useProvider === 'openstreetmap') {
      // Mapear perfiles de ruta
      const profileMapping = {
        driving: 'car',
        walking: 'foot',
        cycling: 'bike'
      };

      const osrmProfile = profileMapping[profile] || 'car';
      const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${startLon},${startLat};${endLon},${endLat}`;
      const params = {
        overview: 'full',
        geometries: 'geojson',
        steps: true,
        language: 'es'
      };

      const data = await this.makeRequest(url, { params });

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          success: true,
          data: {
            distance: `${(route.distance / 1000).toFixed(1)} km`,
            duration: this.formatDuration(Math.round(route.duration)),
            distanceMeters: route.distance,
            durationSeconds: Math.round(route.duration),
            steps: route.legs[0].steps.map(step => ({
              instruction: step.maneuver.instruction,
              distance: `${(step.distance / 1000).toFixed(1)} km`,
              duration: this.formatDuration(Math.round(step.duration)),
              start_location: {
                lat: step.geometry.coordinates[0][1],
                lng: step.geometry.coordinates[0][0]
              },
              end_location: {
                lat: step.geometry.coordinates[step.geometry.coordinates.length - 1][1],
                lng: step.geometry.coordinates[step.geometry.coordinates.length - 1][0]
              }
            })),
            overview_polyline: route.geometry.coordinates.map(coord => ({
              lat: coord[1],
              lng: coord[0]
            }))
          }
        };
      }

      throw new Error('No se pudo calcular la ruta');
    }

    if (this.useProvider === 'google' && this.googleMapsApiKey) {
      const url = `https://maps.googleapis.com/maps/api/directions/json`;
      const params = {
        origin: `${startLat},${startLon}`,
        destination: `${endLat},${endLon}`,
        mode: profile,
        key: this.googleMapsApiKey,
        language: 'es',
        units: 'metric'
      };

      const data = await this.makeRequest(url, { params });

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          success: true,
          data: {
            distance: route.legs[0].distance.text,
            duration: route.legs[0].duration.text,
            distanceMeters: route.legs[0].distance.value,
            durationSeconds: route.legs[0].duration.value,
            steps: route.legs[0].steps.map(step => ({
              instruction: step.html_instructions,
              distance: step.distance.text,
              duration: step.duration.text,
              start_location: step.start_location,
              end_location: step.end_location
            })),
            overview_polyline: route.overview_polyline.points
          }
        };
      }
    }

    throw new Error('Route calculation solo disponible con Google Maps API');
  }

  // 5. Obtener información detallada de un lugar usando Nominatim (OpenStreetMap)
  async getPlaceDetails(placeId) {
    if (this.useProvider === 'openstreetmap') {
      const url = `https://nominatim.openstreetmap.org/details`;
      const params = {
        osmtype: 'N', // Node
        osmid: placeId,
        format: 'json',
        addressdetails: 1,
        extratags: 1,
        language: 'es'
      };

      const data = await this.makeRequest(url, { params });

      return {
        success: true,
        data: {
          name: data.localname || data.display_name.split(',')[0],
          formatted_address: data.display_name,
          location: {
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lon)
          },
          place_id: data.osm_id,
          types: data.type ? [data.type] : ['place'],
          tags: data.extratags || {},
          address_components: data.address ? Object.keys(data.address).map(key => ({
            long_name: data.address[key],
            short_name: data.address[key],
            types: [key]
          })) : []
        }
      };
    }

    if (this.useProvider === 'google' && this.googleMapsApiKey) {
      const url = `https://maps.googleapis.com/maps/api/place/details/json`;
      const params = {
        place_id: placeId,
        key: this.googleMapsApiKey,
        language: 'es',
        fields: 'name,formatted_address,geometry,place_id,types,rating,formatted_phone_number,opening_hours,website,photos'
      };

      const data = await this.makeRequest(url, { params });

      return {
        success: true,
        data: {
          name: data.result.name,
          formatted_address: data.result.formatted_address,
          location: data.result.geometry.location,
          place_id: data.result.place_id,
          types: data.result.types,
          rating: data.result.rating,
          formatted_phone_number: data.result.formatted_phone_number,
          opening_hours: data.result.opening_hours,
          website: data.result.website,
          photos: data.result.photos
        }
      };
    }

    throw new Error('Place details solo disponible con Google Maps API');
  }

  // 6. Métodos de utilidad

  // Convertir distancia a formato legible
  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  }

  // Convertir duración a formato legible
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Calcular distancia entre dos puntos (Haversine)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distancia en km

    return distance * 1000; // Convertir a metros
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Validar coordenadas
  isValidCoordinate(lat, lon) {
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180
    );
  }

  // Crear URL de mapa estático usando OpenStreetMap tiles
  createStaticMapURL(lat, lon, zoom = 15, width = 400, height = 300, markers = []) {
    if (this.useProvider === 'openstreetmap') {
      // Usar tiles de OpenStreetMap con marcadores
      const tileServer = 'https://tile.openstreetmap.org';
      const tileSize = 256;

      // Calcular coordenadas de tiles
      const tileX = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
      const tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));

      // Crear URL de tile
      const tileUrl = `${tileServer}/${zoom}/${tileX}/${tileY}.png`;

      // Para múltiples marcadores o funcionalidad avanzada, usar un servicio de tiles personalizado
      // Por ahora, retornar la URL básica del tile
      return tileUrl;
    }

    if (this.useProvider === 'google' && this.googleMapsApiKey) {
      let url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lon}&zoom=${zoom}&size=${width}x${height}&key=${this.googleMapsApiKey}`;

      // Agregar marcadores
      if (markers.length > 0) {
        const markerParams = markers.map(marker =>
          `markers=color:red%7C${marker.lat},${marker.lng}`
        ).join('&');
        url += '&' + markerParams;
      }

      return url;
    }

    // Fallback a Mapbox Static API
    if (this.useProvider === 'mapbox' && this.mapboxApiKey) {
      let url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${lon},${lat},${zoom}/${width}x${height}?access_token=${this.mapboxApiKey}`;

      return url;
    }

    // Fallback básico a OpenStreetMap embed
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}`;
  }

  // Buscar direcciones con autocompletado
  async searchAddresses(query, options = {}) {
    if (query.length < 3) {
      return { success: true, data: [], count: 0 };
    }

    return await this.searchPlaces(query, {
      limit: options.limit || 5,
      countrycodes: options.countrycodes || 'co' // Colombia por defecto
    });
  }

  // Obtener sugerencias de lugares populares
  async getPopularPlaces(lat, lon) {
    const promises = [
      this.findNearbyPlaces(lat, lon, 'restaurant', 2000),
      this.findNearbyPlaces(lat, lon, 'bank', 1000),
      this.findNearbyPlaces(lat, lon, 'hospital', 5000),
      this.findNearbyPlaces(lat, lon, 'school', 2000)
    ];

    try {
      const results = await Promise.allSettled(promises);
      const places = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          const category = ['Restaurantes', 'Bancos', 'Hospitales', 'Escuelas'][index];
          places.push({
            category,
            places: result.value.data.slice(0, 3) // Solo los primeros 3
          });
        }
      });

      return { success: true, data: places };
    } catch (error) {
      console.error('Error obteniendo lugares populares:', error);
      return { success: false, data: [] };
    }
  }

  // Obtener configuración del proveedor actual
  getProviderInfo() {
    const hasApiKey = this.useProvider === 'google' ? !!this.googleMapsApiKey :
                     this.useProvider === 'mapbox' ? !!this.mapboxApiKey : true; // OpenStreetMap no requiere API key

    return {
      provider: this.useProvider,
      hasApiKey: hasApiKey,
      features: {
        search: true,
        reverseGeocode: true,
        nearby: this.useProvider === 'google' || this.useProvider === 'openstreetmap',
        routing: this.useProvider === 'google' || this.useProvider === 'openstreetmap',
        staticMaps: true,
        free: this.useProvider === 'openstreetmap'
      }
    };
  }
}

// Crear instancia singleton
const mapService = new MapService();

export default mapService;