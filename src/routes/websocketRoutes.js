// src/routes/websocketRoutes.js
module.exports = () => {
  // Función para configurar rutas cuando app esté disponible
  const setupRoutes = () => {
    if (!global.app || !global.realTimeService) {
      console.log('⚠️ Esperando que app y realTimeService estén disponibles...');
      setTimeout(setupRoutes, 100);
      return;
    }

    // Endpoint para estadísticas de conexiones
    global.app.get('/api/websocket/stats', (req, res) => {
      try {
        const stats = global.realTimeService.getConnectionStats();
        res.json({
          success: true,
          stats: stats,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('❌ Error obteniendo estadísticas WebSocket:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Endpoint para clientes conectados
    global.app.get('/api/websocket/clients', (req, res) => {
      try {
        const clients = global.realTimeService.getConnectedClients();
        res.json({
          success: true,
          clients: clients,
          count: clients.length,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('❌ Error obteniendo clientes WebSocket:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    console.log('✅ Rutas WebSocket configuradas exitosamente');
  };

  // Configurar rutas
  setupRoutes();
};