const { parseGeminiJSON } = require('../../utils/jsonParser');

module.exports = async (model, initialSubject, userId, generateContent, validator) => {
    const prompt = `Ești un expert SEO și psihoterapeut. Generează 3 idei de subiecte detaliate pentru un articol de blog care se bazează **direct și specific** pe "${initialSubject}" (NU schimba subiectul principal, doar detaliază-l), optimizate SEO. Pentru fiecare idee, propune:
- Un cuvânt cheie principal relevant și cu volum de căutare decent.
- 5-7 cuvinte cheie secundare/LSI (variații, sinonime, termeni înrudiți semantic).
- 10 cuvinte cheie long-tail relevante cu intenția de căutare (informațională/comercială/navigațională).
Alege cel mai bun subiect și set de cuvinte cheie din lista generată, justificând alegerea, și returnează-le într-un format JSON strict, fără text suplimentar în afara blocului JSON: {"subiect_final": "...", "cuvant_cheie_principal": "...", "cuvinte_cheie_secundare_lsi": ["...", "..."], "cuvinte_cheie_long_tail": ["...", "..."], "justificare_alegere": "..."}.`;

    const resultText = await generateContent(prompt, 'Etapa 1', userId);
    const parsed = parseGeminiJSON(resultText, 'Etapa 1');
    return validator.validateStepResponse(parsed, 1);
};
