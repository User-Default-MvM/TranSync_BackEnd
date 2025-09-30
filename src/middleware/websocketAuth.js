const jwt = require('jsonwebtoken');

module.exports = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      console.error('WebSocket: Token de autenticación requerido');
      return next(new Error('Token de autenticación requerido'));
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ VALIDAR QUE TODOS LOS DATOS REQUERIDOS ESTÉN PRESENTES
    if (!decoded.idUsuario || !decoded.idEmpresa || !decoded.rol) {
      console.error('WebSocket: Datos de usuario incompletos en token', {
        hasIdUsuario: !!decoded.idUsuario,
        hasIdEmpresa: !!decoded.idEmpresa,
        hasRol: !!decoded.rol,
        hasEmail: !!decoded.email,
        hasNombre: !!decoded.nombre
      });
      return next(new Error('Datos de usuario incompletos en token'));
    }

    // ✅ AGREGAR TODOS LOS DATOS DEL USUARIO AL SOCKET
    socket.userId = decoded.idUsuario;
    socket.empresaId = decoded.idEmpresa;
    socket.rol = decoded.rol;
    socket.email = decoded.email;
    socket.nombre = decoded.nombre;
    socket.apellido = decoded.apellido;
    socket.telefono = decoded.telefono;
    socket.documento = decoded.documento;

    console.log('WebSocket: Usuario autenticado correctamente', {
      userId: socket.userId,
      empresaId: socket.empresaId,
      rol: socket.rol,
      nombre: socket.nombre
    });

    next();
  } catch (error) {
    console.error('WebSocket: Error de autenticación:', error);
    next(new Error('Token inválido o expirado'));
  }
};