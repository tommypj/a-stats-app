// utils/jsonParser.js
function normalize(s) {
  return s
    .replace(/\u00A0/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function tryParse(s) { try { return JSON.parse(s); } catch { return null; } }

function stripLeadingFence(s) {
  if (s.startsWith('```')) {
    const nl = s.indexOf('\n');
    if (nl !== -1) return s.slice(nl + 1);
  }
  return s;
}

function extractFromClosedFence(s) {
  const m = s.match(/```json\s*([\s\S]*?)\s*```/i) || s.match(/```\s*([\s\S]*?)\s*```/);
  return m?.[1]?.trim() || null;
}

function firstBalancedObjectText(s) {
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1).trim();
}

// Heuristic repair for truncated JSON
function closeCommonTruncations(txt) {
  let s = txt;

  const quotes = (s.match(/(?<!\\)"/g) || []).length;
  if (quotes % 2 !== 0) s += '"';

  const opens = (s.match(/{/g) || []).length;
  const closes = (s.match(/}/g) || []).length;
  const openArr = (s.match(/\[/g) || []).length;
  const closeArr = (s.match(/]/g) || []).length;

  if (openArr > closeArr) s += ']'.repeat(openArr - closeArr);
  if (opens > closes) s += '}'.repeat(opens - closes);

  return s;
}

function truncateToLastValidJson(s) {
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  let candidate = s.slice(start, end + 1).trim();
  let repaired = closeCommonTruncations(candidate);
  let parsed = tryParse(repaired);
  if (parsed) return parsed;

  for (let i = end; i > start; i--) {
    if (!'}"] ,'.includes(s[i])) continue;
    candidate = s.slice(start, i + 1).trim();
    repaired = closeCommonTruncations(candidate);
    parsed = tryParse(repaired);
    if (parsed) return parsed;
  }
  return null;
}

function parseGeminiJSON(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Failed to parse JSON response: răspuns gol sau nevalid.');
  }

  let text = normalize(raw).trim();

  const pure = tryParse(text);
  if (pure) return pure;

  const fenced = extractFromClosedFence(text);
  if (fenced) {
    const pf = tryParse(normalize(fenced));
    if (pf) return pf;
  }

  if (text.startsWith('```')) {
    text = stripLeadingFence(text);
    const p2 = tryParse(text);
    if (p2) return p2;
  }

  const block = firstBalancedObjectText(text);
  if (block) {
    const pb = tryParse(block) || truncateToLastValidJson(block);
    if (pb) return pb;
  }

  const pt = truncateToLastValidJson(text);
  if (pt) return pt;

  const preview = text.slice(0, 160).replace(/\s+/g, ' ');
  throw new Error(`Failed to parse JSON response at Etapa 3: Unexpected token near "${preview}"`);
}

module.exports = { parseGeminiJSON };
