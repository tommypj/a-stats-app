import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { generateStep1, generateStep2, generateStep3, generateStep4, generateStep5 } from '../services/api.js';

const AppContext = createContext();

// CRITICAL FIX: The firebaseConfig is already a JS object, so no need to parse it.
const firebaseConfig = typeof window.__firebase_config !== 'undefined' ? window.__firebase_config : {};
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';

const initialState = {
  loading: false,
  error: null,
  authError: null,
  currentStep: 0,
  isAuthReady: false,
  isLoggedIn: false,
  userId: null,
  db: null,
  auth: null,
  appId: null,
  subject: '',
  keywords: '',
  step1Result: null,
  step2Result: null,
  step3Result: null,
  generatedArticleHtml: '',
  seoReport: null,
  articleHistory: [],
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'SET_AUTH_ERROR': return { ...state, authError: action.payload };
    case 'SET_AUTH_READY': return { ...state, isAuthReady: action.payload };
    case 'SET_USER': return { ...state, isLoggedIn: !!action.payload, userId: action.payload };
    case 'SET_FIREBASE_SERVICES': return { ...state, db: action.payload.db, auth: action.payload.auth, appId: action.payload.appId };
    case 'SET_STEP': return { ...state, currentStep: action.payload };
    case 'SET_SUBJECT': return { ...state, subject: action.payload };
    case 'SET_STEP1_RESULT': return { ...state, step1Result: action.payload };
    case 'SET_STEP2_RESULT': return { ...state, step2Result: action.payload };
    case 'SET_STEP3_RESULT': return { ...state, step3Result: action.payload };
    case 'SET_GENERATED_HTML': return { ...state, generatedArticleHtml: action.payload };
    case 'SET_SEO_REPORT': return { ...state, seoReport: action.payload };
    case 'SET_KEYWORDS': return { ...state, keywords: action.payload };
    case 'SET_ARTICLE_HISTORY': return { ...state, articleHistory: action.payload };
    case 'RESET_GENERATION': return {
      ...state,
      currentStep: 0,
      subject: '',
      keywords: '',
      step1Result: null,
      step2Result: null,
      step3Result: null,
      generatedArticleHtml: '',
      seoReport: null,
    };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
      try {
        const firebaseApp = initializeApp(firebaseConfig);
        const firebaseAuth = getAuth(firebaseApp);
        const firestoreDb = getFirestore(firebaseApp);

        onAuthStateChanged(firebaseAuth, async (user) => {
          let uid = user ? user.uid : null;
          dispatch({ type: 'SET_USER', payload: uid });
          dispatch({ type: 'SET_FIREBASE_SERVICES', payload: { db: firestoreDb, auth: firebaseAuth, appId } });
          dispatch({ type: 'SET_AUTH_READY', payload: true });
        });
      } catch (e) {
        dispatch({ type: 'SET_ERROR', payload: e.message });
        dispatch({ type: 'SET_AUTH_READY', payload: true });
      }
    } else {
      dispatch({ type: 'SET_ERROR', payload: "Firebase config missing. Check index.html." });
      dispatch({ type: 'SET_AUTH_READY', payload: true });
    }
  }, []);

  useEffect(() => {
    if (state.isAuthReady && state.isLoggedIn && state.db && state.appId && state.userId) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      const fetchHistory = async () => {
        const collectionPath = `artifacts/${state.appId}/users/${state.userId}/articles`;
        const q = query(collection(state.db, collectionPath), orderBy('timestamp', 'desc'));
        unsubscribeRef.current = onSnapshot(q, (querySnapshot) => {
          const articles = [];
          querySnapshot.forEach((doc) => articles.push({ id: doc.id, ...doc.data(), generatedAt: doc.data().generatedAt?.toDate?.() }));
          dispatch({ type: 'SET_ARTICLE_HISTORY', payload: articles });
        }, (error) => {
          dispatch({ type: 'SET_ERROR', payload: error.message });
        });
      };
      fetchHistory();
    } else if (state.isAuthReady && !state.isLoggedIn) {
      dispatch({ type: 'SET_ARTICLE_HISTORY', payload: [] });
    }
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [state.isAuthReady, state.isLoggedIn, state.db, state.userId, state.appId]);

  const value = {
    state,
    dispatch,
    handleLogin: (email, password) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      signInWithEmailAndPassword(state.auth, email, password).catch(err => dispatch({ type: 'SET_AUTH_ERROR', payload: err.message })).finally(() => dispatch({ type: 'SET_LOADING', payload: false }));
    },
    handleRegister: (email, password) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      createUserWithEmailAndPassword(state.auth, email, password).catch(err => dispatch({ type: 'SET_AUTH_ERROR', payload: err.message })).finally(() => dispatch({ type: 'SET_LOADING', payload: false }));
    },
    handleGoogleLogin: () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      const provider = new GoogleAuthProvider();
      signInWithPopup(state.auth, provider).catch(err => dispatch({ type: 'SET_AUTH_ERROR', payload: err.message })).finally(() => dispatch({ type: 'SET_LOADING', payload: false }));
    },
    handleLogout: () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      signOut(state.auth).catch(err => dispatch({ type: 'SET_ERROR', payload: err.message })).finally(() => dispatch({ type: 'SET_LOADING', payload: false }));
      dispatch({ type: 'RESET_GENERATION' });
    },
    handleClearHistory: async () => {
      if (!state.isLoggedIn) {
        dispatch({ type: 'SET_ERROR', payload: 'Please log in to clear history.' });
        return;
      }
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const collectionPath = `artifacts/${state.appId}/users/${state.userId}/articles`;
        const q = query(collection(state.db, collectionPath));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(state.db);
        querySnapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        dispatch({ type: 'SET_ARTICLE_HISTORY', payload: [] });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: `Error clearing history: ${err.message}` });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    handleStep1: async (subject) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      try {
        const result = await generateStep1(subject, state.auth);
        dispatch({ type: 'SET_STEP1_RESULT', payload: result });
        const allKeywords = [result.subiect_final, ...(result.cuvinte_cheie_secundare_lsi || []), ...(result.cuvinte_cheie_long_tail || [])].filter(Boolean).join(', ');
        dispatch({ type: 'SET_KEYWORDS', payload: allKeywords });
        dispatch({ type: 'SET_STEP', payload: 1 });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: `Error at Step 1: ${err.message}` });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    handleStep2: async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      try {
        const result = await generateStep2(state.step1Result.subiect_final, state.keywords, state.auth);
        dispatch({ type: 'SET_STEP2_RESULT', payload: result });
        dispatch({ type: 'SET_STEP', payload: 2 });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: `Error at Step 2: ${err.message}` });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    handleStep3: async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      try {
        const result = await generateStep3(state.step1Result.subiect_final, state.step2Result.structura_articol, state.auth);
        dispatch({ type: 'SET_STEP3_RESULT', payload: result });
        dispatch({ type: 'SET_STEP', payload: 3 });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: `Error at Step 3: ${err.message}` });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    handleStep4: async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      try {
        const result = await generateStep4(state.step1Result.subiect_final, state.step1Result, state.step2Result, state.step3Result, state.auth);
        dispatch({ type: 'SET_GENERATED_HTML', payload: result.htmlArticle });
        dispatch({ type: 'SET_SEO_REPORT', payload: null });
        dispatch({ type: 'SET_STEP', payload: 4 });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: `Error at Step 4: ${err.message}` });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    handleStep5: async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      try {
        const result = await generateStep5(state.generatedArticleHtml, state.keywords, state.auth);
        dispatch({ type: 'SET_SEO_REPORT', payload: result.seoReport });
        await saveArticleToFirestore(state.db, state.userId, state.appId, {
          subject: state.step1Result.subiect_final,
          html: state.generatedArticleHtml,
          seoAnalysis: result.seoReport,
          generatedAt: new Date().toISOString()
        });
        dispatch({ type: 'SET_STEP', payload: 5 });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: `Error at Step 5: ${err.message}` });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    handleStartOver: () => dispatch({ type: 'RESET_GENERATION' }),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
