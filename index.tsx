import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

const App = () => {
  const [original, setOriginal] = useState<{data: string, mime: string, url: string} | null>(null);
  const [processed, setProcessed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'bg' | 'model'>('model');
  
  const prompts = {
    bg: "Remova o fundo e substitua por branco puro (#FFFFFF). Mantenha o objeto central com cores e texturas originais, sem alterações na joia/produto.",
    model: "Substitua o manequim/suporte por uma modelo humana elegante, fotorrealista, pele natural. Fundo de estúdio neutro. A joia deve ser o foco principal e não deve ser alterada."
  };

  const [userPrompt, setUserPrompt] = useState(prompts.model);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Imagem muito pesada. Tente uma até 5MB.");
        return;
      }
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
    if (!original) return;
    setLoading(true);
    setError(null);

    try {
      // Pega a chave da Vercel
      const apiKey = process.env.API_KEY;
      
      if (!apiKey || apiKey === "undefined") {
        throw new Error("FALTA A CHAVE: Vá em Settings > Environment Variables na Vercel, adicione API_KEY e faça um REDEPLOY.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', 
        contents: {
          parts: [
            { inlineData: { data: original.data, mimeType: original.mime } },
            { text: userPrompt }
          ]
        }
      });

      const resultPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      
      if (resultPart?.inlineData) {
        setProcessed(`data:image/png;base64,${resultPart.inlineData.data}`);
      } else {
        const aiText = response.text;
        throw new Error(aiText || "A IA não conseguiu gerar a imagem. Tente uma foto mais clara ou mude o prompt.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const save2K = () => {
    if (!processed) return;
    const img = new Image();
    img.src = processed;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Forçamos a saída para 2048px (2K) como solicitado
      const size = 2048; 
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, size, size);
        const link = document.createElement('a');
        link.download = `studio-2k-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      }
    };
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-amber-500/30">
      {/* Header Fino */}
      <nav className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Studio 2K <span className="text-zinc-600">Free</span></span>
        </div>
        {processed && (
          <button onClick={save2K} className="bg-amber-500 text-black px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-white transition-all shadow-lg shadow-amber-500/10">
            Salvar em 2K (PNG)
          </button>
        )}
      </nav>

      <main className="max-w-6xl mx-auto w-full p-4 lg:p-8 flex flex-col lg:grid lg:grid-cols-12 gap-6">
        {/* Painel de Visualização */}
        <div className="lg:col-span-8 bg-zinc-900/20 border border-white/5 rounded-2xl flex flex-col items-center justify-center relative min-h-[400px] lg:min-h-[600px] overflow-hidden group">
          {!original ? (
            <div onClick={() => fileInputRef.current?.click()} className="text-center cursor-pointer p-10 hover:scale-105 transition-transform">
              <input type="file" ref={fileInputRef} hidden onChange={handleUpload} accept="image/*" />
              <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 group-hover:border-amber-500/30">
                <svg className="w-6 h-6 text-zinc-600 group-hover:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Enviar Foto Original</p>
            </div>
          ) : (
            <div className="w-full h-full p-4 flex items-center justify-center relative bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:20px_20px]">
              <img src={processed || original.url} className={`max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl transition-all duration-700 ${loading ? 'blur-2xl opacity-20' : 'opacity-100'}`} />
              
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 animate-pulse">IA Processando...</span>
                </div>
              )}

              {!loading && (
                <button onClick={() => {setOriginal(null); setProcessed(null); setError(null);}} className="absolute top-4 right-4 p-2 bg-black/80 text-white rounded-full border border-white/10 hover:bg-red-500/20 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2"/></svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Painel de Controles */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Modo</label>
              <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl">
                <button onClick={() => {setMode('bg'); setUserPrompt(prompts.bg);}} className={`py-2.5 rounded-lg text-[9px] font-bold uppercase transition-all ${mode === 'bg' ? 'bg-zinc-100 text-black shadow-md' : 'text-zinc-500'}`}>Limpar Fundo</button>
                <button onClick={() => {setMode('model'); setUserPrompt(prompts.model);}} className={`py-2.5 rounded-lg text-[9px] font-bold uppercase transition-all ${mode === 'model' ? 'bg-zinc-100 text-black shadow-md' : 'text-zinc-500'}`}>Pessoa Real</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Instruções para a IA</label>
              <textarea 
                value={userPrompt} 
                onChange={(e) => setUserPrompt(e.target.value)}
                className="w-full h-28 bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-zinc-400 focus:border-amber-500/30 outline-none resize-none transition-all"
              />
            </div>

            <button 
              onClick={handleGenerate} 
              disabled={loading || !original}
              className="w-full py-4 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-amber-500 transition-all disabled:opacity-10 active:scale-95 shadow-xl"
            >
              {loading ? "Editando..." : "Gerar Versão Profissional"}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-[9px] font-bold text-red-500 uppercase text-center leading-relaxed tracking-tight">{error}</p>
            </div>
          )}

          <div className="p-4 bg-zinc-950/50 border border-white/5 rounded-xl space-y-2">
            <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Status do Plano</h4>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-zinc-400">Gemini 2.5 Flash (Plano Gratuito Ativo)</span>
            </div>
            <p className="text-[9px] text-zinc-600 leading-relaxed italic">
              Saída otimizada para 2048px (2K). Ideal para catálogos e mídias sociais de alta fidelidade.
            </p>
          </div>
        </div>
      </main>
      
      <footer className="mt-auto h-12 flex items-center justify-center border-t border-white/5 text-[8px] font-bold text-zinc-700 uppercase tracking-[0.5em]">
        Engine v5.1 • 2000px Target Resolution
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);