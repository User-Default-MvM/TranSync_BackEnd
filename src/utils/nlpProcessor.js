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
     * Calcular confianza en la clasificación con lógica mejorada
     */
    calculateConfidence(doc, tokens, intent) {
        if (intent === 'unknown') return 0.1;

        let confidence = 0.3; // Base confidence más conservadora

        // Factor 1: Claridad del mensaje
        if (tokens.length > 3) confidence += 0.15;
        if (tokens.length > 6) confidence += 0.1;
        if (doc.sentences().length === 1) confidence += 0.1;

        // Factor 2: Especificidad de la consulta
        const specificKeywords = [
            'cuantos', 'cuántos', 'mostrar', 'listar', 'estado', 'disponible', 'activo',
            'vencimiento', 'mantenimiento', 'licencia', 'ruta', 'horario', 'viaje',
            'conductor', 'vehículo', 'alerta', 'documento', 'sistema', 'dashboard'
        ];
        const specificMatches = tokens.filter(t => specificKeywords.includes(t.toLowerCase())).length;
        confidence += (specificMatches * 0.08);

        // Factor 3: Presencia de entidades
        const entities = this.extractEntities(doc, doc.text());
        const entityCount = Object.values(entities).reduce((sum, arr) => {
            if (Array.isArray(arr)) {
                return sum + arr.length;
            }
            return sum;
        }, 0);
        confidence += Math.min(entityCount * 0.05, 0.2);

        // Factor 4: Longitud vs complejidad
        const avgTokenLength = tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length;
        if (avgTokenLength > 5) confidence += 0.1; // Palabras más específicas

        // Factor 5: Presencia de preguntas
        if (doc.questions().length > 0) confidence += 0.1;

        // Factor 6: Coherencia del mensaje
        const hasProperStructure = this.assessMessageStructure(doc, tokens);
        if (hasProperStructure) confidence += 0.1;

        // Factor 7: Intención específica vs genérica
        const specificIntents = ['license_expiry', 'vehicle_maintenance', 'system_status', 'count_driver', 'count_vehicle'];
        if (specificIntents.includes(intent)) confidence += 0.1;

        // Penalización por ambigüedad
        if (tokens.length < 2) confidence -= 0.1;
        if (this.hasAmbiguousTerms(tokens)) confidence -= 0.1;

        return Math.max(0.1, Math.min(confidence, 0.95));
    }

    /**
     * Evaluar estructura del mensaje
     */
    assessMessageStructure(doc, tokens) {
        // Verificar si tiene estructura de pregunta clara
        const questions = doc.questions().length;
        const hasQuestionWords = tokens.some(t =>
            ['qué', 'cuál', 'cuáles', 'cómo', 'dónde', 'cuándo', 'cuántos', 'cuántas'].includes(t.toLowerCase())
        );

        return (questions > 0 && hasQuestionWords) || (tokens.length > 2 && !hasQuestionWords);
    }

    /**
     * Detectar términos ambiguos
     */
    hasAmbiguousTerms(tokens) {
        const ambiguousTerms = ['cosa', 'algo', 'esto', 'eso', 'aquello', 'cosas'];
        return tokens.some(t => ambiguousTerms.includes(t.toLowerCase()));
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
     * Extraer entidades del mensaje con mejor detección
     */
    extractEntities(doc, message) {
        const entities = {
            dates: [],
            numbers: [],
            locations: [],
            names: [],
            temporalExpressions: [],
            quantities: [],
            organizations: [],
            phoneNumbers: [],
            emails: [],
            urls: [],
            money: [],
            percentages: [],
            times: [],
            durations: [],
            distances: [],
            weights: [],
            volumes: [],
            temperatures: [],
            speeds: [],
            areas: [],
            pressures: []
        };

        // Extraer fechas con mejor normalización
        const dates = doc.dates();
        dates.forEach(date => {
            entities.dates.push({
                value: date.out('text'),
                normalized: date.out('normalized'),
                type: 'date'
            });
        });

        // Extraer números con contexto
        const numbers = doc.numbers();
        numbers.forEach(num => {
            const numText = num.out('text');
            const numValue = parseFloat(numText);
            entities.numbers.push({
                value: numValue,
                text: numText,
                type: 'number'
            });
        });

        // Extraer lugares (ciudades, direcciones, países)
        const places = doc.places();
        places.forEach(place => {
            entities.locations.push({
                value: place.out('text'),
                type: 'location'
            });
        });

        // Extraer nombres propios
        const people = doc.people();
        people.forEach(person => {
            entities.names.push({
                value: person.out('text'),
                type: 'person'
            });
        });

        // Expresiones temporales expandidas
        const temporalPatterns = [
            // Tiempo básico
            /\bhoy\b/gi, /\bayer\b/gi, /\bmañana\b/gi, /\bsemana\s+(pasada|que\s+viene)\b/gi,
            /\bmes\s+(pasado|que\s+viene)\b/gi, /\baño\s+(pasado|que\s+viene)\b/gi,
            /\beste\s+(mes|semana|año)\b/gi, /\bpróximo\s+(mes|semana|año)\b/gi,
            /\bpróxima\s+(semana|mes|año)\b/gi, /\bsiguiente\s+(mes|semana|año)\b/gi,
            // Expresiones relativas
            /\ben\s+\d+\s+(días|semanas|meses|años)\b/gi,
            /\bdentro\s+de\s+\d+\s+(días|semanas|meses|años)\b/gi,
            /\bhace\s+\d+\s+(días|semanas|meses|años)\b/gi,
            // Días de la semana
            /\b(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/gi,
            // Momentos del día
            /\b(esta\s+mañana|esta\s+tarde|esta\s+noche)\b/gi,
            /\b(por\s+la\s+mañana|por\s+la\s+tarde|por\s+la\s+noche)\b/gi,
            // Períodos específicos
            /\b(fin\s+de\s+semana|fin\s+de\s+mes|fin\s+de\s+año)\b/gi,
            /\b(primera|segunda)\s+quincena\b/gi,
            /\b(primer|segundo)\s+trimestre\b/gi,
            /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gi
        ];

        temporalPatterns.forEach(pattern => {
            const matches = message.match(pattern);
            if (matches) {
                entities.temporalExpressions.push(...matches);
            }
        });

        // Extraer cantidades (números con unidades)
        const quantityPatterns = [
            /(\d+)\s*(vehículos?|buses?|autos?|carros?|conductores?|choferes?)/gi,
            /(\d+)\s*(días?|semanas?|meses?|años?)\b/gi,
            /(\d+)\s*(kilómetros?|km|millas?)\b/gi,
            /(\d+)\s*(horas?|hrs|minutos?|mins)\b/gi,
            /(\d+)\s*(personas?|pasajeros?)\b/gi,
            /(\d+)\s*(viajes?|rutas?|trayectos?)\b/gi
        ];

        quantityPatterns.forEach(pattern => {
            const matches = message.match(pattern);
            if (matches) {
                entities.quantities.push(...matches);
            }
        });

        // Extraer números de teléfono
        const phonePattern = /(\+\d{1,3}[- ]?)?\d{3}[- ]?\d{3}[- ]?\d{4}/g;
        const phoneMatches = message.match(phonePattern);
        if (phoneMatches) {
            entities.phoneNumbers.push(...phoneMatches);
        }

        // Extraer emails
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emailMatches = message.match(emailPattern);
        if (emailMatches) {
            entities.emails.push(...emailMatches);
        }

        // Extraer URLs
        const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
        const urlMatches = message.match(urlPattern);
        if (urlMatches) {
            entities.urls.push(...urlMatches);
        }

        // Extraer dinero
        const moneyPattern = /\$?\d{1,3}(,\d{3})*(\.\d{2})?|\d+\s*(dólares?|pesos?|euros?)/gi;
        const moneyMatches = message.match(moneyPattern);
        if (moneyMatches) {
            entities.money.push(...moneyMatches);
        }

        // Extraer porcentajes
        const percentagePattern = /\d{1,3}%/g;
        const percentageMatches = message.match(percentagePattern);
        if (percentageMatches) {
            entities.percentages.push(...percentageMatches);
        }

        // Extraer horas específicas
        const timePattern = /\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm|AM|PM)?\b/g;
        const timeMatches = message.match(timePattern);
        if (timeMatches) {
            entities.times.push(...timeMatches);
        }

        // Extraer duraciones
        const durationPattern = /\d+\s*(hora|horas|minuto|minutos|segundo|segundos|día|días)/gi;
        const durationMatches = message.match(durationPattern);
        if (durationMatches) {
            entities.durations.push(...durationMatches);
        }

        // Extraer distancias
        const distancePattern = /\d+\s*(km|kilómetro|kilómetros|milla|millas|metro|metros)/gi;
        const distanceMatches = message.match(distancePattern);
        if (distanceMatches) {
            entities.distances.push(...distanceMatches);
        }

        // Extraer organizaciones/empresas
        const orgPattern = /\b(empresa|compañía|corporación|institución|organización)\s+\w+/gi;
        const orgMatches = message.match(orgPattern);
        if (orgMatches) {
            entities.organizations.push(...orgMatches);
        }

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
        // Ejemplos de entrenamiento expandidos
        const trainingData = [
            // Consultas de conteo
            { text: 'cuantos conductores hay', intent: 'count_driver' },
            { text: 'cuántos conductores están activos', intent: 'count_driver' },
            { text: 'cuántos choferes tenemos', intent: 'count_driver' },
            { text: 'total de conductores', intent: 'count_driver' },
            { text: 'número de conductores', intent: 'count_driver' },
            { text: 'cuántos vehículos hay', intent: 'count_vehicle' },
            { text: 'cuántos vehículos disponibles', intent: 'count_vehicle' },
            { text: 'cuántos buses tenemos', intent: 'count_vehicle' },
            { text: 'total de vehículos', intent: 'count_vehicle' },
            { text: 'flota de vehículos', intent: 'count_vehicle' },

            // Consultas de lista
            { text: 'mostrar vehiculos disponibles', intent: 'list_vehicle' },
            { text: 'listar vehículos', intent: 'list_vehicle' },
            { text: 'ver vehículos', intent: 'list_vehicle' },
            { text: 'qué vehículos hay', intent: 'list_vehicle' },
            { text: 'muéstrame los vehículos', intent: 'list_vehicle' },
            { text: 'mostrar rutas', intent: 'list_route' },
            { text: 'listar rutas disponibles', intent: 'list_route' },
            { text: 'qué rutas tenemos', intent: 'list_route' },
            { text: 'ver rutas', intent: 'list_route' },
            { text: 'muéstrame las rutas', intent: 'list_route' },
            { text: 'viajes programados', intent: 'list_schedule' },
            { text: 'horarios de viaje', intent: 'list_schedule' },
            { text: 'viajes de hoy', intent: 'list_schedule' },
            { text: 'agenda de viajes', intent: 'list_schedule' },

            // Estado del sistema
            { text: 'estado del sistema', intent: 'system_status' },
            { text: 'estado general', intent: 'system_status' },
            { text: 'cómo está el sistema', intent: 'system_status' },
            { text: 'situación actual', intent: 'system_status' },
            { text: 'resumen del sistema', intent: 'system_status' },
            { text: 'dashboard', intent: 'system_status' },
            { text: 'panel de control', intent: 'system_status' },

            // Vencimientos de licencias
            { text: 'licencias que vencen', intent: 'license_expiry' },
            { text: 'licencias próximas a vencer', intent: 'license_expiry' },
            { text: 'conductores con licencia vencida', intent: 'license_expiry' },
            { text: 'renovación de licencias', intent: 'license_expiry' },
            { text: 'licencias por vencer', intent: 'license_expiry' },
            { text: 'vencimientos de licencias', intent: 'license_expiry' },

            // Mantenimiento de vehículos
            { text: 'vehículos en mantenimiento', intent: 'vehicle_maintenance' },
            { text: 'qué vehículos están en taller', intent: 'vehicle_maintenance' },
            { text: 'mantenimiento de vehículos', intent: 'vehicle_maintenance' },
            { text: 'vehículos en reparación', intent: 'vehicle_maintenance' },
            { text: 'estado de mantenimiento', intent: 'vehicle_maintenance' },

            // Alertas
            { text: 'hay alertas', intent: 'alerts' },
            { text: 'alertas de vencimientos', intent: 'alerts' },
            { text: 'qué alertas hay', intent: 'alerts' },
            { text: 'documentos por vencer', intent: 'alerts' },
            { text: 'alertas pendientes', intent: 'alerts' },

            // Saludos
            { text: 'hola', intent: 'greeting' },
            { text: 'buenos días', intent: 'greeting' },
            { text: 'buenas tardes', intent: 'greeting' },
            { text: 'buenas noches', intent: 'greeting' },
            { text: 'saludos', intent: 'greeting' },
            { text: 'hey', intent: 'greeting' },
            { text: 'qué tal', intent: 'greeting' },

            // Ayuda
            { text: 'ayuda', intent: 'help' },
            { text: 'qué puedes hacer', intent: 'help' },
            { text: 'funciones', intent: 'help' },
            { text: 'qué sabes hacer', intent: 'help' },
            { text: 'menú de opciones', intent: 'help' },
            { text: 'qué me puedes ayudar', intent: 'help' },

            // Despedidas
            { text: 'gracias', intent: 'farewell' },
            { text: 'muchas gracias', intent: 'farewell' },
            { text: 'adios', intent: 'farewell' },
            { text: 'hasta luego', intent: 'farewell' },
            { text: 'nos vemos', intent: 'farewell' },
            { text: 'bye', intent: 'farewell' },

            // Consultas específicas
            { text: 'cuál es el estado de los vehículos', intent: 'list_vehicle' },
            { text: 'muéstrame conductores activos', intent: 'count_driver' },
            { text: 'qué vehículos necesitan mantenimiento', intent: 'vehicle_maintenance' },
            { text: 'conductores disponibles', intent: 'count_driver' },
            { text: 'ruta más utilizada', intent: 'list_route' },
            { text: 'viajes en curso', intent: 'list_schedule' },
            { text: 'documentos próximos a vencer', intent: 'alerts' },
            { text: 'resumen de operaciones', intent: 'system_status' },
            { text: 'estadísticas generales', intent: 'system_status' },
            { text: 'información de la flota', intent: 'list_vehicle' },
            { text: 'estado de los conductores', intent: 'count_driver' },
            { text: 'licencias de conducir', intent: 'license_expiry' },
            { text: 'SOAT vencido', intent: 'vehicle_maintenance' },
            { text: 'técnico mecánico vencido', intent: 'vehicle_maintenance' },
            { text: 'revisiones técnicas', intent: 'vehicle_maintenance' },
            { text: 'control de vencimientos', intent: 'alerts' },
            { text: 'gestión de documentos', intent: 'alerts' },
            { text: 'operaciones diarias', intent: 'list_schedule' },
            { text: 'programación semanal', intent: 'list_schedule' },
            { text: 'calendario de viajes', intent: 'list_schedule' },
            { text: 'asignación de vehículos', intent: 'list_vehicle' },
            { text: 'asignación de conductores', intent: 'count_driver' },
            { text: 'disponibilidad de recursos', intent: 'system_status' },
            { text: 'capacidad operativa', intent: 'system_status' },
            { text: 'estado de la operación', intent: 'system_status' },
            { text: 'monitoreo del sistema', intent: 'system_status' },
            { text: 'supervisión de flota', intent: 'list_vehicle' },
            { text: 'control de conductores', intent: 'count_driver' },
            { text: 'administración de rutas', intent: 'list_route' },
            { text: 'gestión de horarios', intent: 'list_schedule' },
            { text: 'planificación de viajes', intent: 'list_schedule' },
            { text: 'optimización de rutas', intent: 'list_route' },
            { text: 'eficiencia operativa', intent: 'system_status' },
            { text: 'productividad del día', intent: 'system_status' },
            { text: 'rendimiento de la flota', intent: 'list_vehicle' },
            { text: 'desempeño de conductores', intent: 'count_driver' },
            { text: 'análisis de operaciones', intent: 'system_status' },
            { text: 'reporte de actividades', intent: 'system_status' },
            { text: 'indicadores de gestión', intent: 'system_status' },
            { text: 'métricas operativas', intent: 'system_status' },
            { text: 'kpis de transporte', intent: 'system_status' },
            { text: 'objetivos operativos', intent: 'system_status' },
            { text: 'metas de servicio', intent: 'system_status' },
            { text: 'calidad del servicio', intent: 'system_status' },
            { text: 'satisfacción del cliente', intent: 'system_status' },
            { text: 'tiempo de respuesta', intent: 'system_status' },
            { text: 'rapidez de atención', intent: 'system_status' },
            { text: 'puntualidad de viajes', intent: 'list_schedule' },
            { text: 'cumplimiento de horarios', intent: 'list_schedule' },
            { text: 'exactitud de rutas', intent: 'list_route' },
            { text: 'precisión de destinos', intent: 'list_route' },
            { text: 'seguridad vial', intent: 'count_driver' },
            { text: 'normas de tránsito', intent: 'count_driver' },
            { text: 'reglamentos de transporte', intent: 'count_driver' },
            { text: 'legislación vigente', intent: 'count_driver' },
            { text: 'requisitos legales', intent: 'count_driver' },
            { text: 'documentación al día', intent: 'alerts' },
            { text: 'papeles en regla', intent: 'alerts' },
            { text: 'certificados vigentes', intent: 'alerts' },
            { text: 'permisos actualizados', intent: 'alerts' },
            { text: 'autorizaciones válidas', intent: 'alerts' }
        ];

        // Agregar documentos al clasificador
        trainingData.forEach(item => {
            this.classifier.addDocument(item.text, item.intent);
        });

        // Entrenar el clasificador
        this.classifier.train();

        console.log(`Clasificador NLP entrenado con ${trainingData.length} ejemplos`);
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