// src/utils/emailService.js

const nodemailer = require("nodemailer");

// Configuración alternativa para conexiones lentas
const createTransporter = () => {
    // Intentar con configuración SMTP directa primero
    const config = {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // Configuración de timeout más permisiva para conexiones lentas
        connectionTimeout: 60000,  // 60 segundos
        greetingTimeout: 30000,    // 30 segundos
        socketTimeout: 120000,     // 120 segundos
        // Configuración adicional para conexiones lentas
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false
        },
        // Configuración para manejar conexiones lentas
        pool: true,
        maxConnections: 1,
        maxMessages: 1,
        rateDelta: 2000,
        rateLimit: 1,
        // Reintentos automáticos
        retry: {
            maxRetries: 3,
            initialDelay: 5000
        }
    };

    return nodemailer.createTransport(config);
};

const transporter = createTransporter();

/**
 * Envía un correo electrónico con timeout, reintentos y manejo de errores
 * @param {string} to - Correo del destinatario
 * @param {string} subject - Asunto del correo
 * @param {string} html - Contenido en HTML
 * @param {number} timeout - Timeout en milisegundos (default: 90000)
 * @param {number} retries - Número de reintentos (default: 3)
 */
const sendEmail = async (to, subject, html, timeout = 90000, retries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`📧 Intento ${attempt}/${retries} de envío de email a ${to}`);

            const result = await new Promise((resolve, reject) => {
                // Timeout personalizado
                const timeoutId = setTimeout(() => {
                    reject(new Error('Email timeout: El envío de email excedió el tiempo límite'));
                }, timeout);

                transporter.sendMail({
                    from: `"TranSync" <${process.env.EMAIL_USER}>`,
                    to,
                    subject,
                    html,
                })
                .then((result) => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch((error) => {
                    clearTimeout(timeoutId);
                    console.error(`❌ Error en intento ${attempt} al enviar email:`, {
                        to,
                        subject,
                        error: error.message,
                        code: error.code,
                        attempt,
                        stack: error.stack
                    });
                    reject(error);
                });
            });

            console.log(`✅ Email enviado exitosamente en intento ${attempt} a ${to}`);
            return result;

        } catch (error) {
            lastError = error;
            console.log(`⚠️ Intento ${attempt} falló: ${error.message}`);

            // Si no es el último intento, esperar antes de reintentar
            if (attempt < retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Backoff exponencial
                console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // Si todos los intentos fallaron
    console.error("❌ Todos los intentos de envío de email fallaron:", {
        to,
        subject,
        finalError: lastError.message,
        code: lastError.code,
        totalAttempts: retries
    });
    throw lastError;
};

/**
 * Envía un correo electrónico de forma asíncrona (no bloquea la respuesta)
 * @param {string} to - Correo del destinatario
 * @param {string} subject - Asunto del correo
 * @param {string} html - Contenido en HTML
 */
const sendEmailAsync = (to, subject, html) => {
    // Enviar email en background sin bloquear
    setImmediate(async () => {
        try {
            await sendEmail(to, subject, html, 60000); // 60 segundos timeout
            console.log(`✅ Email enviado exitosamente a: ${to}`);
        } catch (error) {
            console.error(`❌ Error enviando email a ${to}:`, {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            // No lanzar error para no afectar el flujo principal
        }
    });
};

module.exports = {
    sendEmail,
    sendEmailAsync,
};
