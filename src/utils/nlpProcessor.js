// src/utils/nlpProcessor.js
// Procesador Avanzado de Lenguaje Natural para TransSync ChatBot

const natural = require('natural');
const compromise = require('compromise');

class NLPProcessor {
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        this.classifier = new natural.BayesClassifier();

        // Entrenar clasificador con patrones comunes
        this.trainClassifier();
    }

    /**
     * Procesar mensaje completo y extraer información semántica
     */
    processMessage(message) {
        try {
            const doc = compromise(message);
            const tokens = this.tokenizer.tokenize(message.toLowerCase()) || [];
            const stemmedTokens = tokens.map(token => this.stemmer.stem(token));

            // Análisis semántico
            const semanticAnalysis = this.analyzeSemantics(doc, tokens);

            // Extracción de entidades
            const entities = this.extractEntities(doc, message);

            // Análisis de contexto
            const context = this.analyzeContext(doc, tokens);

            return {
                originalMessage: message,
                tokens: tokens,
                stemmedTokens: stemmedTokens,
                semanticAnalysis: semanticAnalysis,
                entities: entities,
                context: context
            };
        } catch (error) {
            console.error('Error en processMessage:', error);
            return this.getFallbackAnalysis(message);
        }
    }

    /**
     * Análisis semántico avanzado
     */
    analyzeSemantics(doc, tokens) {
        const intent = this.classifyIntent(tokens);
        const confidence = this.calculateConfidence(doc, tokens, intent);
        const complexity = this.assessComplexity(doc);

        return {
            intent: intent,
            confidence: confidence,
            complexity: complexity,
            keywords: this.extractKeywords(doc),
            sentiment: this.analyzeSentiment(doc)
        };
    }

    /**
     * Clasificar intención del mensaje
     */
    classifyIntent(tokens) {
        if (!tokens || tokens.length === 0) return 'unknown';

        // Patrones de intención
        const intentPatterns = {
            greeting: ['hola', 'buenos', 'saludos', 'hey', 'hi', 'buen', 'dias', 'tardes', 'noches'],
            farewell: ['gracias', 'thanks', 'adios', 'bye', 'chao', 'hasta', 'luego'],
            help: ['ayuda', 'help', 'que', 'puedes', 'hacer', 'opciones', 'menu', 'funciones'],
            status: ['estado', 'estatus', 'situacion', 'condicion', 'disponible', 'activo', 'inactivo'],
            count: ['cuantos', 'cuantas', 'numero', 'cantidad', 'total'],
            list: ['muestra', 'mostrar', 'lista', 'listar', 'ver', 'consulta'],
            filter: ['con', 'que', 'cuales', 'donde', 'cuando', 'como'],
            report: ['reporte', 'reportes', 'informe', 'estadistica', 'datos', 'analisis'],
            maintenance: ['mantenimiento', 'reparacion', 'arreglo', 'averiado'],
            license: ['licencia', 'licencias', 'vencimiento', 'caduca', 'expira'],
            route: ['ruta', 'rutas', 'recorrido', 'destino', 'origen'],
            schedule: ['horario', 'horarios', 'programacion', 'viaje', 'salida', 'llegada'],
            driver: ['conductor', 'conductores', 'chofer', 'choferes', 'driver'],
            vehicle: ['vehiculo', 'vehiculos', 'bus', 'buses', 'auto', 'carro', 'flota'],
            company: ['empresa', 'empresas', 'compania', 'companias'],
            user: ['usuario', 'usuarios', 'cuenta', 'perfil']
        };

        let bestIntent = 'unknown';
        let maxMatches = 0;

        for (const [intent, patterns] of Object.entries(intentPatterns)) {
            const matches = tokens.filter(token =>
                patterns.some(pattern => token.includes(pattern) || pattern.includes(token))
            ).length;

            if (matches > maxMatches) {
                maxMatches = matches;
                bestIntent = intent;
            }
        }

        // Combinar intenciones relacionadas
        if (bestIntent === 'driver' && tokens.some(t => t.includes('licencia'))) {
            return 'driver_license';
        }
        if (bestIntent === 'vehicle' && tokens.some(t => t.includes('mantenimiento'))) {
            return 'vehicle_maintenance';
        }
        if (bestIntent === 'status' && tokens.some(t => t.includes('general'))) {
            return 'system_status';
        }

        return bestIntent;
    }

    /**
     * Calcular confianza en la clasificación
     */
    calculateConfidence(doc, tokens, intent) {
        if (intent === 'unknown') return 0.1;

        let confidence = 0.5; // Base confidence

        // Aumentar confianza basado en claridad del mensaje
        if (tokens.length > 3) confidence += 0.1;
        if (doc.sentences().length === 1) confidence += 0.1;

        // Aumentar confianza basado en palabras clave específicas
        const specificKeywords = ['cuantos', 'mostrar', 'estado', 'disponible', 'activo'];
        const specificMatches = tokens.filter(t => specificKeywords.includes(t)).length;
        confidence += (specificMatches * 0.1);

        return Math.min(confidence, 0.95);
    }

    /**
     * Evaluar complejidad de la consulta
     */
    assessComplexity(doc) {
        let complexity = 1;

        // Aumentar complejidad por conectores
        const connectors = ['y', 'o', 'con', 'sin', 'que', 'donde', 'cuando'];
        const connectorCount = doc.match(connectors.join('|')).length;
        complexity += connectorCount * 0.5;

        // Aumentar por entidades temporales
        if (doc.dates().length > 0) complexity += 0.3;
        if (doc.numbers().length > 0) complexity += 0.2;

        return Math.min(complexity, 3);
    }

    /**
     * Extraer palabras clave
     */
    extractKeywords(doc) {
        const nouns = doc.nouns().out('array');
        const verbs = doc.verbs().out('array');
        return [...nouns, ...verbs].slice(0, 5);
    }

    /**
     * Análisis de sentimiento básico
     */
    analyzeSentiment(doc) {
        const positiveWords = ['bueno', 'excelente', 'perfecto', 'genial', 'bien'];
        const negativeWords = ['malo', 'terrible', 'problema', 'error', 'fallo'];

        const text = doc.text().toLowerCase();
        const positiveCount = positiveWords.filter(word => text.includes(word)).length;
        const negativeCount = negativeWords.filter(word => text.includes(word)).length;

        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    /**
     * Extraer entidades del mensaje
     */
    extractEntities(doc, message) {
        const entities = {
            dates: [],
            numbers: [],
            locations: [],
            names: [],
            temporalExpressions: []
        };

        // Extraer fechas
        const dates = doc.dates();
        dates.forEach(date => {
            entities.dates.push({
                value: date.out('text'),
                normalized: date.out('normalized')
            });
        });

        // Extraer números
        const numbers = doc.numbers();
        numbers.forEach(num => {
            entities.numbers.push({
                value: parseFloat(num.out('text')),
                text: num.out('text')
            });
        });

        // Extraer lugares (ciudades, direcciones)
        const places = doc.places();
        places.forEach(place => {
            entities.locations.push(place.out('text'));
        });

        // Extraer nombres propios
        const people = doc.people();
        people.forEach(person => {
            entities.names.push(person.out('text'));
        });

        // Expresiones temporales
        const temporalPatterns = [
            /\bhoy\b/i, /\bayer\b/i, /\bmañana\b/i, /\bsemana\b/i,
            /\bmes\b/i, /\baño\b/i, /\beste\b/i, /\bproximo\b/i
        ];

        temporalPatterns.forEach(pattern => {
            const matches = message.match(pattern);
            if (matches) {
                entities.temporalExpressions.push(...matches);
            }
        });

        return entities;
    }

    /**
     * Análisis de contexto
     */
    analyzeContext(doc, tokens) {
        return {
            isQuestion: doc.questions().length > 0,
            hasNegation: doc.has('#Negative'),
            isImperative: doc.has('#Imperative'),
            timeReference: this.extractTimeReference(doc),
            scope: this.determineScope(tokens)
        };
    }

    /**
     * Extraer referencia temporal
     */
    extractTimeReference(doc) {
        const dates = doc.dates();
        if (dates.length > 0) {
            return dates[0].out('normalized');
        }

        const temporalWords = ['hoy', 'ayer', 'mañana', 'semana', 'mes'];
        const found = temporalWords.find(word =>
            doc.text().toLowerCase().includes(word)
        );

        return found || null;
    }

    /**
     * Determinar alcance de la consulta
     */
    determineScope(tokens) {
        if (tokens.some(t => ['todos', 'todas', 'completo', 'total'].includes(t))) {
            return 'all';
        }
        if (tokens.some(t => ['disponible', 'activo', 'libre'].includes(t))) {
            return 'available';
        }
        if (tokens.some(t => ['inactivo', 'ocupado', 'mantenimiento'].includes(t))) {
            return 'unavailable';
        }
        return 'general';
    }

    /**
     * Entrenar clasificador con patrones
     */
    trainClassifier() {
        // Ejemplos de entrenamiento
        const trainingData = [
            { text: 'cuantos conductores hay', intent: 'count_driver' },
            { text: 'mostrar vehiculos disponibles', intent: 'list_vehicle' },
            { text: 'estado del sistema', intent: 'system_status' },
            { text: 'licencias que vencen', intent: 'license_expiry' },
            { text: 'rutas disponibles', intent: 'list_route' },
            { text: 'viajes programados', intent: 'list_schedule' }
        ];

        trainingData.forEach(item => {
            this.classifier.addDocument(item.text, item.intent);
        });

        this.classifier.train();
    }

    /**
     * Análisis fallback para errores
     */
    getFallbackAnalysis(message) {
        return {
            originalMessage: message,
            tokens: [],
            stemmedTokens: [],
            semanticAnalysis: {
                intent: 'unknown',
                confidence: 0.1,
                complexity: 1,
                keywords: [],
                sentiment: 'neutral'
            },
            entities: {
                dates: [],
                numbers: [],
                locations: [],
                names: [],
                temporalExpressions: []
            },
            context: {
                isQuestion: false,
                hasNegation: false,
                isImperative: false,
                timeReference: null,
                scope: 'general'
            }
        };
    }
}

module.exports = new NLPProcessor();