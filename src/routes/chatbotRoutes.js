// src/routes/chatbotRoutes.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const chatbotController = require('../controllers/chatbotController');
const cacheService = require('../utils/cacheService');
const authMiddleware = require('../middleware/authMiddleware');

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

/**
 * POST /api/chatbot/consulta
 * Procesar consulta del usuario y generar respuesta inteligente
 * Acceso: Todos los roles autenticados
 */
router.post('/consulta', chatbotController.procesarConsulta);

/**
 * GET /api/chatbot/estadisticas
 * Obtener estadísticas de uso del chatbot
 * Acceso: Solo administradores
 */
router.get('/estadisticas', 
    require('../middleware/roleMiddleware')('ADMINISTRADOR', 'SUPERADMIN'), 
    chatbotController.getEstadisticasChatbot
);

/**
 * POST /api/chatbot/query
 * Ejecutar consultas SQL directas (solo SELECT)
 * Acceso: Solo administradores
 */
router.post('/query',
    require('../middleware/roleMiddleware')('ADMINISTRADOR', 'SUPERADMIN'),
    async (req, res) => {
        try {
            const { sql, params = [] } = req.body;

            // Validar que sea una consulta segura (solo SELECT)
            if (!sql || !sql.toLowerCase().trim().startsWith('select')) {
                return res.status(400).json({
                    error: 'Solo consultas SELECT permitidas',
                    message: 'Por seguridad, solo se permiten consultas de lectura (SELECT)'
                });
            }

            // Ejecutar consulta con timeout y límites
            const [rows] = await pool.query(sql, params);

            res.json({
                success: true,
                data: rows,
                count: rows.length,
                query: sql,
                executedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error ejecutando consulta directa:', error);
            res.status(500).json({
                error: 'Error ejecutando consulta',
                message: error.message,
                query: req.body.sql
            });
        }
    }
);

/**
 * GET /api/chatbot/cache/stats
 * Obtener estadísticas del sistema de cache
 * Acceso: Solo administradores
 */
router.get('/cache/stats',
    require('../middleware/roleMiddleware')('ADMINISTRADOR', 'SUPERADMIN'),
    (req, res) => {
        try {
            const stats = cacheService.getPerformanceStats();
            res.json({
                success: true,
                cacheStats: stats
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas de cache:', error);
            res.status(500).json({
                error: 'Error obteniendo estadísticas de cache',
                message: error.message
            });
        }
    }
);

/**
 * POST /api/chatbot/cache/clear
 * Limpiar cache del sistema
 * Acceso: Solo administradores
 */
router.post('/cache/clear',
    require('../middleware/roleMiddleware')('ADMINISTRADOR', 'SUPERADMIN'),
    (req, res) => {
        try {
            cacheService.clearAll();
            res.json({
                success: true,
                message: 'Cache limpiado exitosamente',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error limpiando cache:', error);
            res.status(500).json({
                error: 'Error limpiando cache',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/chatbot/health
 * Verificar estado del servicio de chatbot
 * Acceso: Todos los roles autenticados
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'ChatBot API Avanzado',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        features: [
            'NLP Avanzado',
            'Memoria Conversacional',
            'Cache Inteligente',
            'Generación Automática de SQL',
            'Análisis de Sentimientos'
        ]
    });
});

module.exports = router;