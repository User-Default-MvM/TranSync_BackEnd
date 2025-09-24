// src/controllers/authController.js 

const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendEmail, sendEmailAsync } = require("../utils/emailService");


// REGISTRO DE USUARIO
const register = async (req, res) => {
    console.log("🔄 Iniciando registro de usuario");
    console.log("📝 Datos recibidos:", req.body);
    
    const { nomUsuario, apeUsuario, numDocUsuario, telUsuario, email, password } = req.body;
    const idEmpresa = 1; // Empresa por defecto

    // Validación de campos requeridos
    const requiredFields = ['nomUsuario', 'apeUsuario', 'numDocUsuario', 'telUsuario', 'email', 'password'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
        console.log("❌ Campos faltantes:", missingFields);
        return res.status(400).json({
            message: `Campos requeridos faltantes: ${missingFields.join(', ')}`
        });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log("❌ Formato de email inválido:", email);
        return res.status(400).json({ message: 'Formato de email inválido' });
    }

    // Validar contraseña segura (mínimo 6 caracteres)
    if (password && password.length < 6) {
        console.log("❌ Contraseña muy corta");
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    console.log("✅ Validaciones pasadas, obteniendo conexión a BD");
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        console.log("🔄 Transacción iniciada");

        console.log("🔍 Verificando usuario existente...");
        const [existingUser] = await connection.query(
            "SELECT idUsuario FROM Usuarios WHERE email = ? OR numDocUsuario = ?",
            [email, numDocUsuario]
        );
        if (existingUser.length > 0) {
            await connection.rollback();
            console.log("❌ Usuario ya existe");

            // Verificar si el usuario está activo
            const [userDetails] = await connection.query(
                "SELECT estActivo FROM Usuarios WHERE email = ?",
                [email]
            );

            if (userDetails.length > 0 && !userDetails[0].estActivo) {
                // Usuario existe pero no está verificado - reenviar email de verificación
                const userId = existingUser[0].idUsuario;
                console.log("🔄 Usuario no verificado, reenviando email de verificación...");

                const verifyToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
                const baseUrl = process.env.NODE_ENV === 'production'
                    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`
                    : `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`;
                const verifyUrl = `${baseUrl}/api/auth/verify?token=${verifyToken}`;

                sendEmailAsync(
                    email,
                    "Verifica Tu Cuenta De Transync",
                    `
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Verificación de Cuenta - Transync</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 0;
                                padding: 0;
                                background-color: #f4f4f9;
                            }
                            .email-container {
                                width: 100%;
                                max-width: 600px;
                                margin: 0 auto;
                                background-color: #ffffff;
                                border-radius: 8px;
                                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                                overflow: hidden;
                            }
                            .email-header {
                                background-color: #007bff;
                                color: #ffffff;
                                padding: 20px;
                                text-align: center;
                            }
                            .email-header h1 {
                                margin: 0;
                                font-size: 24px;
                            }
                            .email-body {
                                padding: 30px;
                                color: #333333;
                            }
                            .email-body p {
                                font-size: 16px;
                                line-height: 1.6;
                            }
                            .email-button {
                                display: inline-block;
                                padding: 12px 25px;
                                background-color: #28a745;
                                color: #ffffff;
                                text-decoration: none;
                                border-radius: 4px;
                                margin-top: 20px;
                            }
                            .footer {
                                text-align: center;
                                background-color: #f9f9f9;
                                padding: 20px;
                                color: #888888;
                                font-size: 14px;
                            }
                            @media (max-width: 600px) {
                                .email-container {
                                    width: 100%;
                                    padding: 15px;
                                }
                                .email-header h1 {
                                    font-size: 20px;
                                }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="email-container">
                            <div class="email-header">
                                <h1>Reenvío de Verificación - TranSync</h1>
                            </div>
                            <div class="email-body">
                                <p>¡Hola!</p>
                                <p>Tu cuenta ya existe pero aún no está verificada. Para completar tu proceso de registro, por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
                                <a href="${verifyUrl}" class="email-button" target="_blank">Verificar mi cuenta</a>
                                <p>Este enlace expirará en 24 horas. Si no realizaste esta solicitud, puedes ignorar este correo.</p>
                                <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                                <p>¡Gracias por ser parte de TranSync!</p>
                            </div>
                            <div class="footer">
                                <p>Transync &copy; 2025</p>
                                <p><a href="mailto:support@transync.com" style="color: #007bff;">support@transync.com</a></p>
                            </div>
                        </div>
                    </body>
                    </html>
                    `
                );

                return res.status(200).json({
                    message: "Usuario ya existe pero no está verificado. Se ha reenviado el email de verificación."
                });
            }

            return res.status(409).json({ message: "El correo o documento ya está registrado." });
        }

        console.log("🔍 Buscando rol CONDUCTOR...");
        const [roleResult] = await connection.query(
            "SELECT idRol FROM Roles WHERE nomRol = 'CONDUCTOR'"
        );
        if (roleResult.length === 0) {
            await connection.rollback();
            console.log("❌ Rol CONDUCTOR no encontrado");
            return res.status(500).json({ message: "Rol CONDUCTOR no encontrado." });
        }

        const idRol = roleResult[0].idRol;
        console.log("✅ Rol encontrado, ID:", idRol);

        console.log("🔐 Generando hash de contraseña...");
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        console.log("💾 Insertando usuario en BD...");
        const [userResult] = await connection.query(
            `INSERT INTO Usuarios
            (email, passwordHash, nomUsuario, apeUsuario, numDocUsuario, telUsuario, idRol, idEmpresa)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [email, passwordHash, nomUsuario, apeUsuario, numDocUsuario, telUsuario, idRol, idEmpresa]
        );

        const newUserId = userResult.insertId;
        console.log("✅ Usuario creado con ID:", newUserId);

        // Generar token de verificación y construir URL
        console.log("🔑 Generando token de verificación...");
        const verifyToken = jwt.sign({ id: newUserId }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const baseUrl = process.env.NODE_ENV === 'production'
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`
            : `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`;
        const verifyUrl = `${baseUrl}/api/auth/verify?token=${verifyToken}`;

        // Enviar email de verificación de forma asíncrona (no bloquea la respuesta)
        sendEmailAsync(
            email,
            "Verifica Tu Cuenta De Transync",
            `
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verificación de Cuenta - Transync</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f9;
                    }
                    .email-container {
                        width: 100%;
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .email-header {
                        background-color: #007bff;
                        color: #ffffff;
                        padding: 20px;
                        text-align: center;
                    }
                    .email-header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .email-body {
                        padding: 30px;
                        color: #333333;
                    }
                    .email-body p {
                        font-size: 16px;
                        line-height: 1.6;
                    }
                    .email-button {
                        display: inline-block;
                        padding: 12px 25px;
                        background-color: #28a745;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 4px;
                        margin-top: 20px;
                    }
                    .footer {
                        text-align: center;
                        background-color: #f9f9f9;
                        padding: 20px;
                        color: #888888;
                        font-size: 14px;
                    }
                    @media (max-width: 600px) {
                        .email-container {
                            width: 100%;
                            padding: 15px;
                        }
                        .email-header h1 {
                            font-size: 20px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="email-header">
                        <h1>Bienvenido a TranSync</h1>
                    </div>
                    <div class="email-body">
                        <p>¡Hola!</p>
                        <p>Gracias por registrarte en <strong>TranSync</strong>. Para completar tu proceso de registro, por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
                        <a href="${verifyUrl}" class="email-button" target="_blank">Verificar mi cuenta</a>
                        <p>Este enlace expirará en 24 horas. Si no realizaste esta solicitud, puedes ignorar este correo.</p>
                        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                        <p>¡Gracias por ser parte de TranSync!</p>
                    </div>
                    <div class="footer">
                        <p>Transync &copy; 2025</p>
                        <p><a href="mailto:support@transync.com" style="color: #007bff;">support@transync.com</a></p>
                    </div>
                </div>
            </body>
            </html>
            `
        );

        console.log("✅ Transacción completada, enviando respuesta...");
        await connection.commit();

        console.log("🎉 Registro completado exitosamente");
        res
            .status(201)
            .json({
                message:
                    "Usuario registrado. Verifica tu correo electronico para activar la cuenta.",
            });
    } catch (error) {
        await connection.rollback();
        console.error("❌ Error en el registro:", error);
        console.error("📝 Stack trace:", error.stack);
        res
            .status(500)
            .json({ message: "Error al registrar usuario." });
    } finally {
        connection.release();
        console.log("🔌 Conexión liberada");
    }
};

// LOGIN
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Correo y contraseña requeridos." });
    }

    try {
        const query = `
            SELECT u.*, r.nomRol as rol, e.nomEmpresa
            FROM Usuarios u
            JOIN Roles r ON u.idRol = r.idRol
            JOIN Empresas e ON u.idEmpresa = e.idEmpresa
            WHERE u.email = ?
        `;

        const [rows] = await pool.query(query, [email]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: "Credenciales incorrectas. Verifique su email y contraseña." });
        }

        if (!user.estActivo) {
            return res.status(403).json({ message: "Su cuenta no está activada. Por favor verifique su correo electrónico." });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Credenciales incorrectas. Verifique su email y contraseña." });
        }

        // Lógica para obtener nombre y apellido según rol
        let nombre = "";
        let apellido = "";

        if (user.rol === "SUPERADMIN") {
            nombre = user.nomUsuario || "Super";
            apellido = user.apeUsuario || "Admin";
        } else if (user.rol === "CONDUCTOR") {
            nombre = user.nomUsuario || "Conductor";
            apellido = user.apeUsuario || "Usuario";
        } else {
            nombre = user.nomUsuario || "Usuario";
            apellido = user.apeUsuario || "Pendiente";
        }

        const token = jwt.sign(
            {
                id: user.idUsuario,
                role: user.rol,
                idEmpresa: user.idEmpresa,
                empresa: user.nomEmpresa
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.idUsuario,
                name: `${nombre} ${apellido}`.trim(),
                email: user.email,
                role: user.rol,
                empresa: user.nomEmpresa,
                idEmpresa: user.idEmpresa
            }
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// VERIFICACION DE LA CUENTA.
const verifyAccount = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: "Token de verificación no proporcionado." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const [result] = await pool.query(
            'UPDATE Usuarios SET estActivo = 1 WHERE idUsuario = ?',
            [userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o ya verificado.' });
        }

        res.status(200).json({ message: 'Cuenta verificada exitosamente.' });
    } catch (error) {
        console.error("Error al verificar cuenta:", error);
        return res.status(400).json({ message: "Token inválido o expirado." });
    }
};
// OLVIDE MI CONTRASEÑA
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Correo electrónico requerido." });
    }

    try {
        const [rows] = await pool.query("SELECT idUsuario FROM Usuarios WHERE email = ?", [email]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Correo no registrado." });
        }

        const userId = rows[0].idUsuario;

        const resetToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "15m" });

        const frontendUrl = process.env.FRONTEND_URL || `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`;
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        // Enviar correo
        await sendEmail(
            email,
            "Restablece Tu Contraseña - TranSync",
            `
            <html lang="es">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Restablecimiento de Contraseña - TranSync</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f9;
                    }
                    .email-container {
                        width: 100%;
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .email-header {
                        background-color: #007bff;
                        color: #ffffff;
                        padding: 20px;
                        text-align: center;
                    }
                    .email-header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .email-body {
                        padding: 30px;
                        color: #333333;
                    }
                    .email-body p {
                        font-size: 16px;
                        line-height: 1.6;
                    }
                    .email-button {
                        display: inline-block;
                        padding: 12px 25px;
                        background-color: #dc3545;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 4px;
                        margin-top: 20px;
                    }
                    .footer {
                        text-align: center;
                        background-color: #f9f9f9;
                        padding: 20px;
                        color: #888888;
                        font-size: 14px;
                    }
                    @media (max-width: 600px) {
                        .email-container {
                            width: 100%;
                            padding: 15px;
                        }
                        .email-header h1 {
                            font-size: 20px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="email-header">
                        <h1>TranSync</h1>
                    </div>
                    <div class="email-body">
                        <p>¡Hola!</p>
                        <p>Has solicitado restablecer la contraseña de tu cuenta TranSync. Haz clic en el siguiente botón para continuar:</p>
                        <a href="${resetUrl}" class="email-button" target="_blank">Restablecer mi contraseña</a>
                        <p>Este enlace expirará en 15 minutos. Si no solicitaste este cambio, por favor ignora este correo.</p>
                        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                        <p>¡Gracias por confiar en TranSync!</p>
                    </div>
                    <div class="footer">
                        <p>TranSync &copy; 2025</p>
                        <p><a href="mailto:support@transync.com" style="color: #007bff;">support@transync.com</a></p>
                    </div>
                </div>
            </body>
            </html>
            `
        );

        res.json({ message: "Correo de restablecimiento enviado." });
    } catch (error) {
        console.error("Error en forgotPassword:", error);
        res.status(500).json({
            message: "Error en el servidor.",
            error: error.message
        });
    }
};

// RESET CONTRASEÑA
const resetPassword = async (req, res) => {
    const { token } = req.query;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: "Token y nueva contraseña son requeridos." });
    }

    if (!esPasswordSegura(newPassword)) {
        return res.status(400).json({
            message: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo."
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const [result] = await pool.query(
            "UPDATE Usuarios SET passwordHash = ? WHERE idUsuario = ?",
            [hashedPassword, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        res.json({ message: "Contraseña actualizada correctamente." });
    } catch (error) {
        console.error("Error en resetPassword:", error);
        res.status(400).json({ message: "Token inválido o expirado." });
    }
};
// LOGOUT
const logout = async (req, res) => {
    try {
        // En una implementación más robusta, podrías invalidar el token en una blacklist
        // Por ahora, solo devolvemos una respuesta exitosa
        res.json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    } catch (error) {
        console.error("Error en logout:", error);
        res.status(500).json({ message: "Error al cerrar sesión." });
    }
};

// OBTENER PERFIL DEL USUARIO
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT u.idUsuario, u.email, u.nomUsuario, u.apeUsuario, u.numDocUsuario, u.telUsuario,
                   r.nomRol as rol, e.nomEmpresa
            FROM Usuarios u
            JOIN Roles r ON u.idRol = r.idRol
            JOIN Empresas e ON u.idEmpresa = e.idEmpresa
            WHERE u.idUsuario = ?
        `;

        const [rows] = await pool.query(query, [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        res.json({
            success: true,
            user: {
                id: user.idUsuario,
                name: `${user.nomUsuario} ${user.apeUsuario}`.trim(),
                email: user.email,
                role: user.rol,
                empresa: user.nomEmpresa,
                idEmpresa: user.idEmpresa,
                numDocUsuario: user.numDocUsuario,
                telUsuario: user.telUsuario
            }
        });
    } catch (error) {
        console.error("Error al obtener perfil:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// VERIFICAR TOKEN
const verifyToken = async (req, res) => {
    try {
        // El middleware ya verificó el token, solo devolvemos la información del usuario
        const userId = req.user.id;

        const query = `
            SELECT u.idUsuario, u.email, u.nomUsuario, u.apeUsuario, u.numDocUsuario, u.telUsuario,
                   r.nomRol as rol, e.nomEmpresa
            FROM Usuarios u
            JOIN Roles r ON u.idRol = r.idRol
            JOIN Empresas e ON u.idEmpresa = e.idEmpresa
            WHERE u.idUsuario = ?
        `;

        const [rows] = await pool.query(query, [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        res.json({
            success: true,
            valid: true,
            user: {
                id: user.idUsuario,
                name: `${user.nomUsuario} ${user.apeUsuario}`.trim(),
                email: user.email,
                role: user.rol,
                empresa: user.nomEmpresa,
                idEmpresa: user.idEmpresa
            }
        });
    } catch (error) {
        console.error("Error al verificar token:", error);
        res.status(401).json({ message: "Token inválido." });
    }
};

// ACTUALIZAR PERFIL
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: "Nombre y email son requeridos." });
        }

        if (!apiUtils.isValidEmail(email)) {
            return res.status(400).json({ message: "Formato de email inválido." });
        }

        // Verificar si el email ya está en uso por otro usuario
        const [existingUser] = await pool.query(
            "SELECT idUsuario FROM Usuarios WHERE email = ? AND idUsuario != ?",
            [email, userId]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ message: "El email ya está en uso." });
        }

        // Actualizar perfil
        const [result] = await pool.query(
            "UPDATE Usuarios SET nomUsuario = ?, apeUsuario = ?, email = ? WHERE idUsuario = ?",
            [name.split(' ')[0], name.split(' ').slice(1).join(' '), email, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        res.json({
            success: true,
            message: "Perfil actualizado correctamente.",
            user: {
                id: userId,
                name: name,
                email: email
            }
        });
    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// CAMBIAR CONTRASEÑA
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "Todos los campos son requeridos." });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Las contraseñas no coinciden." });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres." });
        }

        // Obtener contraseña actual del usuario
        const [rows] = await pool.query(
            "SELECT passwordHash FROM Usuarios WHERE idUsuario = ?",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, rows[0].passwordHash);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: "La contraseña actual es incorrecta." });
        }

        // Hash de la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Actualizar contraseña
        const [result] = await pool.query(
            "UPDATE Usuarios SET passwordHash = ? WHERE idUsuario = ?",
            [hashedPassword, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        res.json({
            success: true,
            message: "Contraseña actualizada correctamente."
        });
    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// HEALTH CHECK
const healthCheck = async (req, res) => {
    try {
        // Verificar conexión a la base de datos
        await pool.query("SELECT 1");

        res.json({
            status: "OK",
            message: "Servidor funcionando correctamente",
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        console.error("Error en health check:", error);
        res.status(503).json({
            status: "ERROR",
            message: "Problemas de conexión con la base de datos",
            timestamp: new Date().toISOString()
        });
    }
};

// TEST EMAIL
const testEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email requerido para prueba" });
        }

        console.log(`🧪 Probando envío de email a: ${email}`);

        await sendEmail(
            email,
            "Prueba de Email - TranSync",
            `
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Prueba de Email - TranSync</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f9;
                    }
                    .email-container {
                        width: 100%;
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .email-header {
                        background-color: #28a745;
                        color: #ffffff;
                        padding: 20px;
                        text-align: center;
                    }
                    .email-header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .email-body {
                        padding: 30px;
                        color: #333333;
                    }
                    .email-body p {
                        font-size: 16px;
                        line-height: 1.6;
                    }
                    .success-message {
                        background-color: #d4edda;
                        color: #155724;
                        padding: 15px;
                        border-radius: 4px;
                        margin: 20px 0;
                        border: 1px solid #c3e6cb;
                    }
                    .footer {
                        text-align: center;
                        background-color: #f9f9f9;
                        padding: 20px;
                        color: #888888;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="email-header">
                        <h1>✅ Prueba de Email Exitosa</h1>
                    </div>
                    <div class="email-body">
                        <div class="success-message">
                            <strong>¡El servicio de email está funcionando correctamente!</strong>
                        </div>
                        <p>¡Hola!</p>
                        <p>Este es un email de prueba para verificar que el servicio de correo electrónico de TranSync esté funcionando correctamente.</p>
                        <p><strong>Información de la prueba:</strong></p>
                        <ul>
                            <li>📧 Email enviado desde: ${process.env.EMAIL_USER}</li>
                            <li>🕐 Fecha y hora: ${new Date().toLocaleString('es-CO')}</li>
                            <li>🌐 Servidor: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'Railway'}</li>
                            <li>⚙️ Entorno: ${process.env.NODE_ENV}</li>
                        </ul>
                        <p>Si recibiste este email, significa que:</p>
                        <ul>
                            <li>✅ La configuración de Gmail está correcta</li>
                            <li>✅ Los timeouts están configurados apropiadamente</li>
                            <li>✅ El servicio de email está operativo</li>
                            <li>✅ Los emails de verificación funcionarán</li>
                        </ul>
                        <p>¡Gracias por usar TranSync!</p>
                    </div>
                    <div class="footer">
                        <p>TranSync &copy; 2025</p>
                        <p><a href="mailto:support@transync.com" style="color: #007bff;">support@transync.com</a></p>
                    </div>
                </div>
            </body>
            </html>
            `
        );

        console.log(`✅ Email de prueba enviado exitosamente a: ${email}`);
        res.json({
            success: true,
            message: "Email de prueba enviado exitosamente",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ Error al enviar email de prueba:", error);
        res.status(500).json({
            success: false,
            message: "Error al enviar email de prueba",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// TEST EMAIL CON REINTENTOS
const testEmailWithRetries = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email requerido para prueba" });
        }

        console.log(`🧪 Probando envío de email con reintentos a: ${email}`);

        // Usar sendEmail directamente con reintentos
        await sendEmail(
            email,
            "Prueba de Email con Reintentos - TranSync",
            `
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Prueba de Email con Reintentos - TranSync</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f9;
                    }
                    .email-container {
                        width: 100%;
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .email-header {
                        background-color: #28a745;
                        color: #ffffff;
                        padding: 20px;
                        text-align: center;
                    }
                    .email-header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .email-body {
                        padding: 30px;
                        color: #333333;
                    }
                    .email-body p {
                        font-size: 16px;
                        line-height: 1.6;
                    }
                    .success-message {
                        background-color: #d4edda;
                        color: #155724;
                        padding: 15px;
                        border-radius: 4px;
                        margin: 20px 0;
                        border: 1px solid #c3e6cb;
                    }
                    .retry-info {
                        background-color: #fff3cd;
                        color: #856404;
                        padding: 15px;
                        border-radius: 4px;
                        margin: 20px 0;
                        border: 1px solid #ffeaa7;
                    }
                    .footer {
                        text-align: center;
                        background-color: #f9f9f9;
                        padding: 20px;
                        color: #888888;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="email-header">
                        <h1>✅ Prueba de Email con Reintentos Exitosa</h1>
                    </div>
                    <div class="email-body">
                        <div class="success-message">
                            <strong>¡El servicio de email con reintentos está funcionando!</strong>
                        </div>
                        <div class="retry-info">
                            <strong>🔄 Sistema de Reintentos:</strong>
                            <ul>
                                <li>⏰ Timeouts extendidos: 90 segundos</li>
                                <li>🔄 Máximo 3 reintentos automáticos</li>
                                <li>📈 Backoff exponencial entre reintentos</li>
                                <li>🌐 Configuración SMTP optimizada</li>
                            </ul>
                        </div>
                        <p>¡Hola!</p>
                        <p>Este es un email de prueba para verificar que el servicio de correo electrónico con reintentos automáticos esté funcionando correctamente.</p>
                        <p><strong>Información de la prueba:</strong></p>
                        <ul>
                            <li>📧 Email enviado desde: ${process.env.EMAIL_USER}</li>
                            <li>🕐 Fecha y hora: ${new Date().toLocaleString('es-CO')}</li>
                            <li>🌐 Servidor: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'Railway'}</li>
                            <li>⚙️ Entorno: ${process.env.NODE_ENV}</li>
                            <li>🔄 Reintentos configurados: Sí</li>
                        </ul>
                        <p>Si recibiste este email, significa que:</p>
                        <ul>
                            <li>✅ La configuración SMTP está correcta</li>
                            <li>✅ Los timeouts extendidos funcionan</li>
                            <li>✅ El sistema de reintentos está operativo</li>
                            <li>✅ Los emails de verificación funcionarán</li>
                        </ul>
                        <p>¡Gracias por usar TranSync!</p>
                    </div>
                    <div class="footer">
                        <p>TranSync &copy; 2025</p>
                        <p><a href="mailto:support@transync.com" style="color: #007bff;">support@transync.com</a></p>
                    </div>
                </div>
            </body>
            </html>
            `,
            90000, // 90 segundos timeout
            3 // 3 reintentos
        );

        console.log(`✅ Email de prueba con reintentos enviado exitosamente a: ${email}`);
        res.json({
            success: true,
            message: "Email de prueba con reintentos enviado exitosamente",
            timestamp: new Date().toISOString(),
            config: {
                timeout: 90000,
                retries: 3,
                backoff: "exponencial"
            }
        });

    } catch (error) {
        console.error("❌ Error al enviar email de prueba con reintentos:", error);
        res.status(500).json({
            success: false,
            message: "Error al enviar email de prueba con reintentos",
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
        });
    }
};

// VALIDACION DE CONTRASEÑA SEGURA
function esPasswordSegura(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(password);
}

module.exports = {
    register,
    login,
    verifyAccount,
    forgotPassword,
    resetPassword,
    logout,
    getProfile,
    verifyToken,
    updateProfile,
    changePassword,
    healthCheck,
    testEmail,
    testEmailWithRetries,
    esPasswordSegura
};