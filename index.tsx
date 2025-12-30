import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

const App = () => {
  const [original, setOriginal] = useState<{data: string, mime: string, url: string} | null>(null);
  const [processed, setProcessed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'bg' | 'model'>('model');
  
  // Prompts otimizados para o modelo gratuito
  const prompts = {
    bg: "Remova o fundo e substitua por branco puro (#FFFFFF). Mantenha o objeto central com cores e texturas originais.",
    model: "Substitua o suporte/manequim por uma pessoa real de forma fotorrealista. Fundo neutro de estúdio, iluminação suave."
  };

  const [userPrompt, setUserPrompt] = useState(prompts.model);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setError("Imagem muito grande. Use arquivos até 4MB.");
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
      // Inicialização segura para Vercel
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API_KEY não configurada na Vercel.");

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
        throw new Error(response.text || "A IA não conseguiu processar esta imagem específica. Tente outra foto.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão. Verifique sua chave de API nas configurações da Vercel.");
    } finally {
      setLoading(false);
    }
  };

  const download2K = () => {
    if (!processed) return;
    const img = new Image();
    img.src = processed;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Redimensiona para ~2048px (2K) para garantir boa qualidade
      const targetSize = 2048;
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetSize, targetSize);
        const link = document.createElement('a');
        link.download = `foto-2k-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };
  };

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-300 font-sans flex flex-col">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Studio Simples</span>
        </div>
        {processed && (
          <button onClick={download2K} className="bg-white text-black px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500 transition-colors">
            Baixar em 2K
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 max-w-6xl mx-auto w-full">
        {/* Preview */}
        <div className="flex-[1.5] bg-zinc-900/30 rounded-3xl border border-white/5 flex items-center justify-center relative min-h-[350px] overflow-hidden">
          {!original ? (
            <div onClick={() => fileInputRef.current?.click()} className="text-center cursor-pointer p-10">
              <input type="file" ref={fileInputRef} hidden onChange={handleUpload} accept="image/*" />
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/10">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Clique para enviar foto</p>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img src={processed || original.url} className={`max-w-full max-h-[60vh] object-contain rounded-lg transition-all ${loading ? 'blur-lg opacity-30' : 'opacity-100'}`} />
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin"></div>
                  <span className="text-[8px] font-bold uppercase tracking-widest">Processando Grátis...</span>
                </div>
              )}
              {!loading && (
                <button onClick={() => {setOriginal(null); setProcessed(null);}} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full border border-white/10 hover:bg-red-500/20">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2"/></svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="flex-1 flex flex-col gap-5">
          <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Escolha o que fazer:</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => {setMode('bg'); setUserPrompt(prompts.bg);}} className={`py-3 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${mode === 'bg' ? 'bg-zinc-100 text-black' : 'bg-white/5 text-zinc-500'}`}>Limpar Fundo</button>
              <button onClick={() => {setMode('model'); setUserPrompt(prompts.model);}} className={`py-3 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${mode === 'model' ? 'bg-zinc-100 text-black' : 'bg-white/5 text-zinc-500'}`}>Pessoa Real</button>
            </div>
            
            <textarea 
              value={userPrompt} 
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-4 text-[11px] text-zinc-400 focus:border-white/20 outline-none resize-none"
            />

            <button 
              onClick={handleGenerate} 
              disabled={loading || !original}
              className="w-full py-4 bg-amber-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all disabled:opacity-10"
            >
              Executar Edição
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-[9px] font-bold text-red-500 uppercase text-center leading-relaxed">{error}</p>
            </div>
          )}

          <div className="p-4 border border-white/5 rounded-xl bg-white/[0.02]">
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              <strong>Nota:</strong> Este app usa o Gemini 2.5 Flash. É rápido e gratuito para testes. A resolução de 2K é aplicada no momento do download para garantir nitidez.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);