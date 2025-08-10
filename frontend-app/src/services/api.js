import { getAuth } from 'firebase/auth';

const API_BASE = '/api';

const getAuthHeader = async (auth) => {
    console.log('🔍 DEBUG: Getting auth header...');
    console.log('🔍 DEBUG: Auth object passed:', !!auth);
    
    const user = (auth ?? getAuth()).currentUser;
    console.log('🔍 DEBUG: Current user:', user ? user.uid : 'No user');
    
    if (!user) {
        console.error('❌ DEBUG: User not authenticated');
        throw new Error('User not authenticated. Please log in.');
    }
    
    console.log('✅ DEBUG: User found:', user.uid);
    
    const idToken = await user.getIdToken();
    console.log('✅ DEBUG: Token obtained, length:', idToken.length);
    console.log('✅ DEBUG: Token preview:', idToken.substring(0, 50) + '...');
    
    return { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${idToken}` 
    };
};

const parseMaybeJson = async (res) => {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { error: text || res.statusText }; }
};

const callApi = async (url, body, auth) => {
    console.log('🚀 DEBUG: Making API call to:', url);
    console.log('🚀 DEBUG: Request body:', body);
    
    const headers = await getAuthHeader(auth);
    console.log('🚀 DEBUG: Headers prepared:', Object.keys(headers));

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 60_000);

    try {
        console.log('📡 DEBUG: Sending request...');
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        console.log('📡 DEBUG: Response status:', res.status);
        console.log('📡 DEBUG: Response headers:', [...res.headers.entries()]);
        
        const data = await parseMaybeJson(res);
        console.log('📡 DEBUG: Response data:', data);
        
        if (!res.ok) {
            const msg = data?.error || `HTTP ${res.status}`;
            throw new Error(msg);
        }
        return data;
    } finally {
        clearTimeout(t);
    }
};

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