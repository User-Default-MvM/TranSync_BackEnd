// routes/index.js
const express = require('express');
const router = express.Router();

// Import database connection
const pool = require('../config/db'); // Using your existing db.js file

// Importar todas las rutas
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const conductoresRoutes = require('./conductoresRoutes');
const vehiculosRoutes = require('./vehiculosRoutes');
const rutasRoutes = require('./rutasRoutes');
const viajesRoutes = require('./viajesRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const chatbotRoutes = require('./chatbotRoutes');
const mapRoutes = require('./mapRoutes'); // Nueva ruta de mapas
const realTimeRoutes = require('./realTimeRoutes'); // Rutas del RealTimeService
const profileRoutes = require('./profileRoutes'); // Rutas de perfil de usuario

// Ruta de verificación de salud
router.get('/health', async (req, res) => {
    try {
        // Verificar conexión a la base de datos
        const [result] = await pool.query('SELECT 1 as status');
        
        res.status(200).json({
            status: 'OK',
            message: 'Servidor y base de datos funcionando correctamente',
            timestamp: new Date().toISOString(),
            database: result.length > 0 ? 'Connected' : 'Disconnected'
        });
    } catch (error) {
        console.error('Error en health check:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Error en la base de datos',
            timestamp: new Date().toISOString(),
            database: 'Disconnected',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Rutas de la aplicación
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/conductores', conductoresRoutes);
router.use('/vehiculos', vehiculosRoutes);
router.use('/rutas', rutasRoutes);
router.use('/viajes', viajesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/map', mapRoutes); // Nueva ruta de mapas
router.use('/realtime', realTimeRoutes); // Rutas del RealTimeService
router.use('/user', profileRoutes); // Rutas de perfil de usuario

// Ruta para manejo de errores 404
router.use((req, res) => {
    res.status(404).json({
        status: 'ERROR',
        message: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            '/api/health',
            '/api/auth/*',
            '/api/admin/*',
            '/api/conductores/*',
            '/api/vehiculos/*',
            '/api/rutas/*',
            '/api/viajes/*',
            '/api/dashboard/*',
            '/api/chatbot/*',
            '/api/map/*', // Nueva ruta de mapas
            '/api/realtime/*', // Rutas del RealTimeService
            '/api/user/*' // Rutas de perfil de usuario
        ]
    });
});

module.exports = router;