// services/geminiService.js (or wherever this file lives)
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

console.log('--- GeminiService.js LOADED - DEBUG VERSION 17 (Modularized + Hardened) ---');

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.initialized = false;
    this.initializationError = null;
    this.currentModelName = null; // for diagnostics
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
      this.currentModelName = config.gemini.model;

      this.model = this.genAI.getGenerativeModel({
        model: this.currentModelName,
        generationConfig: {
          temperature: config.gemini.temperature,
          topP: config.gemini.topP,
          topK: config.gemini.topK,
          maxOutputTokens: config.gemini.maxOutputTokens
        }
      });

      this.initialized = true;
      timer.end({
        success: true,
        model: this.currentModelName,
        temperature: config.gemini.temperature,
        maxOutputTokens: config.gemini.maxOutputTokens
      });
      logger.info('Gemini API initialized successfully', {
        model: this.currentModelName,
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

  // -------- Hardened content generation with diagnostics & fallback --------
  async generateContent(prompt, stepName, userId) {
    if (!this.initialized) {
      throw new Error('GeminiService nu este inițializat. Apelați initialize() mai întâi.');
    }

    const timer = createTimer(`Content generation (${stepName})`);
    const isObjectRequest = prompt && typeof prompt === 'object' && !Array.isArray(prompt);

    // Extract any text we can from the SDK response
    const extractText = (response) => {
      try {
        if (!response) return '';
        // Primary (newer SDKs)
        if (typeof response.text === 'function') {
          const t = response.text();
          if (t && t.trim().length) return t;
        }
        // Fallback for candidate parts
        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          const t = parts.map(p => (p?.text ?? '')).join('');
          if (t && t.trim().length) return t;
        }
        return '';
      } catch {
        return '';
      }
    };

    const switchToFallbackModel = () => {
      const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';
      this.currentModelName = fallbackModel;
      this.model = this.genAI.getGenerativeModel({
        model: fallbackModel,
        generationConfig: {
          // Conservative settings for stability
          temperature: Math.min(0.4, config.gemini.temperature ?? 0.7),
          topP: config.gemini.topP ?? 0.9,
          topK: config.gemini.topK ?? 40,
          maxOutputTokens: Math.max(1024, config.gemini.maxOutputTokens ?? 1024)
        }
      });
      logger.info(`Fallback model activated: ${fallbackModel}`, { stepName, userId });
    };

    for (let attempt = 0; attempt < config.retry.maxRetries; attempt++) {
      const isLastAttempt = attempt === config.retry.maxRetries - 1;

      try {
        logger.info('Generating content with Gemini', {
          stepName,
          model: this.currentModelName,
          promptShape: isObjectRequest ? 'object' : 'string',
          attempt: attempt + 1,
          userId
        });

        // SDK accepts both a plain string and a request object
        const result = await this.model.generateContent(
          isObjectRequest ? prompt : prompt
        );

        const response = result?.response;
        const text = extractText(response);

        // helpful diagnostics (if available for your plan/SDK)
        const blockReason = response?.promptFeedback?.blockReason;
        const finishReason = response?.candidates?.[0]?.finishReason;

        logger.info('Gemini diagnostics', {
          stepName,
          model: this.currentModelName,
          blockReason,
          finishReason
        });

        if (!text || !text.trim().length) {
          if (blockReason) {
            throw new Error(`Conținut blocat de filtrele de siguranță (${blockReason}). Ajustează promptul/tonul/limba.`);
          }
          if (finishReason === 'MAX_TOKENS') {
            throw new Error('Răspuns trunchiat (MAX_TOKENS). Mărește maxOutputTokens sau micșorează cerința.');
          }
          // generic empty
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
          model: this.currentModelName,
          responseLength: text.length,
          attempt: attempt + 1,
          userId
        });

        return text;
      } catch (error) {
        logger.warn('Content generation attempt failed', {
          stepName,
          model: this.currentModelName,
          attempt: attempt + 1,
          error: error.message,
          userId
        });

        if (!isLastAttempt && this.shouldRetry(error)) {
          // On the first failure, try a safer fallback model
          if (attempt === 0) {
            try { switchToFallbackModel(); } catch (e) {
              logger.warn('Fallback model switch failed', { stepName, error: e.message });
            }
          }

          const delay = Math.min(
            config.retry.baseDelay * Math.pow(2, attempt),
            config.retry.maxDelay
          );
          logger.info(`Retrying in ${delay}ms for ${stepName}...`, { userId });
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        timer.end({
          success: false,
          error: error.message,
          attempt: attempt + 1,
          stepName,
          userId
        });
        throw this.handleGeminiError(error, stepName, userId);
      }
    }
  }

  shouldRetry(error) {
    const retryableErrors = [429, 503, 502, 504];
    const retryableMessages = ['timeout', 'rate limit', 'quota exceeded', 'model is overloaded', 'Răspuns gol'];

    return (error.code && retryableErrors.includes(error.code)) ||
      (error.message && retryableMessages.some(msg => error.message.toLowerCase().includes(msg.toLowerCase())));
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
      return new Error(`Modelul Gemini (${this.currentModelName || config.gemini.model}) nu a fost găsit sau nu este suportat în regiunea dvs. (${stepName})`);
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

  // -------- Modular steps (unchanged signatures) --------
  async generateStep1(initialSubject, userId) {
    return step1(this.model, initialSubject, userId, this.generateContent.bind(this), this.validator);
  }

  async generateStep2(finalSubject, keywords, userId) {
    return step2(this.model, finalSubject, keywords, userId, this.generateContent.bind(this), this.validator);
  }

  async generateStep3(finalSubject, articleOutline, userId) {
    return step3(this.model, finalSubject, articleOutline, userId, this.generateContent.bind(this), this.validator);
  }

  async generateStep4(
    finalSubject,
    step1Result,
    step2Result,
    autori_concepte,
    idei_statistici,
    surse_externe_sugerate,
    meta_titlu_propus,
    meta_descriere_propusa,
    structura_articol,
    userId
  ) {
    return step4(
      this.model,
      finalSubject,
      step1Result,
      step2Result,
      autori_concepte,
      idei_statistici,
      surse_externe_sugerate,
      meta_titlu_propus,
      meta_descriere_propusa,
      structura_articol,
      userId,
      this.generateContent.bind(this)
    );
  }

  async generateStep5(htmlArticle, keywords, userId) {
    return step5(this.model, htmlArticle, keywords, userId, this.generateContent.bind(this), this.parseGeminiJSON);
  }
}

module.exports = GeminiService;
