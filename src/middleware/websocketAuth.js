// src/middleware/websocketAuth.js
const jwt = require('jsonwebtoken');

module.exports = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Token de autenticación requerido'));
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Agregar información del usuario al socket
    socket.userId = decoded.idUsuario;
    socket.empresaId = decoded.idEmpresa;
    socket.rol = decoded.rol;

    next();
  } catch (error) {
    console.error('Error de autenticación WebSocket:', error);
    next(new Error('Token inválido'));
  }
};