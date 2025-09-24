// src/middleware/roleMiddleware.js


const allowRoles = (...rolesPermitidos) => {
    return (req, res, next) => {
        const userRole = req.user.role;
        if (!rolesPermitidos.includes(userRole)) {
            return res.status(403).json({ message: "Acceso denegado." });
        }
        next();
    };
};

module.exports = allowRoles;
