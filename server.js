// server.js
const express = require("express");
const http = require('http');
const cors = require("cors");
const path = require("path");
require('dotenv').config();

const routes = require("./src/routes");
const RealTimeService = require("./src/utilidades/realTimeService");
const DashboardRealTimeService = require("./src/services/dashboardRealTimeService");
const dashboardEventService = require("./src/services/dashboardEventService");
const DashboardPushService = require("./src/services/dashboardPushService");
const cacheService = require("./src/utils/cacheService");
const { initializeDatabase } = require("./init-database");

// Crear servidor HTTP y Express
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Configuraciones de seguridad y rendimiento
const isProduction = process.env.NODE_ENV === 'production';

// Hacer app disponible globalmente para rutas WebSocket
global.app = app;

// Inicializar RealTimeService (única instancia de WebSocket)
const realTimeService = new RealTimeService(server);

// Inicializar DashboardRealTimeService
const dashboardRealTimeService = new DashboardRealTimeService(realTimeService);

// Inicializar DashboardPushService
const dashboardPushService = new DashboardPushService(realTimeService);

// Hacer servicios disponibles globalmente
global.io = realTimeService.io;
global.realTimeService = realTimeService;
global.dashboardRealTimeService = dashboardRealTimeService;
global.dashboardPushService = dashboardPushService;
global.cacheService = cacheService;

// Importar servicio de programador para alertas automáticas
require('./src/services/schedulerService');

// Importar y usar rutas WebSocket
require('./src/routes/websocketRoutes')();

// --- Configuración CORS optimizada ---
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origen (como mobile apps o curl)
    if (!origin) return callback(null, true);

    // Lista de orígenes permitidos
    const allowedOrigins = [
      process.env.FRONTEND_URL || `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`,
      'http://10.0.2.2:8081',         // Emulador Android con Expo
      'http://localhost:8081',        // Expo local
      'http://localhost:19006',       // Expo web
      'exp://192.168.1.100:19000',    // Expo tunnel
      'http://127.0.0.1:3000',        // Web app alternativa
      'https://transync.com',         // Dominio producción
      'https://www.transync.com',     // Dominio producción con www
      'https://api.transync.com',     // API en producción
      'https://transync1.netlify.app', // Frontend en Netlify
      'https://transync1.netlify.app/home', // Frontend en Netlify con ruta
      process.env.FRONTEND_URL,       // URL del frontend desde .env
    ].filter(Boolean); // Filtrar valores undefined/null

    // En desarrollo, permitir cualquier origen localhost
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('10.0.2.2');
      if (isLocalhost) return callback(null, true);
    }

    // Verificar si el origen está en la lista permitida
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Si no está en la lista, rechazar
    const msg = `Origen no permitido por política CORS: ${origin}`;
    return callback(new Error(msg), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  credentials: true,
  optionsSuccessStatus: 200, // Para compatibilidad con legacy browsers
  maxAge: 86400 // Cache preflight por 24 horas
};

// --- Middlewares de seguridad y rendimiento ---
app.use(cors(corsOptions));

// Configurar límites de payload según el entorno
const payloadLimit = isProduction ? '5mb' : '10mb';
app.use(express.json({ limit: payloadLimit }));
app.use(express.urlencoded({ extended: true, limit: payloadLimit }));

// Middleware de seguridad básico
app.use((req, res, next) => {
  // Remover headers que pueden exponer información sensible
  res.removeHeader('X-Powered-By');

  // Agregar headers de seguridad
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Solo agregar HSTS en producción con HTTPS
  if (isProduction && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

// Middleware para logging de requests (deshabilitado por defecto para evitar spam)
// if (process.env.NODE_ENV === 'development' || process.env.LOG_REQUESTS === 'true') {
//   app.use((req, res, next) => {
//     const timestamp = new Date().toISOString();
//     const origin = req.get('origin') || req.get('referer') || 'No origin';
//     const userAgent = req.get('user-agent') || 'Unknown';

//     console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip} - Origin: ${origin} - UA: ${userAgent}`);

//     // Log del body para POST/PUT (solo en desarrollo)
//     if ((req.method === 'POST' || req.method === 'PUT') && process.env.NODE_ENV === 'development') {
//       console.log('Body:', JSON.stringify(req.body, null, 2));
//     }

//     next();
//   });
// }

// Middleware para compresión (solo en producción)
if (isProduction) {
  const compression = require('compression');
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
}

// --- Servir archivos estáticos ---
app.use(express.static('public'));

// --- Manejar favicon.ico ---
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// --- Health check endpoint ---
app.get('/api/health', (req, res) => {
    const realTimeStats = realTimeService.getConnectionStats();

    res.json({
        status: 'OK',
        message: 'TranSync Backend API está funcionando',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        database: 'Connected',
        websocket: {
            enabled: true,
            connections: realTimeStats.totalConnections,
            connectionsByEmpresa: realTimeStats.connectionsByEmpresa,
            connectionsByRol: realTimeStats.connectionsByRol
        },
        realTimeService: {
            status: 'Active',
            clientCount: realTimeStats.totalConnections,
            uptime: realTimeStats.uptime
        },
        environment: process.env.NODE_ENV || 'development',
        features: [
            'REST API',
            'WebSocket Real-time',
            'RealTimeService Notifications',
            'JWT Authentication',
            'Advanced ChatBot AI',
            'Intelligent Caching',
            'Conversation Memory',
            'Real-time Notifications',
            'Connection Monitoring',
            'User Profile Management',
            'User Preferences System',
            'Notification Settings',
            'User Activity Tracking',
            'Account Status Monitoring'
        ]
    });
});

// --- Ruta raíz de bienvenida ---
app.get('/', (req, res) => {
    res.json({
        status: 'SUCCESS',
        message: '🚀 TRANSSYNC Backend API con WebSocket',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            admin: '/api/admin',
            conductores: '/api/conductores',
            vehiculos: '/api/vehiculos',
            rutas: '/api/rutas',
            viajes: '/api/viajes',
            dashboard: '/api/dashboard',
            chatbot: '/api/chatbot',
            user: {
                profile: '/api/user/profile',
                preferences: '/api/user/preferences',
                notifications: '/api/user/notifications/settings',
                company: '/api/user/company',
                activity: '/api/user/activity',
                accountStatus: '/api/user/account-status'
            },
            websocket: {
                stats: '/api/websocket/stats',
                clients: '/api/websocket/clients'
            },
            realTimeService: {
                stats: '/api/realtime/stats',
                clients: '/api/realtime/clients',
                notifications: '/api/realtime/notifications'
            }
        },
        websocket: {
            enabled: true,
            url: `wss://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`,
            features: [
                'Real-time notifications',
                'Live chat updates',
                'Expiration alerts',
                'Connection monitoring',
                'RealTimeService integration',
                'Advanced notification system'
            ]
        },
        realTimeService: {
            status: 'Active',
            endpoints: {
                stats: '/api/realtime/stats',
                clients: '/api/realtime/clients',
                notifications: '/api/realtime/notifications'
            }
        },
        cors: {
            enabled: true,
            allowedOrigins: corsOptions.origin
        },
        documentation: 'Visita /api/health para verificar el estado del servidor'
    });
});

// --- Rutas de la API ---
app.use("/api", routes);

// --- Manejo de errores 404 ---
app.use((req, res) => {
    res.status(404).json({
        status: 'ERROR',
        message: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            'GET /api/health',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'GET /api/auth/verify',
            'GET /api/auth/profile',
            'GET /api/user/profile',
            'PUT /api/user/profile',
            'PUT /api/user/change-password',
            'GET /api/user/preferences',
            'PUT /api/user/preferences',
            'GET /api/user/notifications/settings',
            'PUT /api/user/notifications/settings',
            'GET /api/user/company',
            'GET /api/user/activity',
            'GET /api/user/account-status',
            'GET /api/websocket/stats',
            'GET /api/websocket/clients',
            'GET /api/realtime/stats',
            'GET /api/realtime/clients',
            'POST /api/realtime/notifications',
            'POST /api/chatbot/consulta'
        ],
        websocket: {
            url: `wss://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`,
            auth: 'Requiere token JWT en handshake',
            realTimeService: 'Sistema de notificaciones avanzado habilitado'
        },
        suggestion: 'Verifica que la URL sea correcta y que incluya el prefijo /api'
    });
});

// --- Manejo de errores del servidor ---
app.use((error, req, res, next) => {
    console.error('Error del servidor:', error);
    res.status(500).json({
        status: 'ERROR',
        message: 'Error interno del servidor',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { 
            error: error.message,
            stack: error.stack 
        })
    });
});

// --- Función para iniciar el servidor ---
async function startServer() {
    try {
        // Ejecutar migración de base de datos automáticamente
        console.log('🔄 Inicializando base de datos...');
        await initializeDatabase();
        console.log('✅ Base de datos inicializada correctamente');
        
        // Iniciar servidor después de la migración
        server.listen(PORT, '0.0.0.0', () => {
            const baseUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`;
            console.log(`🚀 Servidor backend corriendo en ${baseUrl}`);
            console.log(`📡 API disponible en ${baseUrl}/api`);
            console.log(`🔗 Health check en ${baseUrl}/api/health`);
            console.log(`🔌 WebSocket disponible en wss://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`);
            console.log(`⚡ RealTimeService: Sistema de notificaciones avanzado activo`);
            console.log(`📱 Para React Native emulador: http://10.0.2.2:${PORT}/api`);
            console.log(`🌐 CORS habilitado para múltiples orígenes`);
            console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 WebSocket: Habilitado con autenticación JWT`);
            console.log(`🔔 RealTimeService: Conexiones activas: ${realTimeService.getClientCount()}`);
        });
    } catch (error) {
        console.error('❌ Error al inicializar la aplicación:', error.message);
        process.exit(1);
    }
}

// Iniciar el servidor
startServer();

// Exportar para testing
module.exports = { app, server, io };