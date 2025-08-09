import React from 'react';
import { useAppContext } from '../context/AppContext.js';
import { Button, Input, Card } from './index.js';
import DOMPurify from 'dompurify';

const GenerationWorkflow = () => {
    const { state, dispatch, handleStep1, handleStep2, handleStep3, handleStep4, handleStep5, handleStartOver } = useAppContext();
    const { loading, error, currentStep, subject, keywords, step1Result, step2Result, step3Result, generatedArticleHtml, seoReport } = state;

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <Card className="p-8">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Step 1: Define Your Article Subject</h2>
                        <Input placeholder="Enter article subject here..." value={subject} onChange={(e) => dispatch({ type: 'SET_SUBJECT', payload: e.target.value })} className="mb-6" />
                        <Button onClick={() => handleStep1(subject)} disabled={loading || !subject.trim()} className="w-full">
                            {loading ? 'Generating Keywords...' : 'Generate Keywords'}
                        </Button>
                    </Card>
                );
            case 1:
                return (
                    <Card className="p-8">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Step 2: Review Keywords & Outline</h2>
                        <p className="text-xl font-semibold text-gray-700">Final Subject: {step1Result.subiect_final}</p>
                        <p className="mt-2"><strong>Primary Keyword:</strong> {step1Result.cuvant_cheie_principal}</p>
                        <p className="mt-1"><strong>Secondary Keywords:</strong> {step1Result.cuvinte_cheie_secundare_lsi?.join(', ')}</p>
                        <p className="mt-1"><strong>Justification:</strong> {step1Result.justificare_alegere}</p>
                        <div className="mt-6 flex space-x-4">
                            <Button onClick={handleStep2} disabled={loading} className="flex-1">
                                {loading ? 'Generating Outline...' : 'Generate Outline'}
                            </Button>
                            <Button onClick={handleStartOver} disabled={loading} className="flex-1 bg-gray-500 hover:bg-gray-600">Start Over</Button>
                        </div>
                    </Card>
                );
            case 2:
                return (
                    <Card className="p-8">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Step 3: Review Article Structure</h2>
                        <p className="text-xl font-semibold text-gray-700">Proposed Meta Title: {step2Result.meta_titlu_propus}</p>
                        <p className="mt-2"><strong>Proposed Meta Description:</strong> {step2Result.meta_descriere_propusa}</p>
                        <h3 className="text-2xl font-bold mt-6 mb-4">Article Outline:</h3>
                        <ul className="list-disc list-inside space-y-2">
                            {step2Result.structura_articol?.map((section, index) => (
                                <li key={index}>
                                    <strong>{section.titlu_h2}</strong>
                                    <ul className="list-disc list-inside ml-4 space-y-1">
                                        {section.subteme_h3?.map((subtheme, subIndex) => (
                                            <li key={subIndex}>{subtheme}</li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6 flex space-x-4">
                            <Button onClick={handleStep3} disabled={loading} className="flex-1">
                                {loading ? 'Generating Research...' : 'Generate Research & References'}
                            </Button>
                            <Button onClick={handleStartOver} disabled={loading} className="flex-1 bg-gray-500 hover:bg-gray-600">Start Over</Button>
                        </div>
                    </Card>
                );
            case 3:
                return (
                    <Card className="p-8">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Step 4: Generate Final Article</h2>
                        <h3 className="text-2xl font-bold mt-6 mb-4">Expert Insights & Resources:</h3>
                        <ul className="list-disc list-inside space-y-2">
                            {step3Result.autori_concepte?.map((author, index) => (
                                <li key={index}>
                                    <strong>{author.nume_autor}</strong> ({author.concept}): "{author.citat_sau_idee}"
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6 flex space-x-4">
                            <Button onClick={handleStep4} disabled={loading} className="flex-1">
                                {loading ? 'Generating Full Article...' : 'Generate Full Article'}
                            </Button>
                            <Button onClick={handleStartOver} disabled={loading} className="flex-1 bg-gray-500 hover:bg-gray-600">Start Over</Button>
                        </div>
                    </Card>
                );
            case 4:
                return (
                    <Card className="p-8">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Step 5: Article Review & SEO Analysis</h2>
                        <div className="prose max-w-none p-6 border border-gray-200 rounded-xl bg-gray-50 overflow-x-auto" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedArticleHtml) }}></div>
                        <div className="mt-6 flex space-x-4">
                            <Button onClick={handleStep5} disabled={loading} className="flex-1">
                                {loading ? 'Analyzing SEO...' : 'Generate SEO Report'}
                            </Button>
                            <Button onClick={handleStartOver} disabled={loading} className="flex-1 bg-gray-500 hover:bg-gray-600">Start Over</Button>
                        </div>
                    </Card>
                );
            case 5:
                return (
                    <Card className="p-8">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Article Generation Complete!</h2>
                        <h3 className="text-2xl font-bold text-green-600">SEO Report:</h3>
                        <p className="mt-2"><strong>General Score:</strong> {seoReport?.scor_general || 'N/A'}</p>
                        <pre className="mt-4 p-4 rounded-xl bg-gray-100 text-sm overflow-x-auto">{JSON.stringify(seoReport, null, 2)}</pre>
                        <h3 className="text-2xl font-bold mt-8 mb-4">Final Article:</h3>
                        <div className="prose max-w-none p-6 border border-gray-200 rounded-xl bg-gray-50 overflow-x-auto" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedArticleHtml) }}></div>
                        <div className="mt-6">
                            <Button onClick={handleStartOver} className="w-full bg-blue-600 hover:bg-blue-700">Start New Generation</Button>
                        </div>
                    </Card>
                );
            default:
                return null;
        }
    };

    return <main className="w-full max-w-6xl space-y-8">{renderStepContent()}</main>;
};

export default GenerationWorkflow;
