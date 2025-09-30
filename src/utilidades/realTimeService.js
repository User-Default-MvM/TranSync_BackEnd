// src/utilidades/realTimeService.js - Servicio de Notificaciones en Tiempo Real para Backend
const { Server } = require('socket.io');

class RealTimeService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.connectedClients = new Map();
    this.eventListeners = new Map();
    this.notificationQueue = [];
    this.isProcessingQueue = false;

    this.setupConnectionHandlers();
    this.setupEventHandlers();
    this.startNotificationProcessor();

    console.log('🚀 RealTimeService inicializado');
  }

  /**
   * Configurar handlers de conexión
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      // Middleware de autenticación
      socket.on('authenticate', (authData) => {
        this.handleAuthentication(socket, authData);
      });

      // Handler de desconexión
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // Handler de error
      socket.on('connect_error', (error) => {
        console.error('❌ Error de conexión:', error);
        this.handleConnectionError(socket, error);
      });

      // Ping/Pong para mantener conexión
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });
    });
  }

  /**
   * Manejar autenticación del cliente
   */
  handleAuthentication(socket, authData) {
    try {
      const { token, userId, empresaId, rol } = authData;

      if (!token || !userId || !empresaId) {
        socket.emit('auth:error', {
          message: 'Datos de autenticación incompletos',
          timestamp: new Date()
        });
        socket.disconnect();
        return;
      }

      // Aquí podrías validar el token JWT si es necesario
      // Por simplicidad, asumimos que el token es válido si llega hasta aquí

      socket.userId = userId;
      socket.empresaId = empresaId;
      socket.rol = rol || 'USER';
      socket.authenticated = true;
      socket.connectedAt = new Date();

      // Registrar cliente
      this.registerClient(socket);

      // Unir a salas
      this.joinRooms(socket);

      // Confirmar autenticación
      socket.emit('auth:success', {
        message: 'Autenticación exitosa',
        userId: userId,
        empresaId: empresaId,
        timestamp: new Date()
      });

      console.log(`✅ Cliente autenticado: ${userId} (${empresaId})`);

    } catch (error) {
      console.error('❌ Error en autenticación:', error);
      socket.emit('auth:error', {
        message: 'Error interno del servidor',
        timestamp: new Date()
      });
      socket.disconnect();
    }
  }

  /**
   * Registrar cliente conectado
   */
  registerClient(socket) {
    this.connectedClients.set(socket.userId, {
      socketId: socket.id,
      userId: socket.userId,
      empresaId: socket.empresaId,
      rol: socket.rol,
      connectedAt: socket.connectedAt,
      lastPing: new Date()
    });
  }

  /**
   * Unir cliente a salas específicas
   */
  joinRooms(socket) {
    const rooms = [
      `empresa_${socket.empresaId}`,
      `usuario_${socket.userId}`,
      `rol_${socket.rol}`
    ];

    rooms.forEach(room => {
      socket.join(room);
    });

    // Emitir evento de conexión establecida
    socket.emit('connection:established', {
      userId: socket.userId,
      empresaId: socket.empresaId,
      rooms: rooms,
      timestamp: new Date()
    });
  }

  /**
   * Manejar desconexión del cliente
   */
  handleDisconnection(socket, reason) {
    if (socket.userId) {
      this.connectedClients.delete(socket.userId);

      // Notificar a otros clientes si es necesario
      this.emitToEmpresa(socket.empresaId, 'user:disconnected', {
        userId: socket.userId,
        reason: reason,
        timestamp: new Date()
      });
    }
  }

  /**
   * Manejar errores de conexión
   */
  handleConnectionError(socket, error) {
    console.error(`❌ Error de conexión para socket ${socket.id}:`, error);

    this.emit('connection:error', {
      socketId: socket.id,
      error: error.message,
      timestamp: new Date()
    });
  }

  /**
   * Configurar handlers de eventos
   */
  setupEventHandlers() {
    // Unirse a salas específicas
    this.io.on('connection', (socket) => {
      socket.on('join:empresa', (data) => {
        if (socket.authenticated) {
          socket.join(`empresa_${data.empresaId}`);
        }
      });

      socket.on('join:usuario', (data) => {
        if (socket.authenticated) {
          socket.join(`usuario_${data.userId}`);
        }
      });

      socket.on('join:rol', (data) => {
        if (socket.authenticated) {
          socket.join(`rol_${data.rol}`);
        }
      });

      // Enviar notificación personalizada
      socket.on('notification:send', (data) => {
        if (socket.authenticated) {
          this.sendNotification(data, socket);
        }
      });

      // Suscribirse a eventos
      socket.on('subscribe', (eventName) => {
        if (socket.authenticated) {
          socket.join(`event:${eventName}`);
        }
      });

      // Cancelar suscripción a eventos
      socket.on('unsubscribe', (eventName) => {
        if (socket.authenticated) {
          socket.leave(`event:${eventName}`);
        }
      });
    });
  }

  /**
   * Iniciar procesador de notificaciones
   */
  startNotificationProcessor() {
    setInterval(() => {
      this.processNotificationQueue();
    }, 1000); // Procesar cada segundo
  }

  /**
   * Procesar cola de notificaciones
   */
  async processNotificationQueue() {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const notification = this.notificationQueue.shift();
      await this.sendNotificationInternal(notification);
    } catch (error) {
      console.error('❌ Error procesando notificación:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Enviar notificación (método interno)
   */
  async sendNotificationInternal(notification) {
    const { targetType, targetId, event, data, priority = 'medium' } = notification;

    try {
      switch (targetType) {
        case 'empresa':
          this.emitToEmpresa(targetId, event, { ...data, priority });
          break;
        case 'usuario':
          this.emitToUsuario(targetId, event, { ...data, priority });
          break;
        case 'rol':
          this.emitToRol(targetId, event, { ...data, priority });
          break;
        case 'broadcast':
          this.emit(event, { ...data, priority });
          break;
        default:
          console.error('❌ Tipo de destino no válido:', targetType);
      }
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
      // Re-encolar la notificación para reintentar
      this.notificationQueue.unshift(notification);
    }
  }

  // ===============================
  // MÉTODOS PÚBLICOS DE NOTIFICACIÓN
  // ===============================

  /**
   * Enviar notificación a empresa específica
   */
  sendToEmpresa(empresaId, event, data, priority = 'medium') {
    const notification = {
      targetType: 'empresa',
      targetId: empresaId,
      event,
      data,
      priority,
      timestamp: new Date()
    };

    this.notificationQueue.push(notification);
  }

  /**
   * Enviar notificación a usuario específico
   */
  sendToUsuario(userId, event, data, priority = 'medium') {
    const notification = {
      targetType: 'usuario',
      targetId: userId,
      event,
      data,
      priority,
      timestamp: new Date()
    };

    this.notificationQueue.push(notification);
  }

  /**
   * Enviar notificación a rol específico
   */
  sendToRol(rol, event, data, priority = 'medium') {
    const notification = {
      targetType: 'rol',
      targetId: rol,
      event,
      data,
      priority,
      timestamp: new Date()
    };

    this.notificationQueue.push(notification);
  }

  /**
   * Enviar notificación broadcast a todos
   */
  broadcast(event, data, priority = 'medium') {
    const notification = {
      targetType: 'broadcast',
      targetId: null,
      event,
      data,
      priority,
      timestamp: new Date()
    };

    this.notificationQueue.push(notification);
  }

  /**
   * Enviar notificación personalizada
   */
  sendNotification(notificationData, socket = null) {
    const { targetType, targetId, event, data, priority = 'medium' } = notificationData;

    const notification = {
      targetType,
      targetId,
      event,
      data,
      priority,
      timestamp: new Date(),
      sender: socket?.userId || 'system'
    };

    this.notificationQueue.push(notification);
  }

  // ===============================
  // MÉTODOS DE EMISIÓN DIRECTA
  // ===============================

  /**
   * Emitir evento a empresa específica
   */
  emitToEmpresa(empresaId, event, data) {
    this.io.to(`empresa_${empresaId}`).emit(event, data);
  }

  /**
   * Emitir evento a usuario específico
   */
  emitToUsuario(userId, event, data) {
    this.io.to(`usuario_${userId}`).emit(event, data);
  }

  /**
   * Emitir evento a rol específico
   */
  emitToRol(rol, event, data) {
    this.io.to(`rol_${rol}`).emit(event, data);
  }

  /**
   * Emitir evento a todos los clientes conectados
   */
  emit(event, data) {
    this.io.emit(event, data);
  }

  // ===============================
  // MÉTODOS DE GESTIÓN Y ESTADÍSTICAS
  // ===============================

  /**
   * Obtener estadísticas de conexión
   */
  getConnectionStats() {
    const clients = Array.from(this.connectedClients.values());
    const stats = {
      totalConnections: clients.length,
      connectionsByEmpresa: {},
      connectionsByRol: {},
      uptime: process.uptime(),
      timestamp: new Date()
    };

    clients.forEach(client => {
      stats.connectionsByEmpresa[client.empresaId] =
        (stats.connectionsByEmpresa[client.empresaId] || 0) + 1;

      stats.connectionsByRol[client.rol] =
        (stats.connectionsByRol[client.rol] || 0) + 1;
    });

    return stats;
  }

  /**
   * Obtener lista de clientes conectados
   */
  getConnectedClients() {
    return Array.from(this.connectedClients.values());
  }

  /**
   * Verificar si un usuario está conectado
   */
  isUserConnected(userId) {
    return this.connectedClients.has(userId);
  }

  /**
   * Obtener número de clientes conectados
   */
  getClientCount() {
    return this.connectedClients.size;
  }

  /**
   * Obtener información del servidor
   */
  getServerInfo() {
    return {
      transport: this.io.engine.transport.name,
      clientsCount: this.getClientCount(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date()
    };
  }

  /**
   * Limpiar clientes inactivos
   */
  cleanupInactiveClients() {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutos

    let cleanedCount = 0;
    for (const [userId, client] of this.connectedClients.entries()) {
      if (now - client.lastPing > timeout) {
        this.connectedClients.delete(userId);
        cleanedCount++;
      }
    }

    // Log eliminado para reducir spam en consola

    return cleanedCount;
  }

  /**
   * Registrar listener para eventos del servicio
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remover listener de eventos
   */
  off(event, callback = null) {
    if (!this.eventListeners.has(event)) return;

    if (callback) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  /**
   * Emitir evento personalizado del servicio
   */
  emitServiceEvent(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ Error en listener de evento ${event}:`, error);
      }
    });
  }

  /**
   * Cerrar servicio
   */
  close() {
    console.log('🔌 Cerrando RealTimeService...');
    this.io.close();
    this.connectedClients.clear();
    this.eventListeners.clear();
    this.notificationQueue.length = 0;
  }
}

module.exports = RealTimeService;
