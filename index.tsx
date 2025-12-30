import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

const App = () => {
  const [original, setOriginal] = useState<{data: string, mime: string, url: string} | null>(null);
  const [processed, setProcessed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'bg' | 'model'>('model');
  
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
    if (!original) {
      setError("Por favor, envie uma imagem primeiro.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Cria a instância dentro da função para garantir que pega a API_KEY atualizada
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
        const textMsg = response.text;
        throw new Error(textMsg || "A IA não conseguiu gerar a imagem. Tente um prompt mais descritivo.");
      }
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      if (err.message?.includes("API_KEY") || err.message?.includes("403") || err.message?.includes("401")) {
        setError("Erro de Autenticação: Verifique se a API_KEY foi configurada corretamente nas Settings da Vercel.");
      } else {
        setError(err.message || "Ocorreu um erro inesperado no processamento.");
      }
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
        link.download = `zero-studio-${Date.now()}.${format === 'image/png' ? 'png' : 'jpg'}`;
        link.href = canvas.toDataURL(format, 0.95);
        link.click();
      }
    };
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans">
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-2 h-6 bg-amber-500 rounded-full"></div>
          <span className="text-[12px] font-black uppercase tracking-[0.4em]">ZeroStudio <span className="text-amber-500">PRO</span></span>
        </div>
        {processed && (
          <button onClick={downloadImage} className="bg-amber-500 text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">
            Baixar Resultado
          </button>
        )}
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row max-w-[1440px] mx-auto w-full p-6 lg:p-10 gap-10">
        <section className="flex-[1.5] bg-zinc-900/10 rounded-[2.5rem] border border-white/5 overflow-hidden flex items-center justify-center relative min-h-[450px]">
          {!original ? (
            <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-6 cursor-pointer group">
              <input type="file" ref={fileInputRef} hidden onChange={handleUpload} accept="image/*" />
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-amber-500/50 transition-all">
                <svg className="w-8 h-8 text-zinc-700 group-hover:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v16m8-8H4"/></svg>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500">Carregar Foto</p>
            </div>
          ) : (
            <div className="w-full h-full p-8 flex items-center justify-center relative">
              <img src={processed || original.url} className={`max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl transition-all duration-700 ${loading ? 'blur-xl opacity-20' : 'opacity-100'}`} />
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-500">Processando...</span>
                </div>
              )}
              {!loading && (
                <button onClick={() => {setOriginal(null); setProcessed(null); setError(null);}} className="absolute top-6 right-6 p-3 bg-black/40 hover:bg-red-500/20 rounded-full border border-white/10 transition-colors backdrop-blur-md">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
            </div>
          )}
        </section>

        <section className="flex-1 lg:max-w-[420px] flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-2 bg-zinc-900/40 p-1 rounded-2xl border border-white/5">
            <button onClick={() => handleModeChange('bg')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'bg' ? 'bg-zinc-100 text-black' : 'text-zinc-600'}`}>Fundo</button>
            <button onClick={() => handleModeChange('model')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'model' ? 'bg-zinc-100 text-black' : 'text-zinc-600'}`}>Modelo</button>
          </div>

          <div className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Instruções da IA</h2>
            <textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} className="w-full h-40 bg-zinc-900/20 border border-white/10 rounded-2xl p-5 text-[12px] text-zinc-300 outline-none focus:border-amber-500/30 transition-all resize-none shadow-inner" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-zinc-600 px-1">Qualidade</label>
              <select value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold text-zinc-400 outline-none">
                <option value="1">Normal</option>
                <option value="2">HD / 2K</option>
                <option value="4">Pro 4K</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-zinc-600 px-1">Formato</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold text-zinc-400 outline-none">
                <option value="image/png">PNG</option>
                <option value="image/jpeg">JPG</option>
              </select>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading || !original} className="w-full h-16 bg-white text-black rounded-2xl font-black text-[12px] uppercase tracking-[0.5em] hover:bg-amber-500 transition-all disabled:opacity-20 active:scale-95 shadow-xl">
            {loading ? "AGUARDE..." : "GERAR IMAGEM"}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
              <p className="text-[9px] font-bold uppercase text-red-500 tracking-widest text-center">{error}</p>
            </div>
          )}
        </section>
      </main>
      <footer className="h-10 border-t border-white/5 flex items-center justify-center text-[8px] font-black text-zinc-800 uppercase tracking-widest">
        ZeroStudio Pro Engine v4.0
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);