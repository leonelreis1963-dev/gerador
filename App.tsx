
import React, { useState, useCallback } from 'react';
import { generateIdeas } from './services/geminiService';
import { Idea } from './types';
import { Spinner } from './components/Spinner';
import { IdeaCard } from './components/IdeaCard';
import { GithubIcon } from './components/GithubIcon';

function App() {
  const [topic, setTopic] = useState<string>('');
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!topic.trim()) {
      setError('Por favor, insira um tópico para gerar ideias.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIdeas(null);

    try {
      const result = await generateIdeas(topic);
      if (result) {
        setIdeas(result);
      } else {
        throw new Error('A API não retornou um resultado válido.');
      }
    } catch (err) {
      console.error(err);
      setError('Falha ao gerar ideias. Verifique o console e a configuração da sua chave de API na Vercel. A chave foi adicionada corretamente nas Variáveis de Ambiente do projeto?');
    } finally {
      setIsLoading(false);
    }
  }, [topic]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <main className="w-full max-w-3xl mx-auto">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 shadow-2xl shadow-purple-500/10 rounded-2xl p-8">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text mb-2">
              Gerador de Ideias com Gemini
            </h1>
            <p className="text-gray-400">
              Resolvendo o problema da chave de API na Vercel, de uma vez por todas.
            </p>
          </div>

          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-8 text-sm text-blue-200">
            <h2 className="font-bold text-lg mb-2">Como Usar e Configurar na Vercel</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>Este código usa `process.env.API_KEY` para acessar sua chave da API Gemini.</li>
              <li>Para funcionar na Vercel, vá para o dashboard do seu projeto.</li>
              <li>Acesse <span className="font-mono bg-gray-700 px-1 rounded">Settings</span> &gt; <span className="font-mono bg-gray-700 px-1 rounded">Environment Variables</span>.</li>
              <li>Adicione uma nova variável com o nome <code className="font-bold text-yellow-300 bg-gray-700 px-1.5 py-0.5 rounded">API_KEY</code>.</li>
              <li>No campo do valor, cole a sua chave de API do Google AI Studio.</li>
              <li>**Importante:** Desmarque as caixas de "Development" e "Preview" se quiser que funcione apenas em produção. Deixe todas marcadas para testar em todos os ambientes.</li>
              <li>Clique em "Save" e faça um novo deploy do seu projeto. Isso injetará a chave de forma segura!</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Digite um tópico (ex: sobremesas para o verão)"
                className="flex-grow bg-gray-900/80 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? 'Gerando...' : 'Gerar Ideias'}
              </button>
            </div>
          </form>

          <div className="mt-8 min-h-[200px]">
            {isLoading && <Spinner />}
            {error && <p className="text-red-400 text-center bg-red-900/30 p-4 rounded-lg">{error}</p>}
            {ideas && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ideas.map((idea, index) => (
                  <IdeaCard key={index} idea={idea} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
       <footer className="w-full max-w-3xl mx-auto text-center mt-8 text-gray-500">
        <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-purple-400 transition-colors">
          <GithubIcon />
          <span>Powered by Google Gemini API</span>
        </a>
      </footer>
    </div>
  );
}

export default App;
