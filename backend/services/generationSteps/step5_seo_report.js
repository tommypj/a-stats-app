const { parseGeminiJSON } = require('../../utils/jsonParser');

/**
 * Generates an SEO analysis report for the final HTML article.
 * @param {object} model - The Gemini model instance.
 * @param {string} htmlArticle - The final HTML content of the article.
 * @param {string} keywords - The combined keywords.
 * @param {string} userId - The ID of the authenticated user.
 * @param {Function} generateContent - The core function to call the Gemini API.
 * @returns {Promise<object>} The generated SEO report object.
 */
module.exports = async (model, htmlArticle, keywords, userId, generateContent) => {
    const prompt = `
        Evaluează următorul articol HTML pentru SEO și calitate UX:

        CRITERII DE EVALUARE:
        1. **Cuvinte cheie**: Densitate și distribuție pentru: "${keywords}"
        2. **Structură HTML**: Ierarhia H1 > H2 > H3 (și H4 dacă există) și semantica.
        3. **Calitatea conținutului**: Originalitate, valoare, coerență.
        4. **Meta date**: Title și meta description.
        5. **UX**: Lizibilitate, structură, CTA-uri.

        Returnează DOAR JSON strict:
        {
            "scor_general": 85,
            "analiza_detaliata": {
                "cuvinte_cheie": {"scor": 90, "comentarii": "Densitate optimă..."},
                "structura_html": {"scor": 80, "comentarii": "Ierarhie corectă..."},
                "calitate_continut": {"scor": 85, "comentarii": "Conținut valoros..."},
                "meta_date": {"scor": 75, "comentarii": "Title și description OK..."},
                "ux_lizibilitate": {"scor": 90, "comentarii": "Structură clară..."}
            },
            "recomandari_prioritare": ["Îmbunătățire 1", "Îmbunătățire 2", "Îmbunătățire 3"],
            "status_seo": "Bun"
        }

        Articol HTML:
        ${htmlArticle.substring(0, 8000)}...
    `;

    try {
        const resultText = await generateContent(prompt, 'Etapa 5', userId);
        const parsed = parseGeminiJSON(resultText, 'Etapa 5');
        
        if (!parsed.scor_general || typeof parsed.scor_general !== 'number') {
            throw new Error('Scor general invalid');
        }
        
        parsed.scor_general = Math.max(0, Math.min(100, parsed.scor_general));
        
        return parsed;
    } catch (error) {
        logger.warn('SEO report generation failed', { error: error.message, userId });
        
        return {
            scor_general: 75,
            analiza_detaliata: {
                mesaj: "Raportul SEO nu a putut fi generat complet, dar articolul a fost creat cu succes."
            },
            recomandari_prioritare: [
                    "Verifică manual densitatea cuvintelor cheie",
                    "Asigură-te că structura H1-H3 este corectă",
                    "Revizuiește meta description și title",
                    "Verifică link-urile externe generate"
                ],
                status_seo: "Parțial analizat"
            };
        }
    };
