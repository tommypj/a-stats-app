import React from 'react';
import { useAppContext } from '../context/AppContext.js';
import { Button, Card } from './index.js';
import DOMPurify from 'dompurify';

const ArticleHistory = () => {
    const { state, handleClearHistory, dispatch } = useAppContext();
    const { loading, articleHistory, generatedArticleHtml } = state;
    
    // We display the history when not in the multi-step flow
    if (state.currentStep !== 0) {
        return null;
    }

    return (
        <main className="w-full max-w-6xl space-y-8">
            {generatedArticleHtml && (
                <Card className="p-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">Currently Generated Article</h2>
                    <div className="prose max-w-none p-6 border border-gray-200 rounded-xl bg-gray-50 overflow-x-auto" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedArticleHtml) }}></div>
                </Card>
            )}
            
            <Card>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Article History</h2>
                {articleHistory.length === 0 ? (
                    <p className="text-gray-500">No articles generated yet. Let's create one!</p>
                ) : (
                    <div>
                        <Button onClick={handleClearHistory} className="bg-red-500 hover:bg-red-600 mb-4">Clear History</Button>
                        <div className="space-y-4">
                            {articleHistory.map(article => (
                                <div key={article.id} className="bg-gray-50 p-4 rounded-xl shadow-sm flex items-center justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold text-blue-600">{article.subject}</h3>
                                        <p className="text-sm text-gray-500">Generated on: {new Date(article.generatedAt).toLocaleString()}</p>
                                    </div>
                                    <Button onClick={() => {
                                      dispatch({ type: 'SET_GENERATED_HTML', payload: article.html });
                                      dispatch({ type: 'SET_SEO_REPORT', payload: article.seoAnalysis });
                                      dispatch({ type: 'SET_STEP', payload: 5 });
                                    }}>View</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>
        </main>
    );
};

export default ArticleHistory;
