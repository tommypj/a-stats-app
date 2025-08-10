const { parseGeminiJSON } = require('../../utils/jsonParser');

module.exports = async (model, finalSubject, keywords, userId, generateContent, validator) => {
    const prompt = `Pe baza subiectului "${finalSubject}" și a cuvintelor cheie relevante "${keywords}", simulează o analiză a concurenței pe Google. Identifică 3-5 sub-teme esențiale sau întrebări frecvente pe care concurența le abordează (ou nu suficient), și propune un unghi unic sau o lacună de conținut pe care articolul nostru le poate exploata. Structurează articolul în secțiuni (H2) și sub-secțiuni (H3) logice pentru un articol de aproximativ 1200 de cuvinte.
Propune un Meta Titlu concis (50-60 de caractere) care să includă cuvântul cheie principal și să fie convingător.
Propune o Meta Descriere succintă (150-160 de caractere) a conținutului paginii.
Returnează JSON strict: {"structura_articol": [{"titlu_h2": "...", "subteme_h3": ["...", "..."]}, ...], "unghi_unic": "...", "meta_titlu_propus": "...", "meta_descriere_propusa": "..."}.
**Asigură-te că răspunsul JSON este complet și valid, fără trunchieri sau erori de formatare.**`;

    const resultText = await generateContent(prompt, 'Etapa 2', userId);
    const parsed = parseGeminiJSON(resultText, 'Etapa 2');
    return validator.validateStepResult(parsed, 2);
};
