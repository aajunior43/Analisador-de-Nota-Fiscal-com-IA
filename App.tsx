import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisResult as AnalysisResultComponent } from './components/AnalysisResult';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import { analyzeInvoice } from './services/geminiService';
import { AnalysisResult } from './types';

type FileStatus = 'pending' | 'analyzing' | 'success' | 'error';
type AppStatus = 'idle' | 'analyzing' | 'finished';

interface FileAnalysisState {
  status: FileStatus;
  result: AnalysisResult | null;
  error: string | null;
}

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [appStatus, setAppStatus] = useState<AppStatus>('idle');
  const [analysisStates, setAnalysisStates] = useState<Map<string, FileAnalysisState>>(new Map());
  const [fileUploadKey, setFileUploadKey] = useState(Date.now());

  const handleFileChange = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles);
    if (appStatus === 'finished') {
      setAppStatus('idle');
      setAnalysisStates(new Map());
    }
  }, [appStatus]);

  const handleAnalyzeClick = async () => {
    if (files.length === 0) return;

    setAppStatus('analyzing');
    
    // Initialize states for all files to be analyzed
    const initialStates = new Map<string, FileAnalysisState>();
    files.forEach(file => {
        initialStates.set(file.name, { status: 'pending', result: null, error: null });
    });
    setAnalysisStates(initialStates);
    
    // Process files sequentially
    for (const file of files) {
      setAnalysisStates(prev => new Map(prev).set(file.name, { ...prev.get(file.name)!, status: 'analyzing' }));
      try {
        const analysisResult = await analyzeInvoice(file);
        setAnalysisStates(prev => new Map(prev).set(file.name, { status: 'success', result: analysisResult, error: null }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
        setAnalysisStates(prev => new Map(prev).set(file.name, { status: 'error', result: null, error: `Falha na análise: ${errorMessage}`}));
      }
    }
    
    setAppStatus('finished');
  };
  
  const handleReset = () => {
      setFiles([]);
      setAppStatus('idle');
      setAnalysisStates(new Map());
      setFileUploadKey(Date.now());
  };

  const renderContent = () => {
    if (appStatus === 'idle') {
      return <FileUpload key={fileUploadKey} onFileChange={handleFileChange} disabled={appStatus === 'analyzing'} />;
    }

    return (
      <div className="w-full max-h-[60vh] overflow-y-auto space-y-4 pr-2">
        {files.map((file, index) => {
          const state = analysisStates.get(file.name);
          return (
            <div key={`${file.name}-${index}`} className="bg-gray-900/40 p-4 rounded-lg animate-fade-in">
              <p className="font-semibold text-white truncate mb-3">{file.name}</p>
              {state?.status === 'analyzing' && (
                <div className="flex items-center gap-3 text-white">
                  <SpinnerIcon className="w-6 h-6 animate-spin text-indigo-400" />
                  <span>Analisando...</span>
                </div>
              )}
              {state?.status === 'success' && state.result && (
                <AnalysisResultComponent result={state.result} />
              )}
              {state?.status === 'error' && (
                <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg">
                  <h3 className="font-bold text-red-400">Erro na Análise</h3>
                  <p className="mt-2 text-gray-300 text-sm">{state.error}</p>
                </div>
              )}
               {state?.status === 'pending' && (
                <div className="flex items-center gap-3 text-gray-400">
                  <span>Aguardando na fila...</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const isAnalyzing = appStatus === 'analyzing';

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gray-900 text-white">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Analisador de Nota Fiscal
          </h1>
          <p className="text-gray-400 mt-2">
            Use o poder da IA do Gemini para validar seus documentos fiscais.
          </p>
        </header>

        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl shadow-indigo-900/20 p-6 md:p-8 min-h-[250px] flex flex-col justify-center items-center">
          {renderContent()}
        </div>
        
        <footer className="mt-8 flex justify-center gap-4">
            {(appStatus === 'finished' || isAnalyzing) && (
                <button
                    onClick={handleReset}
                    disabled={isAnalyzing}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isAnalyzing ? 'Cancelar' : 'Analisar Novos Documentos'}
                </button>
            )}

            {appStatus === 'idle' && files.length > 0 && (
                 <button
                    onClick={handleAnalyzeClick}
                    disabled={isAnalyzing}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/30 transition-all duration-300 transform hover:scale-105"
                >
                    Analisar {files.length} {files.length > 1 ? 'Notas Fiscais' : 'Nota Fiscal'}
                </button>
            )}
        </footer>
      </div>
    </main>
  );
}
