import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- Components ---

const Spinner = () => (
  <div className="flex flex-col items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Processando Imagem</p>
  </div>
);

// --- App ---

const App = () => {
  const [mainImg, setMainImg] = useState<{data: string, mime: string, url: string, w: number, h: number} | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [mode, setMode] = useState<'remove_bg' | 'human_model' | 'pose_ref'>('remove_bg');
  const [userPrompt, setUserPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState(90);
  const [aggressiveness, setAggressiveness] = useState(50); 

  const mainInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setMainImg({ 
          data: url.split(',')[1], 
          mime: file.type, 
          url, 
          w: img.naturalWidth, 
          h: img.naturalHeight 
        });
        setResult(null);
        setError(null);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!mainImg) return;
    
    // Verificação de segurança da API KEY antes de iniciar
    if (!process.env.API_KEY) {
      setError("Chave de API (API_KEY) não detectada. Configure-a nas variáveis de ambiente da Vercel.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [{ inlineData: { data: mainImg.data, mimeType: mainImg.mime } }];
      
      let baseInstructions = "";
      
      if (mode === 'remove_bg') {
        // Lógica de agressividade traduzida para o prompt
        const smoothing = aggressiveness < 30 
          ? "sharp, pixel-perfect edges with zero feathering" 
          : aggressiveness < 70 
            ? "natural professional edges with slight anti-aliasing" 
            : "soft, feathered edges for a seamless blend with white background";

        baseInstructions = `REMOVE BACKGROUND: Completely remove the background of this image. Replace it with ABSOLUTELY PURE WHITE (#FFFFFF). The edges must be ${smoothing}. Do not leave any artifacts or ghosting from the original background. The final result should look like a professional studio product shot on a white cyclorama.`;
      } else if (mode === 'human_model') {
        baseInstructions = "FASHION STUDIO: Replace the mannequin or flat lay with a highly realistic professional human model wearing this exact clothing. Keep the clothing details identical. Professional studio lighting, neutral background.";
      } else {
        baseInstructions = "POSE SYNC: Transfer the style of this clothing to a person in a dynamic professional pose. High-end catalog quality.";
      }

      const finalPrompt = `${baseInstructions} ${userPrompt ? `ADDITIONAL USER REQUESTS: ${userPrompt}` : ""}`;
      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', // Usando flash para velocidade e custo na Vercel
        contents: { parts },
        config: {
          imageConfig: { 
            aspectRatio: (mainImg.w / mainImg.h > 1.2 ? "16:9" : mainImg.w / mainImg.h < 0.8 ? "9:16" : "1:1") as any 
          }
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        setResult(`data:image/png;base64,${imagePart.inlineData.data}`);
      } else {
        throw new Error("A IA processou o pedido mas não retornou uma imagem. Tente ajustar as instruções.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão com o servidor da Google.");
    } finally {
      setLoading(false);
    }
  };

  const download = (ext: 'png' | 'jpg') => {
    if (!result) return;
    const link = document.createElement('a');
    link.download = `pixshop-edit-${Date.now()}.${ext}`;
    link.href = result;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Navbar Minimalista */}
      <nav className="border-b border-slate-900 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20"></div>
            <span className="font-black text-lg tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">PIXSHOP <span className="text-indigo-500">PRO</span></span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Coluna de Controles */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Seletor de Modo */}
            <div className="flex p-1 bg-slate-900 rounded-2xl border border-slate-800">
              <button 
                onClick={() => setMode('remove_bg')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'remove_bg' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Remover Fundo
              </button>
              <button 
                onClick={() => setMode('human_model')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'human_model' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Modelo Real
              </button>
            </div>

            {/* Controle de Agressividade (Edge Smoothing) */}
            {mode === 'remove_bg' && (
              <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Suavização de Bordas</label>
                  <span className="text-[10px] font-bold text-indigo-400">
                    {aggressiveness < 30 ? 'Corte Seco' : aggressiveness < 70 ? 'Natural' : 'Ultra Suave'}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={aggressiveness} 
                  onChange={(e) => setAggressiveness(parseInt(e.target.value))} 
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                />
                <p className="text-[9px] text-slate-600 leading-tight uppercase tracking-tighter">
                  Aumente para fundos complexos (cabelos, pelos) ou diminua para objetos sólidos.
                </p>
              </div>
            )}

            {/* Upload Area */}
            <div 
              onClick={() => mainInputRef.current?.click()}
              className={`relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-500 h-64 flex flex-col items-center justify-center overflow-hidden
                ${mainImg ? 'border-indigo-500/50 bg-slate-900 shadow-2xl' : 'border-slate-800 hover:border-indigo-500/30 bg-slate-900/20 hover:bg-slate-900'}`}
            >
              <input ref={mainInputRef} type="file" hidden onChange={handleUpload} accept="image/*" />
              {mainImg ? (
                <img src={mainImg.url} className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-700" />
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  </div>
                  <p className="font-black text-slate-500 text-[10px] uppercase tracking-[0.2em]">Upload da Imagem</p>
                </div>
              )}
            </div>

            {/* Custom Prompt */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/></svg>
                Comando Adicional
              </label>
              <textarea 
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Ex: Reforce o brilho do tecido, adicione sombras leves..."
                className="w-full h-24 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500/40 outline-none resize-none placeholder:text-slate-700 transition-all shadow-inner"
              />
            </div>

            {mainImg && (
              <button 
                onClick={processImage} 
                disabled={loading}
                className="w-full py-5 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed group"
              >
                {loading ? "Processando..." : mode === 'remove_bg' ? "Remover Fundo AGORA" : "Gerar Edição"}
              </button>
            )}
          </div>

          {/* Área de Resultado */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="flex-1 rounded-[2.5rem] bg-slate-900/20 border border-slate-800/50 min-h-[500px] relative overflow-hidden flex flex-col items-center justify-center p-8">
              {loading ? (
                <Spinner />
              ) : error ? (
                <div className="max-w-sm text-center p-8 bg-red-500/5 border border-red-500/20 rounded-3xl animate-in zoom-in-95">
                  <svg className="w-10 h-10 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <h4 className="text-xs font-black text-red-400 uppercase tracking-widest mb-2">Erro detectado</h4>
                  <p className="text-red-300/60 text-[10px] uppercase leading-relaxed tracking-tight">{error}</p>
                </div>
              ) : result ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in-95 duration-700">
                  <div className="relative group flex-1 w-full flex items-center justify-center">
                    <img src={result} className="max-h-full max-w-full rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] object-contain border border-white/5" alt="Resultado" />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => download('png')} className="bg-slate-800 text-slate-400 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all">Baixar PNG</button>
                    <button onClick={() => download('jpg')} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-all">Baixar JPG (Ultra)</button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 opacity-20">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Aguardando Imagem</p>
                </div>
              )}
            </div>
            
            {/* Qualidade Slider */}
            {mainImg && (
              <div className="px-8 py-4 flex items-center gap-6 bg-slate-900/30 rounded-full mt-6 border border-slate-800/50">
                <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest whitespace-nowrap">Qualidade de Saída</span>
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  value={quality} 
                  onChange={(e) => setQuality(parseInt(e.target.value))} 
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                />
                <span className="text-[10px] font-black text-indigo-500">{quality}%</span>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-900 flex justify-between items-center opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
        <span className="text-[9px] font-black uppercase tracking-[0.3em]">© 2024 Pixshop AI • Studio Engine</span>
        <span className="text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          Gemini 3 Flash Ready
        </span>
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);