import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

const App = () => {
  const [original, setOriginal] = useState<{data: string, mime: string, url: string} | null>(null);
  const [processed, setProcessed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'bg' | 'model'>('model');
  
  // Configurações de Exportação
  const [scale, setScale] = useState(2); 
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  
  const prompts = {
    bg: `Você é um editor de joalheria focado em e-commerce de alto padrão.
OBJETIVO: Remover o fundo atual e substituir por BRANCO PURO (#FFFFFF).
REGRA DE OURO: A joia (metal e pedras) deve permanecer 100% idêntica. Preserve sombras de contato sutis.`,
    model: `Você é um fotógrafo de moda de luxo. 
OBJETIVO: Substituir o manequim por uma modelo fotorrealista (20-25 anos) elegante.
REGRA DE OURO: A JOIA É SAGRADA. Não altere brilho, cor ou formato da peça. 
A modelo deve vestir roupas brancas neutras, fundo de estúdio infinito.`
  };

  const [userPrompt, setUserPrompt] = useState(prompts.model);

  const handleModeChange = (newMode: 'bg' | 'model') => {
    setMode(newMode);
    setUserPrompt(prompts[newMode]);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setOriginal({ data: url.split(',')[1], mime: file.type, url });
        setProcessed(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!original || !userPrompt.trim()) {
      setError("Importe uma imagem e defina as instruções.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', 
        contents: {
          parts: [
            { inlineData: { data: original.data, mimeType: original.mime } },
            { text: userPrompt }
          ]
        },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      const resultPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      
      if (resultPart?.inlineData) {
        setProcessed(`data:image/png;base64,${resultPart.inlineData.data}`);
      } else {
        // Se não houver imagem, tenta pegar o texto da resposta para explicar o erro (ex: filtro de segurança)
        const textResponse = response.text;
        throw new Error(textResponse || "A IA não gerou uma imagem. Tente um prompt mais simples ou outra foto.");
      }
    } catch (err: any) {
      console.error("Erro na API:", err);
      setError(err.message || "Erro de conexão. Verifique sua chave de API.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!processed) return;
    const img = new Image();
    img.src = processed;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const link = document.createElement('a');
        link.download = `joia-export-${Date.now()}.${format === 'image/png' ? 'png' : 'jpg'}`;
        link.href = canvas.toDataURL(format, format === 'image/jpeg' ? 0.95 : 1.0);
        link.click();
      }
    };
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans">
      
      {/* Navbar Superior */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-2 h-6 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
          <span className="text-[12px] font-black uppercase tracking-[0.4em] text-white">ZeroStudio <span className="text-amber-500">PRO</span></span>
        </div>
        <div className="flex items-center gap-4">
          {processed && (
            <button 
              onClick={downloadImage}
              className="bg-amber-500 text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all active:scale-95"
            >
              Exportar Agora
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row max-w-[1440px] mx-auto w-full p-6 lg:p-10 gap-10 overflow-hidden">
        
        {/* Painel de Preview (Esquerda) */}
        <section className="flex-[1.5] bg-zinc-900/10 rounded-[2.5rem] border border-white/5 overflow-hidden flex items-center justify-center relative min-h-[450px] shadow-2xl">
          {!original ? (
            <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-6 cursor-pointer group">
              <input type="file" ref={fileInputRef} hidden onChange={handleUpload} accept="image/*" />
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-amber-500/50 group-hover:bg-amber-500/5 transition-all duration-500">
                <svg className="w-8 h-8 text-zinc-700 group-hover:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v16m8-8H4"/></svg>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 group-hover:text-zinc-200">Importar Joia Original</p>
            </div>
          ) : (
            <div className="w-full h-full p-8 flex items-center justify-center relative">
              <img 
                src={processed || original.url} 
                className={`max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl transition-all duration-700 ${loading ? 'blur-2xl opacity-20 scale-95' : 'opacity-100 scale-100'}`} 
              />
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-md rounded-2xl">
                  <div className="w-12 h-12 border-2 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.8em] text-amber-500 animate-pulse">Renderizando...</span>
                </div>
              )}
              {!loading && (
                <button onClick={() => {setOriginal(null); setProcessed(null); setError(null);}} className="absolute top-6 right-6 p-3 bg-black/40 hover:bg-red-500/20 hover:text-red-500 rounded-full border border-white/10 transition-colors backdrop-blur-md">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
            </div>
          )}
        </section>

        {/* Painel de Controle (Direita) */}
        <section className="flex-1 lg:max-w-[480px] flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Modos Rápidos */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-900/40 p-1.5 rounded-2xl border border-white/5">
            <button 
              onClick={() => handleModeChange('bg')}
              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'bg' ? 'bg-zinc-100 text-black shadow-lg' : 'text-zinc-600 hover:text-white'}`}
            >
              Fundo Branco
            </button>
            <button 
              onClick={() => handleModeChange('model')}
              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'model' ? 'bg-zinc-100 text-black shadow-lg' : 'text-zinc-600 hover:text-white'}`}
            >
              Modelo Luxo
            </button>
          </div>

          {/* Editor de Prompt */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Instruções Manuais</h2>
              <button onClick={() => setUserPrompt(prompts[mode])} className="text-[8px] font-bold text-amber-500/50 hover:text-amber-500 uppercase">Resetar Prompt</button>
            </div>
            <textarea 
              value={userPrompt} 
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 lg:h-64 bg-zinc-900/20 border border-white/10 rounded-2xl p-5 text-[12px] text-zinc-300 leading-relaxed outline-none focus:border-amber-500/30 transition-all resize-none shadow-inner"
              placeholder="Descreva as alterações..."
            />
          </div>

          {/* Opções de Exportação */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 px-1">Qualidade Final</label>
              <select 
                value={scale} 
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold uppercase text-zinc-400 outline-none hover:border-white/20 transition-all"
              >
                <option value="1">Padrão (1024px)</option>
                <option value="2">HD / 2K (2048px)</option>
                <option value="3">UHD / 3K (3072px)</option>
                <option value="4">Professional 4K</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 px-1">Formato</label>
              <select 
                value={format} 
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold uppercase text-zinc-400 outline-none hover:border-white/20 transition-all"
              >
                <option value="image/png">PNG (Qualidade)</option>
                <option value="image/jpeg">JPEG (Otimizado)</option>
              </select>
            </div>
          </div>

          {/* Botão de Ação */}
          <button 
            onClick={handleGenerate} 
            disabled={loading || !original}
            className="w-full h-16 bg-white text-black rounded-2xl font-black text-[12px] uppercase tracking-[0.5em] hover:bg-amber-500 transition-all disabled:opacity-5 active:scale-95 shadow-xl shadow-white/5"
          >
            {loading ? "Processando..." : "GERAR VERSÃO"}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl animate-in slide-in-from-top-2">
              <div className="flex gap-3 items-start">
                 <div className="mt-1 text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 <p className="text-[10px] font-bold uppercase text-red-500 tracking-widest leading-relaxed">
                   {error}
                 </p>
              </div>
            </div>
          )}

          {/* Guia Visual */}
          <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 mt-auto">
             <div className="flex items-center gap-3 mb-2">
               <div className="w-1 h-3 bg-amber-500/30 rounded-full"></div>
               <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Dica Profissional</h4>
             </div>
             <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">
               Se a IA retornar erro, tente remover termos como "fotorrealista" ou "elegante" e descreva apenas as roupas e o cenário. Imagens com rostos muito próximos podem ser bloqueadas por privacidade.
             </p>
          </div>
        </section>
      </main>

      <footer className="h-12 border-t border-white/5 flex items-center justify-center text-[8px] font-black uppercase tracking-[1em] text-zinc-800">
        AI Studio Professional High Fidelity Engine v3.1
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);