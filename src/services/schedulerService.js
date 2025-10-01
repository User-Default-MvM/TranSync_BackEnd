// src/services/schedulerService.js

const cron = require('node-cron');
const UbicacionUsuario = require('../models/UbicacionUsuario');
const NotificacionRuta = require('../models/NotificacionRuta');

/**
 * Servicio de tareas programadas para mantenimiento del sistema Waze-style
 */
class SchedulerService {

    constructor() {
        this.jobs = new Map();
        this.inicializado = false;
    }

    /**
     * Inicializar todas las tareas programadas
     */
    inicializar() {
        if (this.inicializado) {
            console.log('SchedulerService ya está inicializado');
            return;
        }

        console.log('🚀 Inicializando SchedulerService...');

        // Tarea 1: Actualizar posiciones de buses cada 30 segundos (simulado)
        this.programarActualizacionPosiciones();

        // Tarea 2: Calcular métricas de rutas cada hora
        this.programarCalculoMetricas();

        // Tarea 3: Limpiar ubicaciones antiguas (> 30 días) diariamente
        this.programarLimpiezaUbicaciones();

        // Tarea 4: Limpiar notificaciones antiguas (> 90 días) semanalmente
        this.programarLimpiezaNotificaciones();

        // Tarea 5: Actualizar información de tráfico (simulado) cada 5 minutos
        this.programarActualizacionTrafico();

        this.inicializado = true;
        console.log('✅ SchedulerService inicializado correctamente');
    }

    /**
     * Programar actualización de posiciones de vehículos
     */
    programarActualizacionPosiciones() {
        // Cada 30 segundos - En producción esto vendría de GPS real de vehículos
        const job = cron.schedule('*/30 * * * * *', async () => {
            try {
                console.log('🔄 Actualizando posiciones de vehículos...');

                // Simular actualización de posiciones de vehículos
                await this.simularActualizacionPosicionesVehiculos();

                console.log('✅ Posiciones de vehículos actualizadas');
            } catch (error) {
                console.error('❌ Error actualizando posiciones de vehículos:', error);
            }
        });

        this.jobs.set('actualizarPosiciones', job);
    }

    /**
     * Programar cálculo de métricas de rutas
     */
    programarCalculoMetricas() {
        // Cada hora
        const job = cron.schedule('0 * * * *', async () => {
            try {
                console.log('📊 Calculando métricas de rutas...');

                // Aquí iría la lógica para calcular métricas
                await this.calcularMetricasRutas();

                console.log('✅ Métricas de rutas calculadas');
            } catch (error) {
                console.error('❌ Error calculando métricas de rutas:', error);
            }
        });

        this.jobs.set('calcularMetricas', job);
    }

    /**
     * Programar limpieza de ubicaciones antiguas
     */
    programarLimpiezaUbicaciones() {
        // Diariamente a las 2:00 AM
        const job = cron.schedule('0 2 * * *', async () => {
            try {
                console.log('🧹 Limpiando ubicaciones antiguas...');

                const eliminadas = await UbicacionUsuario.limpiarUbicacionesAntiguas(30);

                console.log(`✅ ${eliminadas} ubicaciones antiguas eliminadas`);
            } catch (error) {
                console.error('❌ Error limpiando ubicaciones antiguas:', error);
            }
        });

        this.jobs.set('limpiarUbicaciones', job);
    }

    /**
     * Programar limpieza de notificaciones antiguas
     */
    programarLimpiezaNotificaciones() {
        // Semanalmente los domingos a las 3:00 AM
        const job = cron.schedule('0 3 * * 0', async () => {
            try {
                console.log('🧹 Limpiando notificaciones antiguas...');

                const eliminadas = await NotificacionRuta.limpiarAntiguas(90);

                console.log(`✅ ${eliminadas} notificaciones antiguas eliminadas`);
            } catch (error) {
                console.error('❌ Error limpiando notificaciones antiguas:', error);
            }
        });

        this.jobs.set('limpiarNotificaciones', job);
    }

    /**
     * Programar actualización de información de tráfico
     */
    programarActualizacionTrafico() {
        // Cada 5 minutos
        const job = cron.schedule('*/5 * * * *', async () => {
            try {
                console.log('🚦 Actualizando información de tráfico...');

                // Simular actualización de tráfico
                await this.simularActualizacionTrafico();

                console.log('✅ Información de tráfico actualizada');
            } catch (error) {
                console.error('❌ Error actualizando información de tráfico:', error);
            }
        });

        this.jobs.set('actualizarTrafico', job);
    }

    /**
     * Simular actualización de posiciones de vehículos
     * En producción esto vendría de dispositivos GPS reales
     */
    async simularActualizacionPosicionesVehiculos() {
        try {
            // Obtener vehículos activos
            const pool = require('../config/db');
            const [vehiculos] = await pool.query(`
                SELECT idVehiculo, numVehiculo, latitudActual, longitudActual
                FROM Vehiculos
                WHERE estVehiculo = 'EN_RUTA'
                AND latitudActual IS NOT NULL
                AND longitudActual IS NOT NULL
            `);

            for (const vehiculo of vehiculos) {
                // Simular pequeño movimiento del vehículo
                const nuevaLatitud = vehiculo.latitudActual + (Math.random() - 0.5) * 0.001;
                const nuevaLongitud = vehiculo.longitudActual + (Math.random() - 0.5) * 0.001;
                const velocidad = 30 + Math.random() * 40; // 30-70 km/h

                // Actualizar posición en base de datos
                await pool.query(`
                    UPDATE Vehiculos
                    SET latitudActual = ?, longitudActual = ?, velocidadActual = ?,
                        ultimaUbicacion = NOW()
                    WHERE idVehiculo = ?
                `, [nuevaLatitud, nuevaLongitud, velocidad, vehiculo.idVehiculo]);

                // Aquí podrías emitir evento WebSocket para actualización en tiempo real
                // this.emitirActualizacionPosicion(vehiculo.idVehiculo, nuevaLatitud, nuevaLongitud);
            }
        } catch (error) {
            console.error('Error simulando actualización de posiciones:', error);
            throw error;
        }
    }

    /**
     * Calcular métricas de rutas
     */
    async calcularMetricasRutas() {
        try {
            const pool = require('../config/db');

            // Calcular métricas básicas para cada ruta
            const [rutas] = await pool.query(`
                SELECT idRuta, COUNT(*) as viajes_hoy
                FROM Viajes
                WHERE DATE(fecHorSalViaje) = CURDATE()
                GROUP BY idRuta
            `);

            for (const ruta of rutas) {
                // Aquí podrías calcular métricas más complejas como:
                // - Tiempo promedio de viaje
                // - Índice de puntualidad
                // - Nivel de ocupación promedio
                // - etc.

                console.log(`Ruta ${ruta.idRuta}: ${ruta.viajes_hoy} viajes hoy`);
            }
        } catch (error) {
            console.error('Error calculando métricas de rutas:', error);
            throw error;
        }
    }

    /**
     * Simular actualización de información de tráfico
     */
    async simularActualizacionTrafico() {
        try {
            // En producción esto vendría de APIs externas como Google Maps Traffic API
            const zonasTrafico = [
                { lat: 4.6482, lng: -74.0648, nivel: 'BAJO' },
                { lat: 4.7589, lng: -74.0501, nivel: 'MODERADO' },
                { lat: 6.2308, lng: -75.5906, nivel: 'ALTO' }
            ];

            for (const zona of zonasTrafico) {
                // Aquí actualizarías la información de tráfico en la base de datos
                console.log(`Tráfico ${zona.nivel} en ${zona.lat}, ${zona.lng}`);
            }
        } catch (error) {
            console.error('Error actualizando información de tráfico:', error);
            throw error;
        }
    }

    /**
     * Detener todas las tareas programadas
     */
    detener() {
        console.log('🛑 Deteniendo SchedulerService...');

        for (const [nombre, job] of this.jobs) {
            job.stop();
            console.log(`⏹️ Tarea detenida: ${nombre}`);
        }

        this.jobs.clear();
        this.inicializado = false;

        console.log('✅ SchedulerService detenido');
    }

    /**
     * Obtener estado de todas las tareas
     */
    obtenerEstado() {
        const estado = {};

        for (const [nombre, job] of this.jobs) {
            estado[nombre] = {
                running: job.running,
                scheduled: true
            };
        }

        return {
            inicializado: this.inicializado,
            totalJobs: this.jobs.size,
            jobs: estado
        };
    }

    /**
     * Reiniciar una tarea específica
     */
    reiniciarJob(nombreJob) {
        if (this.jobs.has(nombreJob)) {
            this.jobs.get(nombreJob).stop();

            // Reiniciar según el tipo de job
            switch (nombreJob) {
                case 'actualizarPosiciones':
                    this.programarActualizacionPosiciones();
                    break;
                case 'calcularMetricas':
                    this.programarCalculoMetricas();
                    break;
                case 'limpiarUbicaciones':
                    this.programarLimpiezaUbicaciones();
                    break;
                case 'limpiarNotificaciones':
                    this.programarLimpiezaNotificaciones();
                    break;
                case 'actualizarTrafico':
                    this.programarActualizacionTrafico();
                    break;
            }

            console.log(`🔄 Job reiniciado: ${nombreJob}`);
            return true;
        }

        return false;
    }
}

// Crear instancia singleton
const schedulerService = new SchedulerService();

module.exports = schedulerService;