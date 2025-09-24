// routes/mapRoutes.js
const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const authMiddleware = require('../middleware/authMiddleware');

// Intentar cargar express-rate-limit, pero manejar el error si no está instalado
let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (error) {
  console.warn('⚠️ express-rate-limit no está instalado. Ejecuta: npm install express-rate-limit');
  // Crear un middleware dummy que no hace nada
  rateLimit = () => (req, res, next) => next();
}

// Rate limiting general para llamadas a la API de mapas
const mapRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limitar cada IP a 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos.',
    type: 'rate_limit_exceeded',
    retryAfter: 15 * 60 // segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Saltar rate limiting en desarrollo
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Rate limiting más estricto para cálculos de rutas
const routeCalculationLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // Limitar cada IP a 20 cálculos de rutas por 5 minutos
  message: {
    success: false,
    message: 'Demasiadas solicitudes de cálculo de rutas, intenta de nuevo en 5 minutos.',
    type: 'rate_limit_exceeded',
    retryAfter: 5 * 60 // segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Aplicar middleware de autenticación a todas las rutas de mapas
router.use(authMiddleware);

// Aplicar rate limiting general a todas las rutas
router.use(mapRateLimit);

// Middleware de validación de coordenadas
const validateCoordinates = (req, res, next) => {
  const { lat, lon } = req.params;
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      success: false,
      message: 'Coordenadas inválidas',
      details: 'lat y lon deben ser números válidos'
    });
  }
  
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({
      success: false,
      message: 'Coordenadas fuera del rango válido',
      details: 'lat debe estar entre -90 y 90, lon entre -180 y 180'
    });
  }
  
  next();
};

// 1. Buscar lugares
router.get('/search/:query', mapController.searchPlaces);

// 2. Geocoding inverso
router.get('/reverse/:lat/:lon', validateCoordinates, mapController.reverseGeocode);

// 3. Buscar lugares cercanos
router.get('/nearby/:lat/:lon/:type', validateCoordinates, mapController.findNearbyPlaces);

// 4. Calcular ruta (con rate limiting más estricto)
router.get('/route/:startLat/:startLon/:endLat/:endLon', 
  routeCalculationLimit,
  (req, res, next) => {
    // Validar todas las coordenadas para el cálculo de rutas
    const coords = ['startLat', 'startLon', 'endLat', 'endLon'];
    for (const coord of coords) {
      const value = parseFloat(req.params[coord]);
      if (isNaN(value)) {
        return res.status(400).json({
          success: false,
          message: `Coordenada ${coord} inválida`,
          details: 'Todas las coordenadas deben ser números válidos'
        });
      }
    }
    next();
  },
  mapController.calculateRoute
);

// 5. Obtener detalles de lugar
router.get('/place/:placeId', 
  (req, res, next) => {
    const { placeId } = req.params;
    if (!placeId || isNaN(parseInt(placeId))) {
      return res.status(400).json({
        success: false,
        message: 'ID de lugar inválido',
        details: 'placeId debe ser un número válido'
      });
    }
    next();
  },
  mapController.getPlaceDetails
);

// Health check endpoint para servicios de mapas
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servicios de mapas funcionando correctamente',
    services: {
      nominatim: 'Available',
      overpass: 'Available',
      openRouteService: process.env.OPENROUTESERVICE_API_KEY ? 'Configured' : 'Fallback mode'
    },
    rateLimit: typeof rateLimit === 'function' ? 'Enabled' : 'Disabled',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de tipos de lugares disponibles
router.get('/types', (req, res) => {
  const availableTypes = {
    amenities: [
      'restaurant', 'bank', 'hospital', 'school', 'pharmacy', 
      'fuel', 'atm', 'police', 'fire_station', 'parking'
    ],
    shops: [
      'supermarket', 'convenience', 'mall', 'bakery', 'clothing'
    ],
    transport: [
      'bus_stop', 'bus_station', 'taxi', 'airport'
    ],
    profiles: [
      'driving-car', 'driving-hgv', 'cycling-regular', 'foot-walking'
    ]
  };
  
  res.json({
    success: true,
    data: availableTypes,
    message: 'Tipos de lugares disponibles para búsqueda'
  });
});

module.exports = router;