// src/utils/emailService.js

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "Gmail", 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // Configuración de timeout
    connectionTimeout: 10000, // 10 segundos
    greetingTimeout: 5000,    // 5 segundos
    socketTimeout: 15000,     // 15 segundos
});

/**
 * Envía un correo electrónico con timeout y manejo de errores
 * @param {string} to - Correo del destinatario
 * @param {string} subject - Asunto del correo
 * @param {string} html - Contenido en HTML
 * @param {number} timeout - Timeout en milisegundos (default: 15000)
 */
const sendEmail = async (to, subject, html, timeout = 15000) => {
    return new Promise((resolve, reject) => {
        // Timeout personalizado
        const timeoutId = setTimeout(() => {
            reject(new Error('Email timeout: El envío de email excedió el tiempo límite'));
        }, timeout);

        transporter.sendMail({
            from: `"Transync" <${process.env.EMAIL_USER}>`,
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
            reject(error);
        });
    });
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
            await sendEmail(to, subject, html, 10000); // 10 segundos timeout
            console.log(`✅ Email enviado exitosamente a: ${to}`);
        } catch (error) {
            console.error(`❌ Error enviando email a ${to}:`, error.message);
            // No lanzar error para no afectar el flujo principal
        }
    });
};

module.exports = {
    sendEmail,
    sendEmailAsync,
};
