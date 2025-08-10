const { parseGeminiJSON } = require('../../utils/jsonParser');

/**
 * Generates initial subject ideas and keywords for an article.
 * @param {object} model - The Gemini model instance.
 * @param {string} initialSubject - The user's initial subject idea.
 * @param {string} userId - The ID of the authenticated user.
 *  * @param {Function} generateContent - The core function to call the Gemini API.
 * @param {object} validator - An instance of the InputValidator class.
 * @returns {Promise<object>} The validated JSON object containing keywords and final subject.
 */
module.exports = async (model, initialSubject, userId, generateContent, validator) => {
    // The prompt for the Gemini model, requesting SEO-optimized keywords and a final subject.
    const prompt = `Ești un expert SEO și psihoterapeut. Generează 3 idei de subiecte detaliate pentru un articol de blog care se bazează **direct și specific** pe "${initialSubject}" (NU schimba subiectul principal, doar detaliază-l), optimizate SEO. Pentru fiecare idee, propune:
- Un cuvânt cheie principal relevant și cu volum de căutare decent.
- 5-7 cuvinte cheie secundare/LSI (variații, sinonime, termeni înrudiți semantic).
- 10 cuvinte cheie long-tail relevante cu intenția de căutare (informațională/comercială/navigațională).
Alege cel mai bun subiect și set de cuvinte cheie din lista generată, justificând alegerea, și returnează-le într-un format JSON strict, fără text suplimentar în afara blocului JSON: {"subiect_final": "...", "cuvant_cheie_principal": "...", "cuvinte_cheie_secundare_lsi": ["...", "..."], "cuvinte_cheie_long_tail": ["...", "..."], "justificare_alegere": "..."}.`;

    // Call the Gemini API to generate the content based on the prompt.
    const resultText = await generateContent(prompt, 'Etapa 1', userId);

    // Parse the raw text response from Gemini into a JSON object.
    const parsed = parseGeminiJSON(resultText, 'Etapa 1');

    // CRITICAL FIX: The original code had a TypeError here.
    // We must call the 'validate' method from the validator instance
    // and pass the correct schema for Step 1.
    return validator.validate(validator.step1Schema, parsed);
};
