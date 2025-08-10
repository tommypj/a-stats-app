const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config/config');
const { logger, createTimer } = require('../utils/logger');
const InputValidator = require('../validators/validators');
const { JSDOM } = require('jsdom');
const { parseGeminiJSON } = require('../utils/jsonParser');

// Import the modularized generation steps
const step1 = require('./generationSteps/step1_keywords');
const step2 = require('./generationSteps/step2_outline');
const step3 = require('./generationSteps/step3_research');
const step4 = require('./generationSteps/step4_article');
const step5 = require('./generationSteps/step5_seo_report');

console.log('--- GeminiService.js LOADED - DEBUG VERSION 16 (Modularized) ---');

class GeminiService {
    constructor() {
        this.genAI = null;
        this.model = null;
        this.initialized = false;
        this.initializationError = null;
        // The validator is instantiated here and passed to the router
        this.validator = new InputValidator();
    }

    async initialize(apiKey) {
        if (this.initialized) {
            logger.info('GeminiService este deja inițializat.');
            return;
        }
        if (this.initializationError) {
            logger.warn('GeminiService nu a putut fi inițializat anterior. Încercare nouă.');
            this.initializationError = null;
        }

        const timer = createTimer('Gemini initialization');

        try {
            logger.info('Initializing Gemini API...');

            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: config.gemini.model,
                generationConfig: {
                    temperature: config.gemini.temperature,
                    topP: config.gemini.topP,
                    topK: config.gemini.topK,
                    maxOutputTokens: config.gemini.maxOutputTokens
                }
            });

            this.initialized = true;
            timer.end({ success: true, model: config.gemini.model, temperature: config.gemini.temperature, maxOutputTokens: config.gemini.maxOutputTokens });
            logger.info('Gemini API initialized successfully', {
                model: config.gemini.model,
                temperature: config.gemini.temperature,
                maxOutputTokens: config.gemini.maxOutputTokens
            });
        } catch (error) {
            timer.end({ success: false, error: error.message });
            this.initializationError = error;
            logger.error('Failed to initialize Gemini API', { error: error.message });
            throw new Error(`Eroare la inițializarea API-ului Gemini: ${error.message}`);
        }
    }

    async generateContent(prompt, stepName, userId) {
        if (!this.initialized) {
            throw new Error('GeminiService nu este inițializat. Apelați initialize() mai întâi.');
        }

        const timer = createTimer(`Content generation (${stepName})`);

        for (let attempt = 0; attempt < config.retry.maxRetries; attempt++) {
            try {
                logger.info('Generating content with Gemini', {
                    stepName,
                    promptLength: prompt.length,
                    attempt: attempt + 1,
                    maxRetries: config.retry.maxRetries,
                    userId
                });

                const result = await this.model.generateContent(prompt);
                const response = result.response;
                const text = response.text();

                if (!text || text.trim().length === 0) {
                    throw new Error('Răspuns gol de la Gemini');
                }

                timer.end({
                    success: true,
                    responseLength: text.length,
                    attempt: attempt + 1,
                    stepName,
                    userId
                });

                logger.info('Content generated successfully', {
                    stepName,
                    responseLength: text.length,
                    attempt: attempt + 1,
                    userId
                });

                return text;
            } catch (error) {
                const isLastAttempt = attempt === config.retry.maxRetries - 1;

                logger.warn('Content generation attempt failed', {
                    stepName,
                    attempt: attempt + 1,
                    error: error.message,
                    isLastAttempt,
                    willRetry: !isLastAttempt,
                    userId
                });

                if (isLastAttempt) {
                    timer.end({
                        success: false,
                        error: error.message,
                        attempt: attempt + 1,
                        stepName,
                        userId
                    });
                    throw this.handleGeminiError(error, stepName, userId);
                }

                const delay = Math.min(
                    config.retry.baseDelay * Math.pow(2, attempt),
                    config.retry.maxDelay
                );

                if (this.shouldRetry(error)) {
                    logger.info(`Retrying in ${delay}ms for ${stepName}...`, { userId });
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw this.handleGeminiError(error, stepName, userId);
                }
            }
        }
    }

    shouldRetry(error) {
        const retryableErrors = [429, 503, 502, 504];
        const retryableMessages = ['timeout', 'rate limit', 'quota exceeded', 'model is overloaded'];

        return (error.code && retryableErrors.includes(error.code)) ||
                       (error.message && retryableMessages.some(msg =>
                           error.message.toLowerCase().includes(msg)
                       ));
    }

    handleGeminiError(error, stepName = 'Unknown Step', userId = 'N/A') {
        logger.error(`Gemini API error (${stepName})`, {
            code: error.code,
            message: error.message,
            details: error.details,
            stepName,
            userId
        });

        if (error.code === 404) {
            return new Error(`Modelul Gemini (${config.gemini.model}) nu a fost găsit sau nu este suportat în regiunea dvs. (${stepName})`);
        }

        if (error.code === 429 || error.code === 503) {
            return new Error(`Serviciul Gemini este supraîncărcat. Te rog încearcă din nou în câteva minute.`);
        }

        if (error.code === 400) {
            return new Error(`Cerere invalidă către Gemini (${stepName}): ${error.message}`);
        }

        if (error.code === 401 || error.code === 403) {
            return new Error(`Permisiuni insuficiente pentru API-ul Gemini (${stepName}). Verifică configurația cheii API.`);
        }

        return new Error(`Eroare API Gemini neașteptată (${stepName}): ${error.message}`);
    }

    cleanHtmlResponse(text) {
        let cleanText = text.replace(/```(?:html)?\s*\n?|\n?```/g, '').trim();

        const dom = new JSDOM(cleanText);
        const doc = dom.window.document;

        let bodyContent = '';
        const bodyElement = doc.querySelector('body');

        if (bodyElement) {
            bodyContent = bodyElement.innerHTML;
        } else {
            const tempDiv = doc.createElement('div');
            tempDiv.innerHTML = cleanText;
            bodyContent = tempDiv.innerHTML;
        }

        return bodyContent;
    }

    // New, modular methods. These will call the imported functions.
    async generateStep1(initialSubject, userId) {
        return step1(this.model, initialSubject, userId, this.generateContent.bind(this), this.validator);
    }
    async generateStep2(finalSubject, keywords, userId) {
        return step2(this.model, finalSubject, keywords, userId, this.generateContent.bind(this), this.validator);
    }
    async generateStep3(finalSubject, articleOutline, userId) {
        return step3(this.model, finalSubject, articleOutline, userId, this.generateContent.bind(this), this.validator);
    }
    async generateStep4(finalSubject, step1Result, step2Result, autori_concepte, idei_statistici, surse_externe_sugerate, meta_titlu_propus, meta_descriere_propusa, structura_articol, userId) {
        return step4(this.model, finalSubject, step1Result, step2Result, autori_concepte, idei_statistici, surse_externe_sugerate, meta_titlu_propus, meta_descriere_propusa, structura_articol, userId, this.generateContent.bind(this));
    }
    async generateStep5(htmlArticle, keywords, userId) {
        return step5(this.model, htmlArticle, keywords, userId, this.generateContent.bind(this), this.parseGeminiJSON);
    }
}

module.exports = GeminiService;
