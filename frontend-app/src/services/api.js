import { getAuth } from 'firebase/auth';

// Use same-origin in prod (Firebase Hosting → Cloud Run rewrite).
// In dev, point to your local backend (or set VITE_API_BASE).
const API_BASE = '/api';

const getAuthHeader = async (auth) => {
    const user = (auth ?? getAuth()).currentUser;
    if (!user) throw new Error('User not authenticated. Please log in.');
    const idToken = await user.getIdToken();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` };
};

// Helper: parse JSON safely (CORS/503 often returns HTML/plain text)
const parseMaybeJson = async (res) => {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { error: text || res.statusText }; }
};

const callApi = async (url, body, auth) => {
    const headers = await getAuthHeader(auth);

    // Abort after 28s so you control the error (Cloud Run LB ~30s)
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 28_000);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        const data = await parseMaybeJson(res);
        if (!res.ok) {
            const msg = data?.error || `HTTP ${res.status}`;
            throw new Error(msg);
        }
        return data;
    } finally {
        clearTimeout(t);
    }
};

// Public API
export const generateStep1 = (initialSubject, auth) =>
    callApi(`${API_BASE}/article/step1`, { initialSubject }, auth);

export const generateStep2 = (finalSubject, keywords, auth) =>
    callApi(`${API_BASE}/article/step2`, { finalSubject, keywords }, auth);

export const generateStep3 = (finalSubject, articleOutline, auth) =>
    callApi(`${API_BASE}/article/step3`, { finalSubject, articleOutline }, auth);

export const generateStep4 = (finalSubject, step1Result, step2Result, step3Result, auth) =>
    callApi(`${API_BASE}/article/step4`, { finalSubject, step1Result, step2Result, step3Result }, auth);

export const generateStep5 = (htmlArticle, keywords, auth) =>
    callApi(`${API_BASE}/article/step5`, { htmlArticle, keywords }, auth);
