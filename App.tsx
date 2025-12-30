
import React, { useState, useCallback, useRef } from 'react';
import { editImage } from './services/geminiService';
import { Spinner } from './components/Spinner';
import { GithubIcon } from './components/GithubIcon';

type ImageState = {
  base64: string;
  mimeType: string;
  dataUrl: string;
};

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const PRESETS = [
  { id: 'bg-remove', label: 'Remover Fundo', prompt: 'Remova o fundo desta imagem de forma profissional, mantendo apenas o objeto principal. O fundo deve ser totalmente transparente.', color: 'from-blue-500 to-indigo-600' },
  { id: 'enhance', label: 'Melhorar Foto', prompt: 'Melhore a nitidez, o contraste e as cores desta imagem. Torne-a vibrante e profissional, removendo ruídos.', color: 'from-emerald-500 to-teal-600' },
  { id: 'artistic', label: 'Estilo Artístico', prompt: 'Transforme esta imagem em uma pintura digital artística, com pinceladas visíveis e cores dramáticas.', color: 'from-amber-500 to-orange-600' },
  { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'Aplique um estilo cyberpunk neon, com tons de magenta e azul elétrico.', color: 'from-purple-500 to-pink-600' }
];

function App() {
  const [originalImage, setOriginalImage] = useState<ImageState | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`Ops! A imagem é muito grande. O limite é ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const [header, base64] = dataUrl.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        setOriginalImage({ base64, mimeType, dataUrl });
        setEditedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = useCallback(async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!originalImage || !activePrompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const resultBase64 = await editImage(originalImage.base64, originalImage.mimeType, activePrompt);
      if (resultBase64) {
        setEditedImage(`data:image/png;base64,${resultBase64}`);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao processar imagem.");
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, prompt]);

  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Navbar Minimalista */}
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-cyan-400 rounded-lg shadow-lg shadow-indigo-500/20"></div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Pixshop AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Galeria</a>
            <a href="#" className="hover:text-white transition-colors">Recursos</a>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-all">Limpar Tudo</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Painel de Controle (Esquerda) */}
          <div className="lg:col-span-5 space-y-8">
            <section>
              <h1 className="text-4xl font-extrabold mb-4 leading-tight">
                Transforme imagens com <br/>
                <span className="text-indigo-400">Inteligência Artificial</span>
              </h1>
              <p className="text-slate-400 text-lg">
                Remova fundos, melhore a qualidade ou crie edições complexas em segundos usando o poder do Gemini.
              </p>
            </section>

            {/* Upload Area */}
            <div 
              onClick={triggerFileSelect}
              className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 h-72 flex flex-col items-center justify-center overflow-hidden
                ${originalImage ? 'border-indigo-500/50 bg-slate-900' : 'border-slate-700 hover:border-indigo-500/50 bg-slate-900/50 hover:bg-slate-900'}`}
            >
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              
              {originalImage ? (
                <>
                  <img src={originalImage.dataUrl} className="w-full h-full object-contain p-4" alt="Preview" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white font-medium">Trocar Imagem</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <p className="font-semibold text-slate-200">Clique para fazer upload</p>
                  <p className="text-sm text-slate-500 mt-1">PNG, JPG ou WebP até 4MB</p>
                </div>
              )}
            </div>

            {/* Ações e Prompts */}
            {originalImage && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-2 gap-3">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleProcess(preset.prompt)}
                      disabled={isLoading}
                      className={`p-3 rounded-xl border border-slate-700 bg-slate-900 hover:border-indigo-500/50 text-left transition-all hover:shadow-lg hover:shadow-indigo-500/5 disabled:opacity-50`}
                    >
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${preset.color} mb-2`}></div>
                      <span className="text-sm font-bold text-slate-200">{preset.label}</span>
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Descreva uma edição customizada..."
                    className="w-full h-32 bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none placeholder:text-slate-600 transition-all"
                  />
                  <button
                    onClick={() => handleProcess()}
                    disabled={isLoading || !prompt.trim()}
                    className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all active:scale-95"
                  >
                    Editar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resultado (Direita) */}
          <div className="lg:col-span-7 flex flex-col h-full">
            <div className="flex-1 rounded-3xl bg-slate-900/40 border border-slate-800 min-h-[500px] relative overflow-hidden flex flex-col items-center justify-center p-8">
              {isLoading ? (
                <div className="text-center">
                  <Spinner />
                  <p className="mt-4 text-indigo-400 font-medium animate-pulse">A IA está processando sua imagem...</p>
                </div>
              ) : error ? (
                <div className="max-w-md text-center p-8 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <h3 className="text-lg font-bold text-red-400 mb-2">Erro na Requisição</h3>
                  <p className="text-red-300/80 text-sm">{error}</p>
                </div>
              ) : editedImage ? (
                <div className="w-full h-full flex flex-col items-center gap-6">
                  <div className="relative group flex-1 w-full flex items-center justify-center">
                    <img src={editedImage} className="max-h-full max-w-full rounded-2xl shadow-2xl object-contain" alt="Resultado" />
                  </div>
                  <div className="flex gap-4">
                    <a
                      href={editedImage}
                      download={`pixshop-ai-${Date.now()}.png`}
                      className="bg-white text-slate-950 px-8 py-3 rounded-2xl font-bold hover:bg-indigo-50 transition-colors shadow-xl"
                    >
                      Baixar Imagem
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                  </div>
                  <p className="text-slate-500 text-lg font-medium">O resultado aparecerá aqui</p>
                  <p className="text-slate-600 text-sm mt-2">Envie uma imagem e escolha uma edição para começar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6 text-slate-500 text-sm">
          <span>&copy; 2024 Pixshop AI</span>
          <a href="#" className="hover:text-slate-300">Privacidade</a>
          <a href="#" className="hover:text-slate-300">Termos</a>
        </div>
        <a 
          href="https://github.com/google/genai-js" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800"
        >
          <GithubIcon />
          <span className="text-sm font-medium">Powered by Gemini 2.5 Flash</span>
        </a>
      </footer>
    </div>
  );
}

export default App;
