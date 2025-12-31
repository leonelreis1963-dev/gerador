import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- Components ---

const Spinner = () => (
  <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
  </div>
);

const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

// --- App Logic ---

const App = () => {
  const [mainImg, setMainImg] = useState<{data: string, mime: string, url: string, w: number, h: number} | null>(null);
  const [refImg, setRefImg] = useState<{data: string, mime: string, url: string} | null>(null);
  const [result, setResult] = useState<string | null>(null);
  
  const [mode, setMode] = useState<'white_bg' | 'human_model' | 'pose_ref'>('white_bg');
  const [userPrompt, setUserPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState(90);
  const [aggressiveness, setAggressiveness] = useState(50); // 0 to 100

  const mainInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const detectAspectRatio = (w: number, h: number) => {
    const ratio = w / h;
    if (ratio > 1.4) return "16:9";
    if (ratio > 1.1) return "4:3";
    if (ratio < 0.6) return "9:16";
    if (ratio < 0.9) return "3:4";
    return "1:1";
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, isRef: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const img = new Image();
      img.onload = () => {
        if (isRef) {
          setRefImg({ data: url.split(',')[1], mime: file.type, url });
        } else {
          setMainImg({ data: url.split(',')[1], mime: file.type, url, w: img.naturalWidth, h: img.naturalHeight });
          setResult(null);
        }
        setError(null);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!mainImg) return;
    if (mode === 'pose_ref' && !refImg) {
      setError("Selecione uma imagem de referência para copiar a pose.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const parts: any[] = [{ inlineData: { data: mainImg.data, mimeType: mainImg.mime } }];
      
      let baseInstructions = "";
      if (mode === 'white_bg') {
        const edgeLevel = aggressiveness < 33 ? "sharp and crisp" : aggressiveness < 66 ? "natural and slightly blended" : "softly feathered and professionally anti-aliased";
        baseInstructions = `E-commerce Studio: Remove the entire background and replace it with ABSOLUTELY PURE WHITE (#FFFFFF). Ensure the edges of the product are ${edgeLevel} to avoid a harsh or jagged cut-out look. The transition between the object and the white background must look seamless and organic. Maintain natural soft contact shadows if present.`;
      } else if (mode === 'human_model') {
        baseInstructions = "High-end fashion photography: Replace the mannequin or support with a realistic professional human model. Neutral studio background, high-end lighting. The clothing product must remain identical to the original.";
      } else {
        parts.push({ inlineData: { data: refImg!.data, mimeType: refImg!.mime } });
        baseInstructions = "Style Transfer: Take the clothing from image 1 and put it on the person in image 2. Maintain the exact pose and body of the person in the second image. Professional result.";
      }

      const finalPrompt = `${baseInstructions} ${userPrompt ? `ADDITIONAL CUSTOM REQUESTS: ${userPrompt}` : ""}`;
      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: { aspectRatio: detectAspectRatio(mainImg.w, mainImg.h) as any }
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        setResult(`data:image/png;base64,${imagePart.inlineData.data}`);
      } else {
        throw new Error("Não recebemos uma imagem da IA. Tente uma foto com iluminação melhor.");
      }
    } catch (err: any) {
      setError(err.message || "Falha na conexão com o estúdio.");
    } finally {
      setLoading(false);
    }
  };

  const download = (ext: 'png' | 'jpg') => {
    if (!result || !mainImg) return;
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      const maxDim = 2048;
      const ratio = mainImg.w / mainImg.h;
      if (ratio > 1) {
        canvas.width = maxDim;
        canvas.height = maxDim / ratio;
      } else {
        canvas.height = maxDim;
        canvas.width = maxDim * ratio;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (ext === 'jpg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const link = document.createElement('a');
        link.download = `pixshop-pro-${Date.now()}.${ext}`;
        link.href = canvas.toDataURL(ext === 'png' ? 'image/png' : 'image/jpeg', quality / 100);
        link.click();
      }
    };
    img.src = result;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Navbar Minimalista */}
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-cyan-400 rounded-lg shadow-lg shadow-indigo-500/20"></div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Pixshop <span className="text-indigo-500">PRO</span></span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Coluna Esquerda: Controles */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Seletor de Modo */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl">
              {[
                { id: 'white_bg', label: 'Fundo Branco' },
                { id: 'human_model', label: 'Modelo Real' },
                { id: 'pose_ref', label: 'Pose Sync' }
              ].map(m => (
                <button 
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === m.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Controle de Agressividade (Exclusivo Fundo Branco) */}
            {mode === 'white_bg' && (
              <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Suavização das Bordas</span>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">
                    {aggressiveness < 33 ? 'Dura/Fiel' : aggressiveness < 66 ? 'Natural' : 'Ultra Suave'}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={aggressiveness} 
                  onChange={(e) => setAggressiveness(parseInt(e.target.value))} 
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                />
                <p className="text-[9px] text-slate-500 leading-tight italic uppercase tracking-tighter">
                  Ajuste para evitar que o corte fique "duro" ou serrilhado contra o branco.
                </p>
              </div>
            )}

            {/* Área de Upload Principal */}
            <div 
              onClick={() => mainInputRef.current?.click()}
              className={`relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 h-64 flex flex-col items-center justify-center overflow-hidden
                ${mainImg ? 'border-indigo-500/50 bg-slate-900 shadow-xl' : 'border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900'}`}
            >
              <input ref={mainInputRef} type="file" hidden onChange={(e) => handleUpload(e)} accept="image/*" />
              {mainImg ? (
                <>
                  <img src={mainImg.url} className="w-full h-full object-contain p-4 opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                    <span className="text-white text-xs font-black uppercase tracking-widest">Alterar Imagem</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto shadow-lg">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <p className="font-bold text-slate-300 text-xs uppercase tracking-widest">Upload do Produto</p>
                </div>
              )}
            </div>

            {/* Campo de Prompt Customizado */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                Instruções Adicionais (Opcional)
              </label>
              <textarea 
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Ex: Mude a cor para vermelho, iluminação lateral..."
                className="w-full h-24 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none placeholder:text-slate-600 transition-all font-medium leading-relaxed shadow-inner"
              />
            </div>

            {/* Upload Referência (Aparece apenas em Pose Sync) */}
            {mode === 'pose_ref' && (
              <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                <div 
                  onClick={() => refInputRef.current?.click()}
                  className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 h-32 flex flex-col items-center justify-center overflow-hidden
                    ${refImg ? 'border-cyan-500/50 bg-slate-900' : 'border-slate-800 hover:border-cyan-500/50 bg-slate-900/40'}`}
                >
                  <input ref={refInputRef} type="file" hidden onChange={(e) => handleUpload(e, true)} accept="image/*" />
                  {refImg ? (
                    <img src={refImg.url} className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <div className="text-center p-4">
                      <p className="font-bold text-cyan-500 text-[10px] uppercase tracking-widest">+ Referência de Pose</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botão de Geração */}
            {mainImg && (
              <div className="space-y-4 pt-2">
                <button 
                  onClick={processImage} 
                  disabled={loading}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-20"
                >
                  {loading ? "Processando AI..." : mode === 'white_bg' ? "Remover Fundo" : "Gerar Imagem"}
                </button>
              </div>
            )}
          </div>

          {/* Coluna Direita: Resultado */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex-1 rounded-[2.5rem] bg-slate-900/30 border border-slate-800/50 min-h-[500px] lg:h-[750px] relative overflow-hidden flex flex-col items-center justify-center p-6 shadow-inner">
              {loading ? (
                <div className="text-center">
                  <Spinner />
                  <p className="mt-6 text-indigo-400 text-xs font-black uppercase tracking-[0.4em] animate-pulse text-center">
                    {mode === 'white_bg' ? "Recortando Objeto..." : "Sincronizando Formato..."}
                  </p>
                </div>
              ) : error ? (
                <div className="max-w-md text-center p-10 bg-red-500/5 border border-red-500/20 rounded-3xl">
                  <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <h3 className="text-sm font-black text-red-400 uppercase tracking-widest mb-2">Erro no Processamento</h3>
                  <p className="text-red-300/60 text-[10px] uppercase leading-relaxed tracking-tight text-center">{error}</p>
                </div>
              ) : result ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in-95 duration-700">
                  <div className="relative group flex-1 w-full flex items-center justify-center p-4">
                    <img src={result} className="max-h-full max-w-full rounded-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] object-contain border border-white/5" alt="Resultado" />
                  </div>
                  <div className="flex gap-4 pb-4">
                    <button onClick={() => download('png')} className="bg-slate-800 text-slate-300 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors">PNG</button>
                    <button onClick={() => download('jpg')} className="bg-white text-slate-950 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-2xl">JPG Premium</button>
                  </div>
                </div>
              ) : (
                <div className="text-center opacity-40">
                  <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5">
                    <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                  </div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-[0.5em]">Aguardando Estúdio</p>
                </div>
              )}
            </div>
            
            {/* Slider de Qualidade */}
            {mainImg && (
              <div className="px-6 py-4 flex items-center gap-4 bg-slate-900/20 rounded-full mt-4 border border-slate-800/50">
                <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest whitespace-nowrap">Qualidade Final</span>
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  value={quality} 
                  onChange={(e) => setQuality(parseInt(e.target.value))} 
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                />
                <span className="text-[10px] font-black text-indigo-400">{quality}%</span>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6 text-slate-600 text-[10px] font-black uppercase tracking-widest">
          <span>&copy; 2024 Pixshop AI Engine</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 bg-slate-900/50 px-5 py-2.5 rounded-full border border-slate-800">
          <GithubIcon />
          <span className="text-[10px] font-black uppercase tracking-widest">Gemini Fusion 2.5 • Studio Pro 2K</span>
        </div>
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);