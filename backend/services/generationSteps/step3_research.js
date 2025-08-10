// generationSteps/step3_research.js
const { logger } = require('../../utils/logger');
const { parseGeminiJSON } = require('../../utils/jsonParser');

const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

// Helper: compress a large outline into a tiny list of slugs
function compressOutline(outline) {
  if (!Array.isArray(outline)) return [];
  return outline
    .map(s => String(s || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60))                   // cap each item
    .filter(Boolean)
    .slice(0, 6);                       // cap list size
}

module.exports = async function step3_research(
  model,
  finalSubject,
  articleOutline,
  userId,
  generateContent,
  validator
) {
  const stepName = 'Etapa 3 - research';

  const ok =
    (validator && typeof validator.isNonEmptyString === 'function' && validator.isNonEmptyString(finalSubject)) ||
    (validator && typeof validator.validateNonEmptyString === 'function' && validator.validateNonEmptyString(finalSubject)) ||
    (validator && typeof validator.isNonEmpty === 'function' && validator.isNonEmpty(finalSubject)) ||
    isNonEmpty(finalSubject);

  if (!ok) {
    throw new Error('Etapa 3: "finalSubject" invalid/empty.');
  }

  const tinyOutline = compressOutline(articleOutline);

  // ⚠️ Ultra-compact, JSON-only prompt with hard limits
  const promptText = `
Generează STRICT JSON (fără markdown, fără explicații).
Cheile OBLIGATORII: "expertInsights", "stats", "faq".
Dacă nu găsești conținut valid, pune array gol [], nu omite cheia.

Limite stricte:
- expertInsights: MAX 2 itemi. Câmpuri: source (<=6 cuvinte), quote (<=18 cuvinte), url (opțional).
- stats: MAX 3 itemi. Câmpuri: label (<=6 cuvinte), value (număr sau scurt șir), source (<=4 cuvinte), url (opțional).
- faq: MAX 3 itemi. Câmpuri: q (<=10 cuvinte), a (<=18 cuvinte).

Subiect: ${finalSubject}
Outline (scurt): ${JSON.stringify(tinyOutline)}

Returnează DOAR obiectul JSON cu schema:
{
  "expertInsights":[{"source":"string","quote":"string","url":"string?"}],
  "stats":[{"label":"string","value":"string|number","source":"string","url":"string?"}],
  "faq":[{"q":"string","a":"string"}]
}
`.trim();

  // Keep per-call config small & stable (no responseMimeType on v1)
  const request = {
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: {
      maxOutputTokens: Math.min(1200), // smaller to avoid MAX_TOKENS
      temperature: 0.3                        // more deterministic/concise
    }
  };

  const raw = await generateContent(request, stepName, userId);

  const data = parseGeminiJSON(raw);

  // Ensure all 3 keys exist even if model returned empties
  const payload = {
    expertInsights: Array.isArray(data.expertInsights) ? data.expertInsights.slice(0, 2) : [],
    stats: Array.isArray(data.stats) ? data.stats.slice(0, 3) : [],
    faq: Array.isArray(data.faq) ? data.faq.slice(0, 3) : []
  };

  // Final minimal shape check
  for (const k of ['expertInsights', 'stats', 'faq']) {
    if (!(k in payload)) {
      throw new Error(`Etapa 3: câmp lipsă în JSON: ${k}`);
    }
  }

  logger.info('Etapa 3 parse OK (compact)', {
    userId,
    expertInsightsCount: payload.expertInsights.length,
    statsCount: payload.stats.length,
    faqCount: payload.faq.length
  });

  return payload;
};
