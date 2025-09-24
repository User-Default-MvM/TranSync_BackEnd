// src/utils/emailService.js

const nodemailer = require("nodemailer");

// Configuración optimizada para Railway usando SendGrid
const createTransporter = () => {
    // Verificar si tenemos API key de SendGrid
    if (process.env.SENDGRID_API_KEY) {
        console.log('🚀 Usando SendGrid para envío de emails...');
        return nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false, // SendGrid usa STARTTLS
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            },
            // Configuración optimizada para SendGrid
            connectionTimeout: 60000,
            greetingTimeout: 30000,
            socketTimeout: 120000,
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            },
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            rateDelta: 1000,
            rateLimit: 5
        });
    }

    // Fallback a Gmail si no hay SendGrid
    console.log('📧 Usando Gmail SMTP como fallback...');
    const config = {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // Configuración ultra permisiva para Railway
        connectionTimeout: 180000,
        greetingTimeout: 90000,
        socketTimeout: 300000,
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false
        },
        pool: true,
        maxConnections: 1,
        maxMessages: 1,
        rateDelta: 5000,
        rateLimit: 1,
        retry: {
            maxRetries: 5,
            initialDelay: 10000
        },
        keepAlive: true,
        keepAliveTimeout: 60000,
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
    };

    return nodemailer.createTransport(config);
};

const transporter = createTransporter();

// Configuración de SendGrid SMTP (más confiable que Gmail)
const sendEmailWithSendGrid = async (to, subject, html) => {
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'SG.your_sendgrid_api_key_here') {
        throw new Error('SendGrid API key no configurada');
    }

    // Crear transporter específico para SendGrid
    const sendGridTransporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false, // SendGrid usa STARTTLS
        auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
        },
        // Configuración optimizada para SendGrid
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 60000,
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5
    });

    try {
        const result = await sendGridTransporter.sendMail({
            from: `"TranSync" <${process.env.EMAIL_USER || 'noreply@transync.com'}>`,
            to,
            subject,
            html,
        });

        console.log(`✅ Email enviado con SendGrid SMTP a: ${to}`);
        return result;
    } catch (error) {
        console.error('❌ Error con SendGrid SMTP:', error.message);
        throw error;
    }
};

/**
 * Envía un correo electrónico con timeout, reintentos y manejo de errores
 * @param {string} to - Correo del destinatario
 * @param {string} subject - Asunto del correo
 * @param {string} html - Contenido en HTML
 * @param {number} timeout - Timeout en milisegundos (default: 90000)
 * @param {number} retries - Número de reintentos (default: 3)
 */
const sendEmail = async (to, subject, html, timeout = 240000, retries = 3) => {
    let lastError;

    // Intentar primero con SendGrid Web API (más confiable)
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.your_sendgrid_api_key_here') {
        try {
            console.log(`🚀 Intentando con SendGrid Web API para: ${to}`);
            const result = await sendEmailWithSendGrid(to, subject, html);
            return result;
        } catch (error) {
            console.log(`⚠️ SendGrid Web API falló: ${error.message}`);
            lastError = error;
        }
    }

    // Fallback a SMTP con reintentos
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`📧 Intento SMTP ${attempt}/${retries} de envío de email a ${to}`);

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
                    console.error(`❌ Error en intento SMTP ${attempt} al enviar email:`, {
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

            console.log(`✅ Email enviado exitosamente con SMTP en intento ${attempt} a ${to}`);
            return result;

        } catch (error) {
            lastError = error;
            console.log(`⚠️ Intento SMTP ${attempt} falló: ${error.message}`);

            // Si no es el último intento, esperar antes de reintentar
            if (attempt < retries) {
                const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000); // Backoff exponencial
                console.log(`⏳ Esperando ${delay}ms antes del siguiente intento SMTP...`);
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
        totalAttempts: retries,
        sendGridAvailable: !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.your_sendgrid_api_key_here')
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
            await sendEmail(to, subject, html, 180000); // 180 segundos timeout
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
