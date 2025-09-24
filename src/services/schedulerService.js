// src/services/schedulerService.js
const pool = require('../config/db');

class SchedulerService {
  constructor(realTimeService) {
    this.realTimeService = realTimeService;
    this.intervals = new Map();
  }

  // Verificar vencimientos cada hora
  startExpirationCheck() {
    const interval = setInterval(async () => {
      try {
        await this.checkExpirations();
      } catch (error) {
        console.error('❌ Error en verificación programada de vencimientos:', error);
      }
    }, 60 * 60 * 1000); // Cada hora

    this.intervals.set('expirationCheck', interval);
    console.log('⏰ Verificación de vencimientos programada cada hora');
  }

  // Verificar vencimientos diariamente a las 9 AM
  startDailyExpirationCheck() {
    const now = new Date();
    const next9AM = new Date(now);
    next9AM.setHours(9, 0, 0, 0);

    if (now > next9AM) {
      next9AM.setDate(next9AM.getDate() + 1);
    }

    const timeUntil9AM = next9AM - now;

    setTimeout(() => {
      // Ejecutar inmediatamente
      this.checkExpirations();

      // Programar para cada día a las 9 AM
      const dailyInterval = setInterval(async () => {
        try {
          await this.checkExpirations();
        } catch (error) {
          console.error('❌ Error en verificación diaria de vencimientos:', error);
        }
      }, 24 * 60 * 60 * 1000); // Cada 24 horas

      this.intervals.set('dailyExpirationCheck', dailyInterval);
    }, timeUntil9AM);

    console.log(`⏰ Verificación diaria de vencimientos programada para las 9:00 AM (en ${Math.round(timeUntil9AM / 1000 / 60)} minutos)`);
  }

  // Verificar vencimientos de documentos
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
            priority: 'high'
          };

          this.realTimeService.sendToEmpresa(expiration.idEmpresa, 'vencimiento:alert', notification);
        }
      }

      console.log(`📊 Verificación de vencimientos completada: ${expirations.length} alertas enviadas`);

    } catch (error) {
      console.error('❌ Error verificando vencimientos:', error);
    }
  }

  // Detener todos los intervalos
  stopAll() {
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`🛑 Intervalo detenido: ${name}`);
    });
    this.intervals.clear();
  }
}

// Función para inicializar el programador cuando realTimeService esté disponible
const initializeScheduler = () => {
  if (!global.realTimeService) {
    setTimeout(initializeScheduler, 500);
    return;
  }

  // Iniciar programador
  const scheduler = new SchedulerService(global.realTimeService);

  // Iniciar verificaciones programadas
  scheduler.startExpirationCheck();
  scheduler.startDailyExpirationCheck();

  console.log('✅ Programador de alertas inicializado');

  // Cleanup al cerrar la aplicación
  process.on('SIGINT', () => {
    console.log('🛑 Deteniendo programador de alertas...');
    scheduler.stopAll();
    process.exit(0);
  });

  return scheduler;
};

// Inicializar programador
const scheduler = initializeScheduler();

module.exports = scheduler;