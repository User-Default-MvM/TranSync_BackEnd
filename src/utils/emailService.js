// src/utils/emailService.js

const nodemailer = require("nodemailer");

// Configuración del transporter con mejor manejo de errores
let transporter = null;

const createTransporter = () => {
    // Si hay SendGrid API key, usarlo (más confiable para producción)
    if (process.env.SENDGRID_API_KEY) {
        const sgTransport = require('nodemailer-sendgrid-transport');
        return nodemailer.createTransporter(sgTransport({
            auth: {
                api_key: process.env.SENDGRID_API_KEY
            }
        }));
    }

    // Si no hay SendGrid, usar Gmail con configuración mejorada
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('EMAIL_USER y EMAIL_PASS son requeridos para el envío de correos');
    }

    return nodemailer.createTransporter({
        service: "Gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // Configuración adicional para mejor confiabilidad
        pool: true, // Usar pool de conexiones
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000, // 1 segundo entre mensajes
        rateLimit: 5, // 5 mensajes por segundo
        // Configuración de reintentos
        retry: {
            maxRetries: 3,
            initialDelay: 1000,
            backoffMultiplier: 2
        }
    });
};

// Inicializar transporter
try {
    transporter = createTransporter();
    console.log('✅ Email service configurado correctamente');
    if (process.env.SENDGRID_API_KEY) {
        console.log('📧 Usando SendGrid para envío de correos');
    } else {
        console.log('📧 Usando Gmail para envío de correos');
    }
} catch (error) {
    console.error('❌ Error al configurar email service:', error.message);
}

/**
 * Envía un correo electrónico con reintentos automáticos
 * @param {string} to - Correo del destinatario
 * @param {string} subject - Asunto del correo
 * @param {string} html - Contenido en HTML
 * @param {number} maxRetries - Número máximo de reintentos (default: 3)
 */
const sendEmail = async (to, subject, html, maxRetries = 3) => {
    if (!transporter) {
        throw new Error('Email service no está configurado correctamente');
    }

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📤 Intentando enviar correo (intento ${attempt}/${maxRetries}) a: ${to}`);

            const mailOptions = {
                from: `"TranSync" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html,
            };

            const info = await transporter.sendMail(mailOptions);

            console.log(`✅ Correo enviado exitosamente a ${to} - MessageId: ${info.messageId}`);

            // Log adicional para debugging
            if (process.env.NODE_ENV === 'production') {
                console.log(`📊 Email enviado - ID: ${info.messageId}, Accepted: ${info.accepted}, Rejected: ${info.rejected}`);
            }

            return info;

        } catch (error) {
            lastError = error;
            console.error(`❌ Error al enviar correo (intento ${attempt}/${maxRetries}):`, error.message);

            // Si no es el último intento, esperar antes de reintentar
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial
                console.log(`⏳ Reintentando en ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // Si llegamos aquí, todos los intentos fallaron
    console.error(`💀 Falló el envío de correo después de ${maxRetries} intentos a: ${to}`);
    console.error('Último error:', lastError.message);

    throw new Error(`Error al enviar correo después de ${maxRetries} intentos: ${lastError.message}`);
};

/**
 * Verifica la configuración del servicio de email
 */
const verifyEmailConfig = async () => {
    if (!transporter) {
        throw new Error('Email service no está configurado');
    }

    try {
        await transporter.verify();
        console.log('✅ Configuración de email verificada correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error en verificación de email config:', error.message);
        return false;
    }
};

module.exports = {
    sendEmail,
    verifyEmailConfig,
    createTransporter
};
