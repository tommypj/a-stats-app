// generationSteps/step2_outline.js
const { parseGeminiJSON } = require('../../utils/jsonParser');

module.exports = async (model, finalSubject, keywords, userId, generateContent, validator) => {
  const prompt = `... return strict JSON with keys:
  structura_articol (array of { titlu_h2, subteme_h3[] }),
  unghi_unic, meta_titlu_propus, meta_descriere_propusa ...`;

  const text = await generateContent(prompt, 'Etapa 2', userId);
  const parsed = parseGeminiJSON(text, 'Etapa 2');

  // Either of these now works thanks to the shim:
  // return validator.validateStepResult(parsed);
  return validator.validate(validator.step2ResultSchema, parsed);
};
