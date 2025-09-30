const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ✅ VALIDAR QUE TODOS LOS DATOS REQUERIDOS ESTÉN PRESENTES
        if (!decoded.idUsuario || !decoded.idEmpresa || !decoded.rol) {
            console.error('AuthMiddleware: Datos de usuario incompletos en token', {
                hasIdUsuario: !!decoded.idUsuario,
                hasIdEmpresa: !!decoded.idEmpresa,
                hasRol: !!decoded.rol,
                hasEmail: !!decoded.email,
                hasNombre: !!decoded.nombre
            });
            return res.status(401).json({
                message: 'Datos de usuario incompletos. Inicie sesión nuevamente.',
                code: 'INCOMPLETE_USER_DATA'
            });
        }

        // ✅ AGREGAR TODOS LOS DATOS DEL USUARIO A LA REQUEST
        req.user = {
            idUsuario: decoded.idUsuario,
            idEmpresa: decoded.idEmpresa,
            rol: decoded.rol,
            email: decoded.email,
            nombre: decoded.nombre,
            apellido: decoded.apellido,
            telefono: decoded.telefono,
            documento: decoded.documento
        };

        console.log('AuthMiddleware: Usuario autenticado correctamente', {
            userId: req.user.idUsuario,
            empresaId: req.user.idEmpresa,
            rol: req.user.rol,
            nombre: req.user.nombre
        });

        next();
    } catch (error) {
        console.error('AuthMiddleware: Error de autenticación:', error);
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};

module.exports = authMiddleware;