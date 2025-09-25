// src/utils/emailService.js

const nodemailer = require("nodemailer");
const sgMail = require('@sendgrid/mail');

let transporter = null;
let sendgridConfigured = false;

const createTransporter = () => {
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.your_actual_sendgrid_api_key_here') {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        sendgridConfigured = true;
        console.log('Usando el servicio de SendGrid para envío de correos de confirmacion.');
        return null;
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('EMAIL_USER y EMAIL_PASS son requeridos para el envío de correos');
    }

    return nodemailer.createTransporter({
        service: "Gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        pool: true, 
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000, 
        rateLimit: 5, 
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
    console.log('Servicie de email configurado correctamente');
    if (sendgridConfigured) {
        console.log('📧 Usando SendGrid para envío de correos.');
    } else if (transporter) {
        console.log('Usando Gmail para envío de correos solucion alternativa');
    } else {
        console.log('Email service configurado pero sin proveedor activo');
    }
} catch (error) {
    console.error('Error al configurar email service:', error.message);
}

/**
 * Envía un correo electrónico con reintentos automáticos
 * @param {string} to - 
 * @param {string} subject - 
 * @param {string} html - 
 * @param {number} maxRetries 
 */
const sendEmail = async (to, subject, html, maxRetries = 3) => {
    if (sendgridConfigured) {
        return await sendEmailWithSendGrid(to, subject, html, maxRetries);
    }
    if (!transporter) {
        throw new Error('Email service no está configurado correctamente');
    }

    return await sendEmailWithGmail(to, subject, html, maxRetries);
};


const sendEmailWithSendGrid = async (to, subject, html, maxRetries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Intentando enviar correo con el servicio de SendGrid (intento ${attempt}/${maxRetries}) a: ${to}`);

            const msg = {
                to,
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@transync.com',
                subject,
                html,
            };
            const response = await sgMail.send(msg);
            console.log(`Correo enviado exitosamente con SendGrid a ${to} - Status: ${response[0].statusCode}`);

            return {
                messageId: response[0].headers['x-message-id'],
                accepted: [to],
                rejected: [],
                statusCode: response[0].statusCode
            };

        } catch (error) {
            lastError = error;
            console.error(`Error al enviar correo con SendGrid (intento ${attempt}/${maxRetries}):`, error.message);

            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; 
                console.log(`Reintentando con SendGrid en ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.error(`Falló el envío de correo con SendGrid después de ${maxRetries} intentos a: ${to}`);
    throw new Error(`Error al enviar correo con SendGrid después de ${maxRetries} intentos: ${lastError.message}`);
};

/**
 * Envía correo usando Gmail (fallback)
 */
const sendEmailWithGmail = async (to, subject, html, maxRetries = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Intentando enviar correo con Gmail (intento ${attempt}/${maxRetries}) a: ${to}`);

            const mailOptions = {
                from: `"TranSync" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html,
            };
            const info = await transporter.sendMail(mailOptions);

            console.log(`Correo enviado exitosamente con Gmail a ${to} - MessageId: ${info.messageId}`);
            if (process.env.NODE_ENV === 'production') {
                console.log(`📊 Email enviado - ID: ${info.messageId}, Accepted: ${info.accepted}, Rejected: ${info.rejected}`);
            }
            return info;
        } catch (error) {
            lastError = error;
            console.error(`Error al enviar correo con Gmail (intento ${attempt}/${maxRetries}):`, error.message);
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; 
                console.log(`⏳ Reintentando con Gmail en ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    console.error(`💀 Falló el envío de correo con Gmail después de ${maxRetries} intentos a: ${to}`);
    console.error('Último error:', lastError.message);

    throw new Error(`Error al enviar correo con Gmail después de ${maxRetries} intentos: ${lastError.message}`);
};
/**
 * Verifica la configuración del servicio de email
 */
const verifyEmailConfig = async () => {
    if (sendgridConfigured) {
        try {
            console.log('Configuración de SendGrid verificada correctamente');
            return true;
        } catch (error) {
            console.error('Error en verificación de SendGrid config:', error.message);
            return false;
        }
    }
    // Verificar Gmail si está configurado
    if (!transporter) {
        throw new Error('Email service no está configurado');
    }

    try {
        await transporter.verify();
        console.log('Configuración de Gmail verificada correctamente');
        return true;
    } catch (error) {
        console.error('Error en verificación de Gmail config:', error.message);
        return false;
    }
};

module.exports = {
    sendEmail,
    verifyEmailConfig,
    createTransporter
};
