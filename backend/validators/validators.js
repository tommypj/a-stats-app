// validators/validators.js
const Joi = require('joi');

class InputValidator {
  constructor() {
    // Step 1 REQUEST schema
    this.step1RequestSchema = Joi.object({
      initialSubject: Joi.string().min(3).required()
    });

    // Step 2 REQUEST schema
    this.step2Schema = Joi.object({
      finalSubject: Joi.string().min(3).required(),
      keywords: Joi.string().min(3).required()
    });

    // Step 3 REQUEST schema
    this.step3Schema = Joi.object({
      finalSubject: Joi.string().min(3).required(),
      articleOutline: Joi.array().items(Joi.object({
        titlu_h2: Joi.string().min(1).required(),
        subteme_h3: Joi.array().items(Joi.string().min(1)).min(1)
      })).min(1).required()
    });

    // RESULT schemas (used by model outputs)
    this.step1ResultSchema = Joi.object({
      subiect_final: Joi.string().required(),
      cuvant_cheie_principal: Joi.string().required(),
      cuvinte_cheie_secundare_lsi: Joi.array().items(Joi.string()),
      cuvinte_cheie_long_tail: Joi.array().items(Joi.string()),
      justificare_alegere: Joi.string().required()
    });

    this.step2ResultSchema = Joi.object({
      structura_articol: Joi.array().items(Joi.object({
        titlu_h2: Joi.string().required(),
        subteme_h3: Joi.array().items(Joi.string())
      })).required(),
      unghi_unic: Joi.string().required(),
      meta_titlu_propus: Joi.string().required(),
      meta_descriere_propusa: Joi.string().required()
    });

    this.step3ResultSchema = Joi.object({
      autori_concepte: Joi.array().items(Joi.object({
        nume_autor: Joi.string().required(),
        concept: Joi.string().required(),
        citat_sau_idee: Joi.string().required()
      })).required(),
      idei_statistici: Joi.array().items(Joi.string()),
      surse_externe_sugerate: Joi.array().items(Joi.string())
    });

    // Step 4 REQUEST schema (references the RESULT schemas above)
    this.step4Schema = Joi.object({
      finalSubject: Joi.string().required(),
      step1Result: this.step1ResultSchema.required(),
      step2Result: this.step2ResultSchema.required(),
      step3Result: this.step3ResultSchema.required()
    });

    // Step 5 REQUEST schema
    this.step5Schema = Joi.object({
      htmlArticle: Joi.string().required(),
      keywords: Joi.string().min(3).required()
    });

    // (legacy) single-route schema kept as-is …
    this.articleRequestSchema = Joi.object({
      action: Joi.string().valid('generateArticle', 'summarizeArticle', 'expandSection').required(),
      subject: Joi.string().when('action', { is: 'generateArticle', then: Joi.required() }),
      articleContent: Joi.string().when('action', { is: ['summarizeArticle', 'expandSection'], then: Joi.required() }),
      sectionTitle: Joi.string().when('action', { is: 'expandSection', then: Joi.required() })
    });
  }

   validateStep1Request(data) { return this.validate(this.step1RequestSchema, data); }
   validateStep2Request(data) { return this.validate(this.step2Schema, data); }
   validateStep3Request(data) { return this.validate(this.step3Schema, data); }

   // RESULT validators
   validateStep1Result(data) { return this.validate(this.step1ResultSchema, data); }
   validateStep2Result(data) { return this.validate(this.step2ResultSchema, data); }
   validateStep3Result(data) { return this.validate(this.step3ResultSchema, data); }
   validateStep4Request(data) { return this.validate(this.step4Schema, data); }
   validateStep5Request(data) { return this.validate(this.step5Schema, data); }

    validateStepResult(data) { 
    return this.validateStep2Result(data); 
  }

  validate(schema, data) {
    const { error, value } = schema.validate(data);
    if (error) throw new Error(`Validation Error: ${error.details.map(d => d.message).join('; ')}`);
    return value;
  }
}

module.exports = InputValidator;
