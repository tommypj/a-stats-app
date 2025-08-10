// index.js
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { JSDOM } = require('jsdom');
const Joi = require('joi');

// The GeminiService class handles all AI interactions
class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 24000
      }
    });
  }

  async generateContent(prompt, stepName, userId) {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini API');
      }
      return text;
    } catch (e) {
      console.error(`Error in GeminiService at step ${stepName}: ${e.message}`);
      throw e;
    }
  }
}

// InputValidator class for Joi validation
class InputValidator {
  constructor() {
    this.step1RequestSchema = Joi.object({
      initialSubject: Joi.string().min(5).max(255).required()
    });
    this.step1Schema = Joi.object({
      subiect_final: Joi.string().required(),
      cuvant_cheie_principal: Joi.string().required(),
      cuvinte_cheie_secundare_lsi: Joi.array().items(Joi.string()).min(1).required(),
      cuvinte_cheie_long_tail: Joi.array().items(Joi.string()).min(1).required(),
      justificare_alegere: Joi.string().required()
    });
    this.step2RequestSchema = Joi.object({
      finalSubject: Joi.string().required(),
      keywords: Joi.string().required()
    });
    this.step2Schema = Joi.object({
      structura_articol: Joi.array().items(Joi.object({
        titlu_h2: Joi.string().required(),
        subteme_h3: Joi.array().items(Joi.string()).min(1).required()
      })).min(1).required(),
      unghi_unic: Joi.string().required(),
      meta_titlu_propus: Joi.string().required(),
      meta_descriere_propusa: Joi.string().required()
    });
    this.step3RequestSchema = Joi.object({
      finalSubject: Joi.string().required(),
      articleOutline: Joi.array().items(Joi.object()).required()
    });
    this.step3Schema = Joi.object({
      autori_concepte: Joi.array().items(Joi.object({
        nume_autor: Joi.string().required(),
        concept: Joi.string().required(),
        citat_sau_idee: Joi.string().required()
      })).min(1).required(),
      idei_statistici: Joi.array().items(Joi.string()).required(),
      surse_externe_sugerate: Joi.array().items(Joi.string()).required()
    });
    this.step4RequestSchema = Joi.object({
      finalSubject: Joi.string().required(),
      step1Result: Joi.object().required(),
      step2Result: Joi.object().required(),
      step3Result: Joi.object().required()
    });
    this.step5RequestSchema = Joi.object({
      htmlArticle: Joi.string().required(),
      keywords: Joi.string().required()
    });
  }

  validate(schema, data) {
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
    if (error) {
      throw new Error(`Validation Error: ${error.details.map(d => d.message).join(', ')}`);
    }
    return value;
  }

  parseGeminiJSON(text, stepName) {
    try {
      const cleanText = text.replace(/```json\n|```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (e) {
      console.error(`JSON Parsing Error at ${stepName}: ${e.message}`);
      throw new Error(`Invalid JSON format from Gemini API at ${stepName}.`);
    }
  }
}

// Modularized generation steps (updated to be self-contained)
const step1 = async (geminiService, initialSubject, userId) => {
  const prompt = `Ești un expert SEO și psihoterapeut. Generează 3 idei de subiecte detaliate pentru un articol de blog care se bazează **direct și specific** pe "${initialSubject}" (NU schimba subiectul principal, doar detaliază-l), optimizate SEO. Pentru fiecare idee, propune:
  - Un cuvânt cheie principal relevant și cu volum de căutare decent.
  - 5-7 cuvinte cheie secundare/LSI (variații, sinonime, termeni înrudiți semantic).
  - 10 cuvinte cheie long-tail relevante cu intenția de căutare (informațională/comercială/navigațională).
  Alege cel mai bun subiect și set de cuvinte cheie din lista generată, justificând alegerea, și returnează-le într-un format JSON strict, fără text suplimentar în afara blocului JSON: {"subiect_final": "...", "cuvant_cheie_principal": "...", "cuvinte_cheie_secundare_lsi": ["...", "..."], "cuvinte_cheie_long_tail": ["...", "..."], "justificare_alegere": "..."}.`;
  
  const resultText = await geminiService.generateContent(prompt, 'Etapa 1', userId);
  const parsed = inputValidator.parseGeminiJSON(resultText, 'Etapa 1');
  return inputValidator.validate(inputValidator.step1Schema, parsed);
};

// ... other steps (step2, step3, etc.) would be defined here in a real application ...

// 10) Routes
const apiRouter = express.Router();

const handleStep1 = asyncHandler(async (req, res) => {
  const { initialSubject } = inputValidator.validate(inputValidator.step1RequestSchema, req.body);
  const result = await step1(geminiService, initialSubject, req.user.uid);
  res.json(result);
});

apiRouter.post('/step1', handleStep1);

// ... other routes for step2, step3, etc. ...

app.use('/api/article', apiRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

// 11) Exports & Cloud Run entrypoint
exports.app = app;

if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend listening on http://0.0.0.0:${PORT}`);
  });
}
