const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ✅ VALIDAR QUE LOS DATOS MÍNIMOS REQUERIDOS ESTÉN PRESENTES
        if (!decoded.idUsuario || !decoded.idEmpresa || !decoded.rol) {
            console.error('AuthMiddleware: Datos de usuario críticos faltantes en token', {
                hasIdUsuario: !!decoded.idUsuario,
                hasIdEmpresa: !!decoded.idEmpresa,
                hasRol: !!decoded.rol,
                hasEmail: !!decoded.email,
                hasNombre: !!decoded.nombre
            });

            // Intentar recuperar datos del usuario desde la base de datos
            try {
                const pool = require('../config/db');
                const query = `
                    SELECT u.idUsuario, u.email, u.nomUsuario, u.apeUsuario, u.numDocUsuario, u.telUsuario,
                           r.nomRol as rol, e.nomEmpresa, e.idEmpresa
                    FROM Usuarios u
                    JOIN Roles r ON u.idRol = r.idRol
                    JOIN Empresas e ON u.idEmpresa = e.idEmpresa
                    WHERE u.idUsuario = ?
                `;

                const [rows] = await pool.query(query, [decoded.idUsuario]);
                const user = rows[0];

                if (user) {
                    // Crear nuevo token con datos completos
                    const jwt = require('jsonwebtoken');
                    const completeToken = jwt.sign(
                        {
                            idUsuario: user.idUsuario,
                            idEmpresa: user.idEmpresa,
                            rol: user.rol,
                            email: user.email,
                            nombre: user.nomUsuario,
                            apellido: user.apeUsuario,
                            telefono: user.telUsuario,
                            documento: user.numDocUsuario
                        },
                        process.env.JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    console.log('AuthMiddleware: Datos de usuario recuperados exitosamente');

                    // Responder con el nuevo token
                    return res.status(200).json({
                        message: 'Token actualizado con datos completos',
                        code: 'TOKEN_UPDATED',
                        token: completeToken,
                        user: {
                            idUsuario: user.idUsuario,
                            idEmpresa: user.idEmpresa,
                            rol: user.rol,
                            email: user.email,
                            nombre: user.nomUsuario,
                            apellido: user.apeUsuario,
                            telefono: user.telUsuario,
                            documento: user.numDocUsuario
                        }
                    });
                }
            } catch (recoveryError) {
                console.error('AuthMiddleware: Error recuperando datos de usuario:', recoveryError);
            }

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