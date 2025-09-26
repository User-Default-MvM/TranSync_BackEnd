// src/utils/conversationMemory.js
// Sistema de Memoria de Conversación para TransSync ChatBot

const fs = require('fs').promises;
const path = require('path');

class ConversationMemory {
    constructor() {
        this.memories = new Map(); // userId -> conversation history
        this.suggestions = new Map(); // userId -> suggestions
        this.memoryFile = path.join(__dirname, '../../data/conversation_memory.json');
        this.maxMessagesPerUser = 50;
        this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        this.cleanupInterval = 60 * 60 * 1000; // 1 hour

        this.initializeMemory();
        this.startCleanupInterval();
    }

    /**
     * Inicializar memoria desde archivo
     */
    async initializeMemory() {
        try {
            await fs.access(this.memoryFile);
            const data = await fs.readFile(this.memoryFile, 'utf8');
            const parsed = JSON.parse(data);

            // Restaurar memorias válidas
            for (const [userId, memory] of Object.entries(parsed.memories || {})) {
                if (this.isMemoryValid(memory)) {
                    this.memories.set(userId, memory);
                }
            }

            console.log('Memoria de conversación cargada exitosamente');
        } catch (error) {
            console.log('No se encontró archivo de memoria, iniciando vacío');
            this.memories = new Map();
        }
    }

    /**
     * Verificar si una memoria es válida
     */
    isMemoryValid(memory) {
        if (!memory || !memory.messages || !Array.isArray(memory.messages)) {
            return false;
        }

        // Verificar que no haya expirado
        const lastMessage = memory.messages[memory.messages.length - 1];
        if (lastMessage && lastMessage.timestamp) {
            const age = Date.now() - new Date(lastMessage.timestamp).getTime();
            return age < this.maxAge;
        }

        return false;
    }

    /**
     * Agregar mensaje a la conversación
     */
    addMessage(userId, message, companyId) {
        try {
            if (!userId) return;

            const userKey = `${userId}_${companyId}`;
            let userMemory = this.memories.get(userKey);

            if (!userMemory) {
                userMemory = {
                    userId: userId,
                    companyId: companyId,
                    messages: [],
                    patterns: {},
                    preferences: {},
                    created: new Date().toISOString(),
                    lastActivity: new Date().toISOString()
                };
            }

            // Agregar mensaje
            const messageWithTimestamp = {
                ...message,
                timestamp: new Date().toISOString(),
                id: Date.now() + Math.random()
            };

            userMemory.messages.push(messageWithTimestamp);
            userMemory.lastActivity = new Date().toISOString();

            // Limitar número de mensajes
            if (userMemory.messages.length > this.maxMessagesPerUser) {
                userMemory.messages = userMemory.messages.slice(-this.maxMessagesPerUser);
            }

            // Actualizar patrones de uso
            this.updatePatterns(userMemory, message);

            // Actualizar sugerencias
            this.updateSuggestions(userKey, message);

            this.memories.set(userKey, userMemory);

            // Guardar en archivo (asíncrono)
            this.saveMemory();

        } catch (error) {
            console.error('Error agregando mensaje a memoria:', error);
        }
    }

    /**
     * Obtener contexto relevante de la conversación
     */
    getRelevantContext(userId, currentMessage, companyId) {
        try {
            const userKey = `${userId}_${companyId}`;
            const userMemory = this.memories.get(userKey);

            if (!userMemory || !userMemory.messages.length) {
                return {
                    recentMessages: [],
                    relevantHistory: [],
                    patterns: {},
                    preferences: {}
                };
            }

            // Obtener mensajes recientes (últimas 10)
            const recentMessages = userMemory.messages.slice(-10);

            // Encontrar mensajes relevantes al mensaje actual
            const relevantHistory = this.findRelevantHistory(userMemory.messages, currentMessage);

            return {
                recentMessages: recentMessages,
                relevantHistory: relevantHistory,
                patterns: userMemory.patterns || {},
                preferences: userMemory.preferences || {},
                lastActivity: userMemory.lastActivity
            };

        } catch (error) {
            console.error('Error obteniendo contexto relevante:', error);
            return {
                recentMessages: [],
                relevantHistory: [],
                patterns: {},
                preferences: {}
            };
        }
    }

    /**
     * Encontrar historial relevante
     */
    findRelevantHistory(messages, currentMessage) {
        if (!messages || messages.length === 0) return [];

        const currentTokens = this.tokenizeMessage(currentMessage);
        const relevant = [];

        // Buscar mensajes con tokens similares
        for (let i = messages.length - 1; i >= 0 && relevant.length < 5; i--) {
            const message = messages[i];
            if (message.sender === 'user') {
                const messageTokens = this.tokenizeMessage(message.text || '');
                const similarity = this.calculateSimilarity(currentTokens, messageTokens);

                if (similarity > 0.3) { // Umbral de similitud
                    relevant.push({
                        message: message,
                        similarity: similarity,
                        age: Date.now() - new Date(message.timestamp).getTime()
                    });
                }
            }
        }

        return relevant.sort((a, b) => b.similarity - a.similarity);
    }

    /**
     * Tokenizar mensaje para comparación
     */
    tokenizeMessage(message) {
        return message.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2)
            .map(word => word.replace(/[^\w]/g, ''));
    }

    /**
     * Calcular similitud entre dos conjuntos de tokens
     */
    calculateSimilarity(tokens1, tokens2) {
        if (!tokens1.length || !tokens2.length) return 0;

        const set1 = new Set(tokens1);
        const set2 = new Set(tokens2);

        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        return intersection.size / union.size;
    }

    /**
     * Actualizar patrones de uso con aprendizaje continuo
     */
    updatePatterns(userMemory, message) {
        if (!userMemory.patterns) userMemory.patterns = {};

        const intent = message.intent || 'unknown';
        const hour = new Date().getHours();
        const isSuccess = message.success !== false;

        // Contar uso por intención
        if (!userMemory.patterns.intents) userMemory.patterns.intents = {};
        userMemory.patterns.intents[intent] = (userMemory.patterns.intents[intent] || 0) + 1;

        // Rastrear éxito por intención para aprendizaje
        if (!userMemory.patterns.intentSuccess) userMemory.patterns.intentSuccess = {};
        if (!userMemory.patterns.intentSuccess[intent]) {
            userMemory.patterns.intentSuccess[intent] = { success: 0, total: 0 };
        }
        userMemory.patterns.intentSuccess[intent].total++;
        if (isSuccess) {
            userMemory.patterns.intentSuccess[intent].success++;
        }

        // Contar uso por hora del día
        if (!userMemory.patterns.hourlyUsage) userMemory.patterns.hourlyUsage = {};
        userMemory.patterns.hourlyUsage[hour] = (userMemory.patterns.hourlyUsage[hour] || 0) + 1;

        // Rastrear entidades comunes
        if (message.entities) {
            if (!userMemory.patterns.commonEntities) userMemory.patterns.commonEntities = {};
            Object.keys(message.entities).forEach(entityType => {
                if (message.entities[entityType].length > 0) {
                    userMemory.patterns.commonEntities[entityType] =
                        (userMemory.patterns.commonEntities[entityType] || 0) + 1;
                }
            });
        }

        // Aprendizaje de frases exitosas
        if (isSuccess && message.text) {
            if (!userMemory.patterns.successfulPhrases) userMemory.patterns.successfulPhrases = {};
            const tokens = this.tokenizeMessage(message.text);
            tokens.forEach(token => {
                if (token.length > 3) { // Solo tokens significativos
                    userMemory.patterns.successfulPhrases[token] =
                        (userMemory.patterns.successfulPhrases[token] || 0) + 1;
                }
            });
        }

        // Aprendizaje de frases problemáticas
        if (!isSuccess && message.text) {
            if (!userMemory.patterns.problematicPhrases) userMemory.patterns.problematicPhrases = {};
            const tokens = this.tokenizeMessage(message.text);
            tokens.forEach(token => {
                if (token.length > 3) {
                    userMemory.patterns.problematicPhrases[token] =
                        (userMemory.patterns.problematicPhrases[token] || 0) + 1;
                }
            });
        }

        // Actualizar confianza promedio por intención
        if (!userMemory.patterns.intentConfidence) userMemory.patterns.intentConfidence = {};
        if (message.confidence !== undefined) {
            const current = userMemory.patterns.intentConfidence[intent] || { sum: 0, count: 0 };
            current.sum += message.confidence;
            current.count++;
            userMemory.patterns.intentConfidence[intent] = current;
        }
    }

    /**
     * Actualizar sugerencias basadas en patrones
     */
    updateSuggestions(userKey, message) {
        const suggestions = this.suggestions.get(userKey) || [];

        // Generar sugerencias basadas en el mensaje actual
        const newSuggestions = this.generateSuggestions(message);

        // Combinar con sugerencias existentes
        const combined = [...suggestions, ...newSuggestions];

        // Mantener solo las más relevantes y recientes
        const unique = combined
            .filter((s, index, arr) => arr.findIndex(s2 => s2.text === s.text) === index)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 5);

        this.suggestions.set(userKey, unique);
    }

    /**
     * Generar sugerencias basadas en mensaje
     */
    generateSuggestions(message) {
        const suggestions = [];

        if (message.intent === 'driver') {
            suggestions.push({
                text: '¿Cuántos conductores están activos?',
                relevance: 0.9,
                category: 'driver'
            });
            suggestions.push({
                text: '¿Hay licencias próximas a vencer?',
                relevance: 0.8,
                category: 'driver'
            });
        }

        if (message.intent === 'vehicle') {
            suggestions.push({
                text: '¿Cuántos vehículos están disponibles?',
                relevance: 0.9,
                category: 'vehicle'
            });
            suggestions.push({
                text: '¿Qué vehículos están en mantenimiento?',
                relevance: 0.8,
                category: 'vehicle'
            });
        }

        if (message.intent === 'route') {
            suggestions.push({
                text: '¿Qué rutas están disponibles?',
                relevance: 0.9,
                category: 'route'
            });
            suggestions.push({
                text: '¿Cuál es la ruta más utilizada?',
                relevance: 0.8,
                category: 'route'
            });
        }

        return suggestions;
    }

    /**
     * Obtener sugerencias para usuario con aprendizaje
     */
    getSuggestions(userId, companyId) {
        const userKey = `${userId}_${companyId}`;
        const userMemory = this.memories.get(userKey);

        if (!userMemory) {
            return this.getDefaultSuggestions();
        }

        // Generar sugerencias basadas en patrones de éxito
        const suggestions = this.generateSmartSuggestions(userMemory);

        // Combinar con sugerencias existentes
        const existing = this.suggestions.get(userKey) || [];
        const combined = [...suggestions, ...existing];

        // Filtrar y ordenar por relevancia
        const unique = combined
            .filter((s, index, arr) => arr.findIndex(s2 => s2.text === s.text) === index)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 5);

        return unique;
    }

    /**
     * Generar sugerencias inteligentes basadas en aprendizaje
     */
    generateSmartSuggestions(userMemory) {
        const suggestions = [];
        const patterns = userMemory.patterns || {};

        // Sugerencias basadas en intenciones exitosas
        if (patterns.intentSuccess) {
            const successfulIntents = Object.entries(patterns.intentSuccess)
                .filter(([_, data]) => data.success / data.total > 0.7) // Más del 70% de éxito
                .sort(([,a], [,b]) => (b.success / b.total) - (a.success / a.total))
                .slice(0, 3);

            successfulIntents.forEach(([intent, data]) => {
                suggestions.push({
                    text: this.getSuggestionText(intent),
                    relevance: (data.success / data.total) * 0.9,
                    category: intent,
                    type: 'learned'
                });
            });
        }

        // Sugerencias basadas en frases exitosas
        if (patterns.successfulPhrases) {
            const topPhrases = Object.entries(patterns.successfulPhrases)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3);

            topPhrases.forEach(([phrase, count]) => {
                if (count > 2) { // Solo frases que aparecieron más de 2 veces
                    suggestions.push({
                        text: `¿${phrase.charAt(0).toUpperCase() + phrase.slice(1)}?`,
                        relevance: Math.min(count * 0.1, 0.8),
                        category: 'phrase',
                        type: 'learned'
                    });
                }
            });
        }

        return suggestions;
    }

    /**
     * Obtener texto de sugerencia basado en intención
     */
    getSuggestionText(intent) {
        const suggestionMap = {
            'count_driver': '¿Cuántos conductores están activos?',
            'count_vehicle': '¿Cuántos vehículos están disponibles?',
            'list_vehicle': '¿Qué vehículos están disponibles?',
            'license_expiry': '¿Hay licencias próximas a vencer?',
            'vehicle_maintenance': '¿Qué vehículos necesitan mantenimiento?',
            'system_status': '¿Cuál es el estado general del sistema?',
            'alerts': '¿Hay alertas de vencimientos?',
            'list_route': '¿Qué rutas están disponibles?',
            'list_schedule': '¿Cuáles son los viajes programados?'
        };

        return suggestionMap[intent] || '¿En qué más puedo ayudarte?';
    }

    /**
     * Obtener sugerencias por defecto
     */
    getDefaultSuggestions() {
        return [
            {
                text: '¿Cuántos conductores están activos?',
                relevance: 0.8,
                category: 'count_driver'
            },
            {
                text: '¿Qué vehículos están disponibles?',
                relevance: 0.8,
                category: 'list_vehicle'
            },
            {
                text: '¿Cuál es el estado del sistema?',
                relevance: 0.7,
                category: 'system_status'
            },
            {
                text: '¿Hay licencias próximas a vencer?',
                relevance: 0.7,
                category: 'license_expiry'
            },
            {
                text: '¿Hay alertas de vencimientos?',
                relevance: 0.6,
                category: 'alerts'
            }
        ];
    }

    /**
     * Obtener estadísticas de aprendizaje
     */
    getLearningStats(userId, companyId) {
        const userKey = `${userId}_${companyId}`;
        const userMemory = this.memories.get(userKey);

        if (!userMemory || !userMemory.patterns) {
            return {
                totalInteractions: 0,
                successfulInteractions: 0,
                learningProgress: 0,
                topIntents: [],
                commonEntities: [],
                improvementAreas: []
            };
        }

        const patterns = userMemory.patterns;
        const totalInteractions = userMemory.messages.length;
        const successfulInteractions = userMemory.messages.filter(m => m.success !== false).length;

        // Calcular progreso de aprendizaje
        const learningProgress = Math.min((successfulInteractions / totalInteractions) * 100, 100);

        // Intenciones más exitosas
        const topIntents = patterns.intentSuccess ?
            Object.entries(patterns.intentSuccess)
                .map(([intent, data]) => ({
                    intent,
                    successRate: data.success / data.total,
                    totalUses: data.total
                }))
                .sort((a, b) => b.successRate - a.successRate)
                .slice(0, 5) : [];

        // Entidades más comunes
        const commonEntities = patterns.commonEntities ?
            Object.entries(patterns.commonEntities)
                .map(([entity, count]) => ({ entity, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5) : [];

        // Áreas de mejora
        const improvementAreas = patterns.intentSuccess ?
            Object.entries(patterns.intentSuccess)
                .filter(([_, data]) => data.success / data.total < 0.5)
                .map(([intent, data]) => ({
                    intent,
                    successRate: data.success / data.total,
                    needsImprovement: true
                })) : [];

        return {
            totalInteractions,
            successfulInteractions,
            learningProgress: Math.round(learningProgress),
            topIntents,
            commonEntities,
            improvementAreas,
            lastActivity: userMemory.lastActivity
        };
    }

    /**
     * Obtener estadísticas de conversación
     */
    getConversationStats(userId, companyId) {
        const userKey = `${userId}_${companyId}`;
        const userMemory = this.memories.get(userKey);

        if (!userMemory) {
            return {
                totalMessages: 0,
                avgResponseTime: 0,
                commonIntents: [],
                activityHours: []
            };
        }

        const messages = userMemory.messages;
        const userMessages = messages.filter(m => m.sender === 'user');
        const botMessages = messages.filter(m => m.sender === 'bot');

        // Calcular tiempo promedio de respuesta
        let totalResponseTime = 0;
        let responseCount = 0;

        for (let i = 0; i < userMessages.length - 1; i++) {
            const userMsg = userMessages[i];
            const nextBotMsg = botMessages.find(m =>
                new Date(m.timestamp) > new Date(userMsg.timestamp)
            );

            if (nextBotMsg) {
                totalResponseTime += new Date(nextBotMsg.timestamp) - new Date(userMsg.timestamp);
                responseCount++;
            }
        }

        const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

        return {
            totalMessages: messages.length,
            userMessages: userMessages.length,
            botMessages: botMessages.length,
            avgResponseTime: avgResponseTime,
            commonIntents: this.getTopIntents(userMemory.patterns),
            activityHours: this.getActivityHours(userMemory.patterns),
            lastActivity: userMemory.lastActivity
        };
    }

    /**
     * Obtener intenciones más comunes
     */
    getTopIntents(patterns) {
        if (!patterns || !patterns.intents) return [];

        return Object.entries(patterns.intents)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([intent, count]) => ({ intent, count }));
    }

    /**
     * Obtener horas de mayor actividad
     */
    getActivityHours(patterns) {
        if (!patterns || !patterns.hourlyUsage) return [];

        return Object.entries(patterns.hourlyUsage)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }));
    }

    /**
     * Limpiar conversaciones expiradas
     */
    cleanupExpiredConversations() {
        const now = Date.now();
        let cleaned = 0;

        for (const [userKey, memory] of this.memories.entries()) {
            if (memory.messages.length > 0) {
                const lastMessage = memory.messages[memory.messages.length - 1];
                const age = now - new Date(lastMessage.timestamp).getTime();

                if (age > this.maxAge) {
                    this.memories.delete(userKey);
                    this.suggestions.delete(userKey);
                    cleaned++;
                }
            }
        }

        if (cleaned > 0) {
            console.log(`Limpieza completada: ${cleaned} conversaciones expiradas eliminadas`);
            this.saveMemory();
        }
    }

    /**
     * Iniciar intervalo de limpieza
     */
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupExpiredConversations();
        }, this.cleanupInterval);
    }

    /**
     * Guardar memoria en archivo
     */
    async saveMemory() {
        try {
            const data = {
                memories: Object.fromEntries(this.memories),
                lastSaved: new Date().toISOString()
            };

            // Crear directorio si no existe
            await fs.mkdir(path.dirname(this.memoryFile), { recursive: true });

            await fs.writeFile(this.memoryFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error guardando memoria:', error);
        }
    }

    /**
     * Limpiar toda la memoria (para testing)
     */
    clearMemory() {
        this.memories.clear();
        this.suggestions.clear();
        this.saveMemory();
    }

    /**
     * Limpiar memoria específica de un usuario
     */
    clearUserMemory(userId, companyId) {
        const userKey = `${userId}_${companyId}`;
        this.memories.delete(userKey);
        this.suggestions.delete(userKey);
        this.saveMemory();
    }
}

module.exports = new ConversationMemory();