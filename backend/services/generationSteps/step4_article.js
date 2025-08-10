const { JSDOM } = require('jsdom');

/**
 * Generates the complete HTML for the blog article.
 * @param {object} model - The Gemini model instance.
 * @param {string} finalSubject - The final chosen article subject.
 * @param {object} step1Result - Results from step 1 (keywords, justification).
 * @param {object} step2Result - Results from step 2 (outline, meta data).
 * @param {object[]} autori_concepte - Concepts from step 3.
 * @param {string[]} idei_statistici - Statistics ideas from step 3.
 * @param {string[]} surse_externe_sugerate - External sources from step 3.
 * @param {string} meta_titlu_propus - Proposed meta title.
 * @param {string} meta_descriere_propusa - Proposed meta description.
 * @param {object[]} structura_articol - The article outline from step 2.
 * @param {string} userId - The ID of the authenticated user.
 * @param {Function} generateContent - The core function to call the Gemini API.
 * @returns {Promise<string>} The generated HTML article content.
 */
module.exports = async (model, finalSubject, step1Result, step2Result, autori_concepte, idei_statistici, surse_externe_sugerate, meta_titlu_propus, meta_descriere_propusa, structura_articol, userId, generateContent) => {
    const prompt = `
        Ești un expert în crearea de conținut SEO și psihoterapeut. Redactează un articol de blog complet de **aproximativ 1200-1500 de cuvinte**, pe subiectul "${finalSubject}".
        FORMATUL DE IEȘIRE TREBUIE SĂ FIE DOAR HTML VALID, CURAT ȘI GATA DE COPY-PASTE ÎNTR-UN SITE, FĂRĂ TEXT SUPLIMENTAR SAU MARKDOWN ÎN AFARA HTML-ului.
        Articolul trebuie să respecte următoarele criterii de calitate, SEO și user-friendliness:

        <!DOCTYPE html>
        <html lang="ro">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${meta_titlu_propus}</title>
            <meta name="description" content="${meta_descriere_propusa}">
            <style>
                /* Stiluri de bază pentru lizibilitate și aspect modern */
                body { font-family: 'Arial', sans-serif; line-height: 1.7; color: #333; margin: 20px; max-width: 800px; margin: 0 auto; padding: 20px; }
                h1, h2, h3 { font-weight: bold; color: #2c3e50; margin-top: 2em; margin-bottom: 0.8em; line-height: 1.2; }
                h1 { font-size: 2.2em; text-align: center; }
                h2 { font-size: 1.8em; color: #3498db; }
                h3 { font-size: 1.4em; }
                p { margin-bottom: 1em; text-align: justify; }
                ul, ol { margin-bottom: 1em; padding-left: 25px; }
                li { margin-bottom: 0.5em; }
                strong { color: #000; }
                blockquote { border-left: 4px solid #ccc; padding-left: 15px; margin: 1.5em 0; font-style: italic; color: #555; }
                a { color: #3498db; text-decoration: none; }
                a:hover { text-decoration: underline; }
                .table-of-contents { background-color: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 30px; }
                .table-of-contents ul { padding-left: 0; }
                .table-of-contents li { margin-bottom: 0.5em; }
                .table-of-contents a { font-weight: bold; }
                .highlight-box { background-color: #e6f7ff; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .highlight-box p { margin: 0; font-style: italic; }
                .cta-block { background-color: #d4edda; color: #155724; padding: 25px; text-align: center; border-radius: 8px; margin-top: 40px; border: 1px solid #c3e6cb; }
                .cta-block h2 { color: #155724; margin-top: 0; }
                .cta-block a { background-color: #28a745; color: white; padding: 12px 25px; border-radius: 5px; text-decoration: none; display: inline-block; font-weight: bold; }
                @media (max-width: 768px) {
                    body { margin: 10px; padding: 10px; }
                    h1 { font-size: 1.8em; }
                    h2 { font-size: 1.5em; }
                    h3 { font-size: 1.2em; }
                }
            </style>
        </head>
        <body>
            <div class="table-of-contents">
                <h2 style="color: #2c3e50; margin-top: 0;">Cuprins:</h2>
                <ul style="list-style-type: none; padding: 0;">
                    ${structura_articol.map((section, index) => {
                        const sectionId = `section-${index + 1}`;
                        let listItem = `<li><a href="#${sectionId}" style="color: #3498db; text-decoration: none; font-weight: bold;">${section.titlu_h2}</a>`;
                        if (section.subteme_h3 && section.subteme_h3.length > 0) {
                            listItem += `<ul style="list-style-type: none; padding-left: 20px; font-size: 0.95em;">`;
                            section.subteme_h3.forEach((subtheme, subIndex) => {
                                const subSectionId = `${sectionId}-${subIndex + 1}`;
                                listItem += `<li><a href="#${subSectionId}" style="color: #555; text-decoration: none;">${subtheme}</a></li>`;
                            });
                            listItem += `</ul>`;
                        }
                        listItem += `</li>`;
                        return listItem;
                    }).join('')}
                </ul>
            </div>

            <h1>${finalSubject}</h1>

            <p><strong>Introducere:</strong> Creează o introducere captivantă de 2-3 paragrafe care explică pe scurt ce este "${finalSubject}", de ce este importantă pentru cititor și ce va învăța din articol. Integrează cuvântul cheie principal "${step1Result.cuvant_cheie_principal}" natural în text. Folosește un ton primitor, empatic și profesional.</p>

            ${structura_articol.map((section, index) => {
                const sectionId = `section-${index + 1}`;
                let sectionContent = `<h2 id="${sectionId}">${section.titlu_h2}</h2>`;
                
                // ADJUSTED: Promote conciseness for H2 sections
                sectionContent += `<p>Dezvoltă această secțiune con 1-3 paragrafe esențiali e concisi, oferindo informazioni pratici e validati științifici. Integrează cuvintele cheie secundare relevante pentru această secțiune: ${step1Result.cuvinte_cheie_secundare_lsi.join(', ')}. Include, dacă este cazul, o listă cu bullet points sau numerotată.</p>`;
                
                if (section.subteme_h3 && section.subteme_h3.length > 0) {
                    sectionContent += `<p><strong>${section.subteme_h3.join(', ')}</strong></p>`;
                }
                return sectionContent;
            }).join('')}

            <h2>Perspective din Psihoterapie: Ce spun Experți</h2>
            <p>Domeniul psihoterapiei oferă fundamentele științifice pentru înțelegerea ${finalSubject}. Iată ce ne învață cercetătorii:</p>
            ${autori_concepte.map(author => `
                <blockquote>
                    <p><strong>${author.nume_autor}</strong> (${author.concept}): "${author.citat_sau_idee}"</p>
                </blockquote>
            `).join('')}

            <p>Importanța unor statistici relevante în domeniu, menționate de ${idei_statistici.join(' ')}, arată că provocările psihologice sunt comune, afectând milioane de oameni la nivel global. Acest lucru subliniază necesitatea abordărilor validate științific.</p>
            
            <h2>Resurse Suplimentare</h2>
            <ul>
                <li>Para información validada sobre salud mental: <a href="https://www.who.int/health-topics/mental-health" rel="nofollow">Organizația Mondială a Sănătății (OMS)</a></li>
                <li>Psihoterapeuți acreditați: <a href="https://www.copsi.ro" rel="nofollow">Colegiul Psihologilor din România</a></li>
                <li>Studii științifice: <a href="https://scholar.google.com/" rel="nofollow">Google Scholar</a></li>
                <li>Publicații de specialitate: <a href="https://pubmed.ncbi.nlm.nih.gov/" rel="nofollow">PubMed</a></li>
                ${surse_externe_sugerate.map(source => `<li>${source}</li>`).join('')}
            </ul>

            <h2>Concluzie: O Călătorie Spre Binele Tău</h2>
            <p>Rezumă principalele beneficii ale gestionării ${finalSubject} și încurajează cititorul să ia măsuri concrete. Subliniază importanța sprijinului profesional și a perseverenței în procesul de îmbunătățire a bunăstării mentale.</p>
            <p>Finalizează con un mesaj puternic și pozitiv, care să încurajeze cititorul să acționeze și să își asume controlul asupra bunăstării sale mentale, punând în valoare ideea de creștere și împlinire personală.</p>

            <div class="cta-block">
                <h2>Ești pregătit să faci primul pas?</h2>
                <p>Dacă simți că acest articol a rezonat con tine și ai nevoie de sprijin specializat, nu ești singur/ă. Este un act de curaj să ceri ajutor.</p>
                <a href="https://a-stats-2e54e.web.app/contact" style="background-color: #28a745; color: white; padding: 12px 25px; border-radius: 5px; text-decoration: none; display: inline-block;">Programează o ședință acum!</a>
            </div>
        </body>
        </html>
    `;

    const resultText = await generateContent(prompt, 'Etapa 4', userId);
    
    // Using JSDOM to clean the HTML response
    const dom = new JSDOM(resultText);
    const doc = dom.window.document; 

    let bodyContent = '';
    const bodyElement = doc.querySelector('body');
    
    if (bodyElement) {
        bodyContent = bodyElement.innerHTML;
    } else {
        const tempDiv = doc.createElement('div');
        tempDiv.innerHTML = resultText;
        bodyContent = tempDiv.innerHTML; 
    }
    
    return bodyContent;
};
