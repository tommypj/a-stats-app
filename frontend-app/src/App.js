import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider, useAppContext } from './context/AppContext.js';
import AuthForm from './components/AuthForm.js';
import GenerationWorkflow from './components/GenerationWorkflow.js';
import ArticleHistory from './components/ArticleHistory.js';
import { Button, Alert } from './components/index.js';

// Main App Component
function AppContent() {
    const { state, handleLogout } = useAppContext();
    const { isAuthReady, isLoggedIn, error, auth, loading } = state;

    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 text-center">
                <div className="flex flex-col items-center">
                    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="mt-4 text-lg text-gray-700 font-semibold">Loading and authenticating...</p>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return <AuthForm />;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center space-y-8">
            <header className="w-full max-w-6xl flex justify-between items-center bg-white p-6 rounded-2xl shadow-xl">
                <h1 className="text-4xl font-bold text-blue-700">Generato AI Dashboard</h1>
                <div className="flex items-center space-x-4">
                    <p className="text-lg font-medium text-gray-700">Logged in as: {auth?.currentUser?.email}</p>
                    <Button onClick={handleLogout} className="bg-red-500 hover:bg-red-600">Logout</Button>
                </div>
            </header>

            {error && <Alert type="error" className="w-full max-w-6xl">{error}</Alert>}

            <GenerationWorkflow />
            <ArticleHistory />
        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<AppProvider><AppContent /></AppProvider>);
}
