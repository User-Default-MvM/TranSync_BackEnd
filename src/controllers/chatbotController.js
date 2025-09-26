// src/controllers/chatbotController.js

const pool = require('../config/db');
const nlpProcessor = require('../utils/nlpProcessor');
const conversationMemory = require('../utils/conversationMemory');
const queryEngine = require('../utils/queryEngine');
const cacheService = require('../utils/cacheService');

/**
 * Procesar consulta del chatbot con procesamiento inteligente avanzado
 */
const procesarConsulta = async (req, res) => {
    const startTime = Date.now();

    try {
        const { mensaje, idEmpresa = 1, idUsuario = null } = req.body;

        if (!mensaje || mensaje.trim() === '') {
            return res.status(400).json({
                message: 'El mensaje es requerido',
                respuesta: 'Por favor, escribe tu consulta.'
            });
        }

        // Procesamiento inteligente del mensaje
        const nlpAnalysis = nlpProcessor.processMessage(mensaje);
        const conversationContext = conversationMemory.getRelevantContext(idUsuario, mensaje, idEmpresa);
        const smartQuery = queryEngine.generateQuery(
            nlpAnalysis.semanticAnalysis.intent,
            nlpAnalysis.entities,
            nlpAnalysis.context,
            { idUsuario, idEmpresa }
        );

        // Ejecutar consulta con cache inteligente
        let resultado;
        if (smartQuery.sql) {
            resultado = await cacheService.getWithCache(
                smartQuery.sql,
                smartQuery.params,
                { idUsuario, idEmpresa },
                async () => {
                    const [rows] = await pool.query(smartQuery.sql, smartQuery.params);
                    return rows;
                }
            );
        }

        // Generar respuesta inteligente
        const respuestaInteligente = await generateIntelligentResponse(
            nlpAnalysis,
            resultado,
            conversationContext,
            smartQuery
        );

        // Registrar en memoria de conversación
        conversationMemory.addMessage(idUsuario, {
            text: mensaje,
            sender: 'user',
            intent: nlpAnalysis.semanticAnalysis.intent,
            entities: nlpAnalysis.entities,
            success: true
        }, idEmpresa);

        conversationMemory.addMessage(idUsuario, {
            text: respuestaInteligente.respuesta,
            sender: 'bot',
            intent: nlpAnalysis.semanticAnalysis.intent,
            success: true
        }, idEmpresa);

        // Calcular indicadores de confianza
        const confianza = calculateConfidenceIndicator(nlpAnalysis, smartQuery, resultado);

        res.json({
            success: true,
            respuesta: respuestaInteligente.respuesta,
            intencion: nlpAnalysis.semanticAnalysis.intent,
            confianza: confianza,
            tiempoProcesamiento: Date.now() - startTime,
            sugerencias: conversationMemory.getSuggestions(idUsuario, idEmpresa),
            metadata: {
                entitiesEncontradas: Object.keys(nlpAnalysis.entities).filter(key =>
                    nlpAnalysis.entities[key] && nlpAnalysis.entities[key].length > 0
                ),
                complejidadConsulta: smartQuery.complexity || 1,
                consultaSQL: smartQuery.sql ? 'Generada automáticamente' : 'No requerida'
            }
        });

    } catch (error) {
        console.error('Error en procesarConsulta:', error);

        // Registrar error en memoria
        if (idUsuario) {
            conversationMemory.addMessage(idUsuario, {
                text: mensaje,
                sender: 'user',
                intent: 'error',
                success: false
            }, idEmpresa);

            conversationMemory.addMessage(idUsuario, {
                text: 'Lo siento, ocurrió un error procesando tu consulta.',
                sender: 'bot',
                intent: 'error',
                success: false
            }, idEmpresa);
        }

        res.status(500).json({
            message: 'Error del servidor',
            respuesta: 'Lo siento, ocurrió un error procesando tu consulta. Por favor intenta de nuevo.',
            tiempoProcesamiento: Date.now() - startTime
        });
    }
};

/**
 * Generar respuesta inteligente basada en análisis NLP y datos
 */
async function generateIntelligentResponse(nlpAnalysis, queryResult, conversationContext, smartQuery) {
    try {
        const { intent, confidence } = nlpAnalysis.semanticAnalysis;
        const entities = nlpAnalysis.entities;

        // Si la confianza es baja, usar respuesta genérica
        if (confidence < 0.3) {
            return {
                respuesta: generateFallbackResponse(intent, entities),
                tipo: 'fallback'
            };
        }

        // Generar respuesta basada en intención y resultados
        let respuesta;

        switch (intent) {
            case 'count_driver':
            case 'count_vehicle':
                respuesta = await generateCountResponse(intent, queryResult, entities);
                break;

            case 'list_vehicle':
            case 'list_route':
            case 'list_schedule':
                respuesta = await generateListResponse(intent, queryResult, entities);
                break;

            case 'license_expiry':
                respuesta = await generateLicenseExpiryResponse(queryResult);
                break;

            case 'vehicle_maintenance':
                respuesta = await generateMaintenanceResponse(queryResult);
                break;

            case 'system_status':
                respuesta = await generateSystemStatusResponse(queryResult);
                break;

            case 'alerts':
            case 'expiry_alerts':
                respuesta = await generateAlertsResponse(queryResult);
                break;

            case 'greeting':
                respuesta = generateGreetingResponse(conversationContext);
                break;

            case 'help':
                respuesta = generateHelpResponse();
                break;

            case 'farewell':
                respuesta = generateFarewellResponse();
                break;

            default:
                respuesta = generateDefaultResponse(intent, queryResult, entities);
                break;
        }

        return {
            respuesta: respuesta,
            tipo: intent,
            fuente: queryResult ? 'database' : 'generated'
        };

    } catch (error) {
        console.error('Error generando respuesta inteligente:', error);
        return {
            respuesta: 'Lo siento, tuve un problema generando la respuesta. ¿Puedes reformular tu consulta?',
            tipo: 'error'
        };
    }
}

/**
 * Calcular indicador de confianza para la respuesta
 */
function calculateConfidenceIndicator(nlpAnalysis, smartQuery, queryResult) {
    let confidence = nlpAnalysis.semanticAnalysis.confidence || 0.5;

    // Aumentar confianza si se generó una consulta SQL válida
    if (smartQuery.sql) confidence += 0.2;

    // Aumentar confianza si se obtuvieron resultados
    if (queryResult && queryResult.length > 0) confidence += 0.1;

    // Aumentar confianza si hay entidades reconocidas
    const entitiesCount = Object.values(nlpAnalysis.entities).reduce((sum, arr) => sum + arr.length, 0);
    confidence += Math.min(entitiesCount * 0.05, 0.2);

    return Math.min(confidence, 0.95);
}

/**
 * Generar respuesta para consultas de conteo
 */
async function generateCountResponse(intent, queryResult, entities) {
    if (!queryResult || queryResult.length === 0) {
        return 'No pude obtener la información solicitada. Verifica tu conexión.';
    }

    const count = queryResult[0].total || 0;
    const entityType = intent.includes('driver') ? 'conductores' : 'vehículos';

    let respuesta = `📊 **${count} ${entityType}** encontrados`;

    // Agregar contexto adicional
    if (entities.locations && entities.locations.length > 0) {
        respuesta += ` en ${entities.locations[0]}`;
    }

    if (entities.temporalExpressions && entities.temporalExpressions.length > 0) {
        respuesta += ` para ${entities.temporalExpressions[0]}`;
    }

    return respuesta;
}

/**
 * Generar respuesta para consultas de lista
 */
async function generateListResponse(intent, queryResult, entities) {
    if (!queryResult || queryResult.length === 0) {
        return 'No encontré registros que coincidan con tu consulta.';
    }

    const maxItems = 10;
    const items = queryResult.slice(0, maxItems);
    const entityType = intent.replace('list_', '');

    let respuesta = `📋 **${items.length} ${entityType}(s) encontrado(s):**\n\n`;

    items.forEach((item, index) => {
        respuesta += `${index + 1}. `;

        switch (intent) {
            case 'list_vehicle':
                respuesta += `🚗 ${item.plaVehiculo || 'Sin placa'} - ${item.modVehiculo || 'Sin modelo'} (${item.estVehiculo || 'Sin estado'})`;
                break;
            case 'list_route':
                respuesta += `🛣️ ${item.nomRuta || 'Sin nombre'} - ${item.oriRuta || 'Origen'} → ${item.desRuta || 'Destino'}`;
                break;
            case 'list_schedule':
                respuesta += `⏰ ${item.fecHorSalViaje || 'Sin horario'} - ${item.estViaje || 'Sin estado'}`;
                break;
            default:
                respuesta += JSON.stringify(item);
        }

        respuesta += '\n';
    });

    if (queryResult.length > maxItems) {
        respuesta += `\n... y ${queryResult.length - maxItems} más.`;
    }

    return respuesta;
}

/**
 * Generar respuesta para vencimientos de licencias
 */
async function generateLicenseExpiryResponse(queryResult) {
    if (!queryResult || queryResult.length === 0) {
        return '✅ ¡Excelente! No hay licencias próximas a vencer en los próximos 30 días.';
    }

    const count = queryResult.length;
    let respuesta = `⚠️ **${count} licencia(s) próxima(s) a vencer:**\n\n`;

    queryResult.forEach((item, index) => {
        const nombre = `${item.nomConductor || 'Sin nombre'} ${item.apeConductor || ''}`.trim();
        const fecha = item.fecVenLicConductor ? new Date(item.fecVenLicConductor).toLocaleDateString('es-ES') : 'Sin fecha';

        respuesta += `${index + 1}. 👨‍💼 ${nombre}\n`;
        respuesta += `   📅 Vence: ${fecha}\n`;
        respuesta += `   🔢 Licencia: ${item.numLicConductor || 'Sin número'}\n\n`;
    });

    respuesta += 'Recuerda renovar estas licencias antes de la fecha de vencimiento.';

    return respuesta;
}

/**
 * Generar respuesta para vehículos en mantenimiento
 */
async function generateMaintenanceResponse(queryResult) {
    if (!queryResult || queryResult.length === 0) {
        return '✅ No hay vehículos en mantenimiento actualmente.';
    }

    const count = queryResult.length;
    let respuesta = `🔧 **${count} vehículo(s) en mantenimiento:**\n\n`;

    queryResult.forEach((item, index) => {
        respuesta += `${index + 1}. 🚗 ${item.plaVehiculo || 'Sin placa'} - ${item.modVehiculo || 'Sin modelo'}\n`;
        respuesta += `   📅 SOAT: ${item.fecVenSOAT ? new Date(item.fecVenSOAT).toLocaleDateString('es-ES') : 'N/A'}\n`;
        respuesta += `   📅 Técnico: ${item.fecVenTec ? new Date(item.fecVenTec).toLocaleDateString('es-ES') : 'N/A'}\n\n`;
    });

    return respuesta;
}

/**
 * Generar respuesta para estado del sistema
 */
async function generateSystemStatusResponse(queryResult) {
    if (!queryResult || queryResult.length === 0) {
        return '📊 No pude obtener el estado actual del sistema.';
    }

    const stats = queryResult[0];
    let respuesta = `📊 **Estado General del Sistema:**\n\n`;
    respuesta += `👨‍💼 **Conductores activos:** ${stats.conductoresActivos || 0}\n`;
    respuesta += `🚗 **Vehículos disponibles:** ${stats.vehiculosDisponibles || 0}\n`;
    respuesta += `🔄 **Viajes en curso:** ${stats.viajesEnCurso || 0}\n\n`;

    // Determinar estado general
    const totalElements = (stats.conductoresActivos || 0) + (stats.vehiculosDisponibles || 0);
    if (totalElements > 10) {
        respuesta += '🟢 **Estado:** Excelente - Sistema funcionando óptimamente';
    } else if (totalElements > 5) {
        respuesta += '🟡 **Estado:** Bueno - Operaciones normales';
    } else {
        respuesta += '🔴 **Estado:** Atención requerida - Revisar recursos disponibles';
    }

    return respuesta;
}

/**
 * Generar respuesta para alertas de vencimientos
 */
async function generateAlertsResponse(queryResult) {
    if (!queryResult || queryResult.length === 0) {
        return '✅ ¡Excelente! No hay alertas de vencimientos pendientes.';
    }

    let respuesta = `⚠️ **Alertas de Vencimientos Pendientes:**\n\n`;

    queryResult.forEach((alerta, index) => {
        respuesta += `${index + 1}. 📋 **${alerta.tipoDocumento.replace('_', ' ')}**\n`;
        respuesta += `   📝 ${alerta.descripciones || 'Sin descripción'}\n`;
        respuesta += `   🔢 Total: ${alerta.totalAlertas} alerta(s)\n\n`;
    });

    respuesta += 'Te recomiendo revisar y renovar estos documentos antes de la fecha de vencimiento.';

    return respuesta;
}

/**
 * Generar respuesta de saludo contextual
 */
function generateGreetingResponse(conversationContext) {
    const greetings = [
        '¡Hola! Soy tu asistente inteligente de TransSync. ¿En qué puedo ayudarte hoy?',
        '¡Buenos días! Estoy aquí para ayudarte con información sobre tu flota. ¿Qué necesitas saber?',
        '¡Saludos! ¿Qué información del sistema TransSync te gustaría consultar?'
    ];

    let greeting = greetings[Math.floor(Math.random() * greetings.length)];

    // Personalizar basado en contexto de conversación
    if (conversationContext.recentMessages && conversationContext.recentMessages.length > 0) {
        greeting += '\n\nVeo que has estado consultando información recientemente. ¿Necesitas más detalles sobre algo específico?';
    }

    return greeting;
}

/**
 * Generar respuesta de ayuda
 */
function generateHelpResponse() {
    return `🔧 **¿En qué puedo ayudarte?**\n\nPuedo proporcionarte información inteligente sobre:\n\n🚗 **Vehículos:** Estado, disponibilidad, mantenimiento\n👨‍💼 **Conductores:** Disponibilidad, licencias, asignaciones\n📍 **Rutas:** Recorridos registrados y programación\n⏰ **Horarios:** Viajes programados y en curso\n📊 **Sistema:** Estado general y estadísticas\n⚠️ **Vencimientos:** Alertas de documentos próximos a vencer\n📋 **Dashboard:** Resumen operacional y reportes\n\n**Ejemplos de consultas inteligentes:**\n• "¿Cuántos conductores activos hay?"\n• "¿Qué vehículos están disponibles?"\n• "¿Hay licencias por vencer?"\n• "¿Cuál es el estado general del sistema?"\n• "Muéstrame las rutas disponibles"\n• "¿Hay alertas de vencimientos?"\n• "¿Cuál es el resumen del dashboard?"\n\n¡Solo escribe tu consulta de forma natural!`;
}

/**
 * Generar respuesta de despedida
 */
function generateFarewellResponse() {
    const farewells = [
        '¡Hasta luego! Estaré aquí cuando necesites información del sistema TransSync.',
        '¡Perfecto! No dudes en consultarme cuando requieras datos actualizados.',
        '¡Adiós! Recuerda que estoy disponible 24/7 para ayudarte con tu flota.'
    ];

    return farewells[Math.floor(Math.random() * farewells.length)];
}

/**
 * Generar respuesta por defecto
 */
function generateDefaultResponse(intent, queryResult, entities) {
    if (queryResult && queryResult.length > 0) {
        return `📋 Encontré ${queryResult.length} resultado(s) para tu consulta sobre ${intent}.`;
    }

    return `🤔 Procesé tu consulta sobre ${intent}. ¿Puedes darme más detalles para ayudarte mejor?`;
}

/**
 * Generar respuesta fallback para baja confianza
 */
function generateFallbackResponse(intent, entities) {
    const suggestions = [
        '¿Puedes ser más específico? Por ejemplo: "¿Cuántos conductores están activos?"',
        'Intenta reformular tu consulta. Puedo ayudarte con información sobre conductores, vehículos, rutas, etc.',
        'No entendí completamente. ¿Te refieres al estado de los vehículos o conductores?'
    ];

    return suggestions[Math.floor(Math.random() * suggestions.length)];
}



/**
 * Registrar interacción para análisis posterior
 */
async function registrarInteraccion(mensaje, respuesta, idEmpresa, idUsuario) {
    try {
        // Crear tabla de interacciones si no existe (opcional)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS InteraccionesChatbot (
                idInteraccion INT AUTO_INCREMENT PRIMARY KEY,
                mensaje TEXT NOT NULL,
                respuesta TEXT NOT NULL,
                idEmpresa INT,
                idUsuario INT NULL,
                fechaInteraccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_empresa (idEmpresa),
                INDEX idx_fecha (fechaInteraccion)
            )
        `);

        await pool.query(`
            INSERT INTO InteraccionesChatbot (mensaje, respuesta, idEmpresa, idUsuario)
            VALUES (?, ?, ?, ?)
        `, [mensaje, respuesta, idEmpresa, idUsuario]);

    } catch (error) {
        // No fallar si no se puede registrar la interacción
        console.log('No se pudo registrar la interacción:', error.message);
    }
}

/**
 * Obtener estadísticas de uso del chatbot
 */
const getEstadisticasChatbot = async (req, res) => {
    try {
        const { idEmpresa = 1, dias = 30 } = req.query;

        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as totalInteracciones,
                COUNT(DISTINCT DATE(fechaInteraccion)) as diasActivos,
                AVG(CHAR_LENGTH(mensaje)) as promedioLongitudMensaje,
                DATE(fechaInteraccion) as fecha,
                COUNT(*) as interaccionesPorDia
            FROM InteraccionesChatbot 
            WHERE idEmpresa = ? 
            AND fechaInteraccion >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(fechaInteraccion)
            ORDER BY fecha DESC
        `, [idEmpresa, dias]);

        res.json({
            success: true,
            estadisticas: stats,
            periodo: `${dias} días`
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas del chatbot:', error);
        res.status(500).json({ 
            message: 'Error obteniendo estadísticas',
            estadisticas: []
        });
    }
};

/**
 * Obtener estadísticas de aprendizaje del chatbot
 */
const getLearningStats = async (req, res) => {
    try {
        const { idUsuario, idEmpresa = 1 } = req.query;

        if (!idUsuario) {
            return res.status(400).json({
                message: 'ID de usuario es requerido'
            });
        }

        const learningStats = conversationMemory.getLearningStats(idUsuario, idEmpresa);
        const suggestions = conversationMemory.getSuggestions(idUsuario, idEmpresa);

        res.json({
            success: true,
            learningStats,
            smartSuggestions: suggestions,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de aprendizaje:', error);
        res.status(500).json({
            message: 'Error obteniendo estadísticas de aprendizaje',
            error: error.message
        });
    }
};

/**
 * Limpiar memoria de conversación (para mantenimiento)
 */
const clearConversationMemory = async (req, res) => {
    try {
        const { idUsuario, idEmpresa = 1 } = req.body;

        if (idUsuario) {
            // Limpiar memoria específica del usuario
            conversationMemory.clearUserMemory(idUsuario, idEmpresa);
            res.json({
                success: true,
                message: 'Memoria de conversación del usuario eliminada'
            });
        } else {
            // Limpiar toda la memoria (requiere confirmación especial)
            const { confirm } = req.body;
            if (confirm === 'YES') {
                conversationMemory.clearMemory();
                res.json({
                    success: true,
                    message: 'Toda la memoria de conversación eliminada'
                });
            } else {
                res.status(400).json({
                    message: 'Se requiere confirmación explícita para eliminar toda la memoria'
                });
            }
        }

    } catch (error) {
        console.error('Error limpiando memoria:', error);
        res.status(500).json({
            message: 'Error limpiando memoria de conversación'
        });
    }
};

module.exports = {
    procesarConsulta,
    getEstadisticasChatbot,
    getLearningStats,
    clearConversationMemory
};