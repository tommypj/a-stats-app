// validators/validators.js
const Joi = require('joi');

class InputValidator {
  constructor() {
    // Schema for Step 1 validation
    this.step1Schema = Joi.object({
      initialSubject: Joi.string().min(3).required()
    });

    // Schema for Step 2 validation
    this.step2Schema = Joi.object({
      finalSubject: Joi.string().min(3).required(),
      keywords: Joi.string().min(3).required()
    });

    // Schema for Step 3 validation
    this.step3Schema = Joi.object({
      finalSubject: Joi.string().min(3).required(),
      articleOutline: Joi.array().items(Joi.object({
        titlu_h2: Joi.string().min(1).required(),
        subteme_h3: Joi.array().items(Joi.string().min(1)).min(1)
      })).min(1).required()
    });

    // Sub-schemas for nested data in Step 4
    const step1ResultSchema = Joi.object({
      subiect_final: Joi.string().required(),
      cuvant_cheie_principal: Joi.string().required(),
      cuvinte_cheie_secundare_lsi: Joi.array().items(Joi.string()),
      cuvinte_cheie_long_tail: Joi.array().items(Joi.string())
    });

    const step2ResultSchema = Joi.object({
      structura_articol: Joi.array().items(Joi.object({
        titlu_h2: Joi.string().required(),
        subteme_h3: Joi.array().items(Joi.string())
      })).required(),
      unghi_unic: Joi.string().required(),
      meta_titlu_propus: Joi.string().required(),
      meta_descriere_propusa: Joi.string().required()
    });

    const step3ResultSchema = Joi.object({
      autori_concepte: Joi.array().items(Joi.object({
        nume_autor: Joi.string().required(),
        concept: Joi.string().required(),
        citat_sau_idee: Joi.string().required()
      })).required(),
      idei_statistici: Joi.array().items(Joi.string()),
      surse_externe_sugerate: Joi.array().items(Joi.string())
    });

    // Schema for Step 4 validation
    this.step4Schema = Joi.object({
      finalSubject: Joi.string().required(),
      step1Result: step1ResultSchema.required(),
      step2Result: step2ResultSchema.required(),
      step3Result: step3ResultSchema.required()
    });

    // Schema for Step 5 validation
    this.step5Schema = Joi.object({
      htmlArticle: Joi.string().required(),
      keywords: Joi.string().min(3).required()
    });
    
    // The master schema for the old single-route approach.
    // This can be kept for consistency but is now less critical with new routes.
    this.articleRequestSchema = Joi.object({
      action: Joi.string().valid('generateArticle', 'summarizeArticle', 'expandSection').required(),
      subject: Joi.string().when('action', { is: 'generateArticle', then: Joi.required() }),
      articleContent: Joi.string().when('action', { is: ['summarizeArticle', 'expandSection'], then: Joi.required() }),
      sectionTitle: Joi.string().when('action', { is: 'expandSection', then: Joi.required() })
    });
  }

  validateStep1Request(data) {
    return this.validate(this.step1Schema, data);
  }

  validateStep2Request(data) {
    return this.validate(this.step2Schema, data);
  }

  validateStep3Request(data) {
    return this.validate(this.step3Schema, data);
  }

  validateStep4Request(data) {
    return this.validate(this.step4Schema, data);
  }

  validateStep5Request(data) {
    return this.validate(this.step5Schema, data);
  }

  validate(schema, data) {
    const { error, value } = schema.validate(data);
    if (error) {
      const errorMessage = error.details.map(d => d.message).join('; ');
      throw new Error(`Validation Error: ${errorMessage}`);
    }
    return value;
  }
}

module.exports = InputValidator;
