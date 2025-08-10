const { parseGeminiJSON } = require('../../utils/jsonParser');

module.exports = async (model, finalSubject, articleOutline, userId, generateContent, validator) => {
    const prompt = `Pentru articolul cu subiectul "${finalSubject}" și structura ${JSON.stringify(articleOutline, null, 2)}, identifică 3-5 concepte cheie de la autori renumiți în psihoterapie (ex: Sigmund Freud, Carl Jung, Carl Rogers, Aaron Beck, Irvin Yalom, Viktor Frankl) relevante pentru sub-temele identificate. Pentru fiecare concept, propune un scurt citat reprezentativ sau o idee principală care poate fi integrată în articol. Include și 2-3 idei de statistici relevante (fără a da cifre exacte, doar tematica) și 2-3 sugestii de surse externe de autoritate (ex: numele unei instituții, o publicație). Returnează JSON strict: {"autori_concepte": [{"nume_autor": "...", "concept": "...", "citat_sau_idee": "..."}, ...], "idei_statistici": ["...", "..."], "surse_externe_sugerate": ["...", "..."]}.`;

    const resultText = await generateContent(prompt, 'Etapa 3', userId);
    const parsed = parseGeminiJSON(resultText, 'Etapa 3');
    return validator.validateStepResult(parsed, 3);
};
