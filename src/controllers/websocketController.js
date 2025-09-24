// src/controllers/websocketController.js
const pool = require('../config/db');
const RealTimeService = require('../utilidades/realTimeService');

class WebSocketController {
  constructor(realTimeService) {
    this.realTimeService = realTimeService;
  }

  // ===============================
  // MÉTODOS PARA CONTROLADORES EXISTENTES
  // ===============================

  // Llamar después de crear un conductor
  async notifyNewConductor(conductorData) {
    try {
      const notification = {
        type: 'conductor_nuevo',
        title: '👨‍💼 Nuevo Conductor Registrado',
        message: `Se ha registrado el conductor ${conductorData.nomConductor} ${conductorData.apeConductor}`,
        data: conductorData,
        timestamp: new Date(),
        priority: 'medium'
      };

      await this.realTimeService.sendToEmpresa(conductorData.idEmpresa, 'conductor:created', notification);
      console.log('✅ Notificación de nuevo conductor enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación de conductor:', error);
    }
  }

  // Llamar después de crear un vehículo
  async notifyNewVehicle(vehicleData) {
    try {
      const notification = {
        type: 'vehiculo_nuevo',
        title: '🚗 Nuevo Vehículo Registrado',
        message: `Se ha registrado el vehículo ${vehicleData.marVehiculo} ${vehicleData.modVehiculo} (${vehicleData.plaVehiculo})`,
        data: vehicleData,
        timestamp: new Date(),
        priority: 'medium'
      };

      await this.realTimeService.sendToEmpresa(vehicleData.idEmpresa, 'vehiculo:created', notification);
      console.log('✅ Notificación de nuevo vehículo enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación de vehículo:', error);
    }
  }

  // Llamar después de crear una ruta
  async notifyNewRoute(routeData) {
    try {
      const notification = {
        type: 'ruta_nueva',
        title: '🗺️ Nueva Ruta Registrada',
        message: `Se ha registrado la ruta "${routeData.nomRuta}"`,
        data: routeData,
        timestamp: new Date(),
        priority: 'low'
      };

      await this.realTimeService.sendToEmpresa(routeData.idEmpresa, 'ruta:created', notification);
      console.log('✅ Notificación de nueva ruta enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación de ruta:', error);
    }
  }

  // Llamar después de crear un viaje
  async notifyNewTrip(tripData) {
    try {
      // Obtener empresa del vehículo
      const vehicleResponse = await pool.query(
        'SELECT idEmpresa FROM Vehiculos WHERE idVehiculo = ?',
        [tripData.idVehiculo]
      );

      if (vehicleResponse[0].length > 0) {
        const empresaId = vehicleResponse[0][0].idEmpresa;

        const notification = {
          type: 'viaje_nuevo',
          title: '⏰ Nuevo Viaje Programado',
          message: `Se programó un nuevo viaje para la ruta ${tripData.nomRuta || 'sin nombre'}`,
          data: tripData,
          timestamp: new Date(),
          priority: 'medium'
        };

        await this.realTimeService.sendToEmpresa(empresaId, 'viaje:created', notification);
        console.log('✅ Notificación de nuevo viaje enviada');
      }
    } catch (error) {
      console.error('❌ Error enviando notificación de viaje:', error);
    }
  }

  // ===============================
  // MÉTODOS PARA ALERTAS PROGRAMADAS
  // ===============================

  // Verificar vencimientos diariamente
  async checkExpirations() {
    try {
      const [expirations] = await pool.query(`
        SELECT
          'LICENCIA' as tipoDocumento,
          CONCAT(c.nomConductor, ' ', c.apeConductor) as titular,
          c.fecVenLicConductor as fechaVencimiento,
          DATEDIFF(c.fecVenLicConductor, CURDATE()) as diasParaVencer,
          c.idEmpresa
        FROM Conductores c
        WHERE c.fecVenLicConductor BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)

        UNION ALL

        SELECT
          'SOAT' as tipoDocumento,
          CONCAT(v.marVehiculo, ' ', v.modVehiculo, ' - ', v.plaVehiculo) as titular,
          v.fecVenSOAT as fechaVencimiento,
          DATEDIFF(v.fecVenSOAT, CURDATE()) as diasParaVencer,
          v.idEmpresa
        FROM Vehiculos v
        WHERE v.fecVenSOAT BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)

        UNION ALL

        SELECT
          'TECNOMECANICA' as tipoDocumento,
          CONCAT(v.marVehiculo, ' ', v.modVehiculo, ' - ', v.plaVehiculo) as titular,
          v.fecVenTec as fechaVencimiento,
          DATEDIFF(v.fecVenTec, CURDATE()) as diasParaVencer,
          v.idEmpresa
        FROM Vehiculos v
        WHERE v.fecVenTec BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      `);

      // Enviar alertas para cada vencimiento
      for (const expiration of expirations) {
        if (expiration.diasParaVencer <= 7) { // Solo alertas críticas
          const notification = {
            type: 'vencimiento_alerta',
            title: '⚠️ Alerta de Vencimiento',
            message: `Documento próximo a vencer: ${expiration.tipoDocumento} - ${expiration.titular}`,
            data: expiration,
            timestamp: new Date(),
            priority: 'high'
          };

          await this.realTimeService.sendToEmpresa(expiration.idEmpresa, 'vencimiento:alert', notification);
        }
      }

      console.log(`📊 Verificación de vencimientos completada: ${expirations.length} alertas enviadas`);

    } catch (error) {
      console.error('❌ Error verificando vencimientos:', error);
    }
  }

  // ===============================
  // MÉTODOS DE ESTADÍSTICAS
  // ===============================

  getConnectionStats() {
    return this.realTimeService.getConnectionStats();
  }

  getConnectedClients() {
    return this.realTimeService.getConnectedClients();
  }
}

module.exports = WebSocketController;