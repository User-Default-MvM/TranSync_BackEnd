// controllers/mapController.js
const axios = require('axios');

class MapController {
  constructor() {
    this.nominatimBaseURL = 'https://nominatim.openstreetmap.org';
    this.overpassBaseURL = 'https://overpass-api.de/api/interpreter';
    this.openRouteServiceURL = 'https://api.openrouteservice.org/v2';
    
    // Configure axios defaults with timeout and retry
    this.axiosConfig = {
      timeout: 10000, // 10 seconds timeout
      headers: {
        'User-Agent': 'TransSync-App/1.0'
      }
    };
  }

  // 1. Buscar lugares usando Nominatim
  async searchPlaces(req, res) {
    try {
      const { query } = req.params;
      const { limit = 5, countrycodes = 'co' } = req.query;

      // Validate input
      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const response = await axios.get(`${this.nominatimBaseURL}/search`, {
        params: {
          q: query.trim(),
          format: 'json',
          addressdetails: 1,
          limit: Math.min(parseInt(limit), 20), // Max 20 results
          countrycodes: countrycodes,
          'accept-language': 'es',
        },
        ...this.axiosConfig
      });

      const places = response.data.map(place => ({
        id: place.place_id,
        name: place.display_name,
        lat: parseFloat(place.lat),
        lon: parseFloat(place.lon),
        type: place.type,
        category: place.class,
        address: {
          house_number: place.address?.house_number,
          road: place.address?.road,
          neighbourhood: place.address?.neighbourhood,
          city: place.address?.city || place.address?.town || place.address?.village,
          state: place.address?.state,
          country: place.address?.country,
          postcode: place.address?.postcode
        },
        importance: place.importance,
        boundingbox: place.boundingbox
      }));

      res.json({
        success: true,
        data: places,
        count: places.length,
        query: query,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error buscando lugares:', error.message);
      
      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({
          success: false,
          message: 'Timeout en la búsqueda de lugares',
          error: 'La búsqueda tardó demasiado tiempo'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error buscando lugares',
        error: error.response?.data?.error || error.message
      });
    }
  }

  // 2. Geocoding inverso
  async reverseGeocode(req, res) {
    try {
      const { lat, lon } = req.params;
      const { zoom = 18 } = req.query;

      // Validate coordinates
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          success: false,
          message: 'Coordenadas inválidas'
        });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'Coordenadas fuera del rango válido'
        });
      }

      const response = await axios.get(`${this.nominatimBaseURL}/reverse`, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
          zoom: Math.min(Math.max(parseInt(zoom), 1), 18),
          'accept-language': 'es'
        },
        ...this.axiosConfig
      });

      if (response.data && response.data.place_id) {
        const place = response.data;
        const result = {
          id: place.place_id,
          name: place.display_name,
          lat: parseFloat(place.lat),
          lon: parseFloat(place.lon),
          type: place.type,
          category: place.class,
          address: {
            house_number: place.address?.house_number,
            road: place.address?.road,
            neighbourhood: place.address?.neighbourhood,
            city: place.address?.city || place.address?.town || place.address?.village,
            state: place.address?.state,
            country: place.address?.country,
            postcode: place.address?.postcode
          },
          boundingbox: place.boundingbox
        };

        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'No se encontró información para estas coordenadas'
        });
      }

    } catch (error) {
      console.error('Error en geocoding inverso:', error.message);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo información de ubicación',
        error: error.response?.data?.error || error.message
      });
    }
  }

  // 3. Buscar lugares cercanos usando Overpass API
  async findNearbyPlaces(req, res) {
    try {
      const { lat, lon, type } = req.params;
      const { radius = 1000 } = req.query;

      // Validate coordinates
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const searchRadius = Math.min(parseInt(radius), 5000); // Max 5km radius
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          success: false,
          message: 'Coordenadas inválidas'
        });
      }

      // Mapear tipos a tags de OpenStreetMap
      const typeMapping = {
        restaurant: 'amenity=restaurant',
        bank: 'amenity=bank',
        hospital: 'amenity=hospital',
        school: 'amenity=school',
        pharmacy: 'amenity=pharmacy',
        fuel: 'amenity=fuel',
        atm: 'amenity=atm',
        police: 'amenity=police',
        fire_station: 'amenity=fire_station',
        supermarket: 'shop=supermarket',
        bus_stop: 'highway=bus_stop',
        parking: 'amenity=parking'
      };

      const tag = typeMapping[type] || `amenity=${type}`;
      
      // Query para Overpass API
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node[${tag}](around:${searchRadius},${latitude},${longitude});
          way[${tag}](around:${searchRadius},${latitude},${longitude});
          relation[${tag}](around:${searchRadius},${latitude},${longitude});
        );
        out geom;
      `;

      const response = await axios.post(this.overpassBaseURL, overpassQuery, {
        headers: {
          'Content-Type': 'text/plain'
        },
        timeout: 30000 // 30 seconds for Overpass API
      });

      const places = response.data.elements.map(element => {
        const lat = element.lat || element.center?.lat;
        const lon = element.lon || element.center?.lon;
        
        if (!lat || !lon) return null;
        
        return {
          id: element.id,
          name: element.tags?.name || element.tags?.brand || `${type} sin nombre`,
          lat: lat,
          lon: lon,
          type: element.tags?.amenity || element.tags?.shop || type,
          category: element.tags?.amenity ? 'amenity' : 'shop',
          address: this.formatOverpassAddress(element.tags),
          phone: element.tags?.phone,
          website: element.tags?.website,
          opening_hours: element.tags?.opening_hours,
          distance: this.calculateHaversineDistance(latitude, longitude, lat, lon)
        };
      }).filter(place => place !== null)
        .sort((a, b) => a.distance - b.distance) // Sort by distance
        .slice(0, 20); // Limit to 20 results

      res.json({
        success: true,
        data: places,
        count: places.length,
        type: type,
        radius: searchRadius,
        center: { lat: latitude, lon: longitude },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error buscando lugares cercanos:', error.message);
      res.status(500).json({
        success: false,
        message: 'Error buscando lugares cercanos',
        error: error.response?.data?.error || error.message
      });
    }
  }

  // 4. Calcular ruta usando OpenRouteService (requiere API key gratuita)
  async calculateRoute(req, res) {
    try {
      const { startLat, startLon, endLat, endLon } = req.params;
      const { profile = 'driving-car' } = req.query;

      // Validate coordinates
      const coordinates = [
        { lat: parseFloat(startLat), lon: parseFloat(startLon), name: 'inicio' },
        { lat: parseFloat(endLat), lon: parseFloat(endLon), name: 'destino' }
      ];

      for (const coord of coordinates) {
        if (isNaN(coord.lat) || isNaN(coord.lon)) {
          return res.status(400).json({
            success: false,
            message: `Coordenadas de ${coord.name} inválidas`
          });
        }
      }

      // Para usar OpenRouteService necesitas registrarte y obtener una API key gratuita
      const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY;
      
      if (!ORS_API_KEY) {
        // Fallback: retornar una ruta simple sin optimización
        const distance = this.calculateHaversineDistance(startLat, startLon, endLat, endLon);
        return res.json({
          success: true,
          data: {
            distance: Math.round(distance),
            duration: Math.round(distance / 50 * 3.6), // Estimación: 50 km/h promedio
            geometry: {
              coordinates: [[parseFloat(startLon), parseFloat(startLat)], [parseFloat(endLon), parseFloat(endLat)]]
            },
            instructions: [
              {
                instruction: `Dirigirse hacia el destino (${Math.round(distance/1000)} km)`,
                distance: Math.round(distance),
                duration: Math.round(distance / 50 * 3.6)
              }
            ],
            note: 'Ruta simplificada - Para rutas optimizadas configure OPENROUTESERVICE_API_KEY',
            fallback: true
          },
          timestamp: new Date().toISOString()
        });
      }

      // Validate profile
      const validProfiles = ['driving-car', 'driving-hgv', 'cycling-regular', 'foot-walking'];
      if (!validProfiles.includes(profile)) {
        return res.status(400).json({
          success: false,
          message: 'Perfil de ruta inválido',
          validProfiles: validProfiles
        });
      }

      const response = await axios.post(
        `${this.openRouteServiceURL}/directions/${profile}/geojson`,
        {
          coordinates: [[parseFloat(startLon), parseFloat(startLat)], [parseFloat(endLon), parseFloat(endLat)]],
          instructions: true,
          language: 'es'
        },
        {
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const route = response.data.features[0];
      const summary = route.properties.summary;

      res.json({
        success: true,
        data: {
          distance: Math.round(summary.distance), // en metros
          duration: Math.round(summary.duration), // en segundos
          geometry: route.geometry,
          instructions: route.properties.segments[0].steps.map(step => ({
            instruction: step.instruction,
            distance: Math.round(step.distance),
            duration: Math.round(step.duration)
          })),
          profile: profile
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error calculando ruta:', error.message);
      
      // Fallback en caso de error
      const distance = this.calculateHaversineDistance(req.params.startLat, req.params.startLon, req.params.endLat, req.params.endLon);
      
      res.json({
        success: true,
        data: {
          distance: Math.round(distance),
          duration: Math.round(distance / 50 * 3.6), // Estimación simple
          geometry: {
            coordinates: [[parseFloat(req.params.startLon), parseFloat(req.params.startLat)], [parseFloat(req.params.endLon), parseFloat(req.params.endLat)]]
          },
          instructions: [
            {
              instruction: `Dirigirse hacia el destino (${Math.round(distance/1000)} km)`,
              distance: Math.round(distance),
              duration: Math.round(distance / 50 * 3.6)
            }
          ],
          note: 'Ruta simplificada por error en el servicio de rutas',
          fallback: true,
          error: error.response?.data?.error || error.message
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // 5. Obtener detalles de un lugar específico
  async getPlaceDetails(req, res) {
    try {
      const { placeId } = req.params;

      // Validate placeId
      if (!placeId || isNaN(parseInt(placeId))) {
        return res.status(400).json({
          success: false,
          message: 'ID de lugar inválido'
        });
      }

      const response = await axios.get(`${this.nominatimBaseURL}/details`, {
        params: {
          place_id: placeId,
          format: 'json',
          addressdetails: 1,
          'accept-language': 'es'
        },
        ...this.axiosConfig
      });

      if (response.data && response.data.place_id) {
        const place = response.data;
        const result = {
          id: place.place_id,
          name: place.localname || place.display_name,
          lat: parseFloat(place.centroid?.coordinates?.[1] || place.lat),
          lon: parseFloat(place.centroid?.coordinates?.[0] || place.lon),
          type: place.type,
          category: place.class,
          address: place.address,
          extratags: place.extratags,
          namedetails: place.namedetails,
          boundingbox: place.boundingbox
        };

        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Lugar no encontrado'
        });
      }

    } catch (error) {
      console.error('Error obteniendo detalles del lugar:', error.message);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo detalles del lugar',
        error: error.response?.data?.error || error.message
      });
    }
  }

  // Métodos auxiliares
  formatOverpassAddress(tags) {
    if (!tags) return {};
    
    return {
      road: tags['addr:street'],
      house_number: tags['addr:housenumber'],
      neighbourhood: tags['addr:suburb'],
      city: tags['addr:city'],
      postcode: tags['addr:postcode'],
      country: tags['addr:country']
    };
  }

  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en metros
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }
}

const mapController = new MapController();

module.exports = {
  searchPlaces: mapController.searchPlaces.bind(mapController),
  reverseGeocode: mapController.reverseGeocode.bind(mapController),
  findNearbyPlaces: mapController.findNearbyPlaces.bind(mapController),
  calculateRoute: mapController.calculateRoute.bind(mapController),
  getPlaceDetails: mapController.getPlaceDetails.bind(mapController)
};