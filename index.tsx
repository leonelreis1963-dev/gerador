import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

const App = () => {
  const [original, setOriginal] = useState<{base64: string, mimeType: string, url: string} | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<'removal' | 'model'>('model');
  const [hardness, setHardness] = useState(35); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setOriginal({
          base64: url.split(',')[1],
          mimeType: file.type,
          url
        });
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!original) return;
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      let finalPrompt = "";
      
      if (mode === 'removal') {
        // Remoção técnica de fundo para joias
        finalPrompt = `STRICT TASK: Professional jewelry cutout on PURE SOLID WHITE background (#FFFFFF). 
           Extract the jewelry with extreme precision, preserving all metallic luster and stone clarity. 
           Edge quality: ${hardness > 60 ? 'Sharp' : 'Natural studio soften'}. 
           User details: ${prompt}`;
      } else {
        // Tecnologia de Preservação de Joia + Modelo Real
        finalPrompt = `STRICT MANDATE: The jewelry in this image is the absolute ANCHOR and must remain 100% UNCHANGED. 
           DO NOT ALTER, WARP, OR REDESIGN THE JEWELRY. Maintain every original pixel of the metal and stones. 
           TASK: Replace the artificial mannequin/stand with a photorealistic female model. 
           The model's anatomy must be generated BEHIND the jewelry, adapting to the piece's exact position. 
           Add hyper-realistic skin texture and subtle contact shadows where the jewelry meets the body. 
           Professional luxury studio lighting. User details: ${prompt}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: original.base64, mimeType: original.mimeType } },
            { text: finalPrompt }
          ]
        }
      });

      const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (part?.inlineData) {
        setResult(`data:image/png;base64,${part.inlineData.data}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar imagem. Verifique sua conexão ou API Key.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (format: 'image/png' | 'image/jpeg') => {
    if (!result) return;
    setIsSaving(true);
    try {
      const img = new Image();
      img.src = result;
      await new Promise((resolve) => (img.onload = resolve));

      // Criar canvas na resolução nativa da imagem gerada (melhor qualidade)
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { alpha: format === 'image/png' });
      if (!ctx) return;

      if (format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Configurações de alta fidelidade para garantir nitidez máxima
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);

      // Exportar com compressão zero/mínima para máxima qualidade
      const quality = format === 'image/jpeg' ? 1.0 : undefined;
      const dataUrl = canvas.toDataURL(format, quality);
      
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `pixshop-jewelry-highres-${Date.now()}.${format === 'image/png' ? 'png' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Erro ao salvar imagem:", err);
      alert("Erro ao salvar a imagem em alta qualidade.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        {/* Header Minimalista */}
        <header className="flex justify-between items-center mb-12 border-b border-white/5 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black italic text-xl shadow-lg shadow-indigo-500/20">P</div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Pixshop <span className="text-indigo-500">PRO</span></h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Jewelry Preservation AI</p>
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-500 hover:text-white transition-all active:scale-95 shadow-lg"
          >
            Subir Foto
          </button>
          <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*" />
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Lado Esquerdo: Input e Config */}
          <div className="space-y-8">
            <div className="bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 flex gap-1">
              <button 
                onClick={() => setMode('model')}
                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'model' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Modelo Real
              </button>
              <button 
                onClick={() => setMode('removal')}
                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'removal' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Remover Fundo
              </button>
            </div>

            <div className="aspect-square bg-slate-900 rounded-[2.5rem] border border-white/5 overflow-hidden flex items-center justify-center shadow-2xl group relative">
              {original ? (
                <img src={original.url} className="w-full h-full object-contain p-4" alt="Original" />
              ) : (
                <div className="text-center opacity-20 group-hover:opacity-40 transition-opacity">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Envie a foto do manequim</p>
                </div>
              )}
            </div>

            <div className="space-y-6 bg-slate-900/40 p-8 rounded-[2rem] border border-white/5">
              {mode === 'removal' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Dureza do Recorte</label>
                    <span className="text-[10px] font-bold text-white bg-indigo-600/30 px-2 py-0.5 rounded">{hardness}%</span>
                  </div>
                  <input 
                    type="range" min="10" max="90" value={hardness} 
                    onChange={(e) => setHardness(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block px-1">Seu Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={mode === 'model' ? "Ex: Modelo de pele negra, luz de estúdio lateral, cabelo preso..." : "Ex: Manter reflexo das pedras..."}
                  className="w-full h-32 bg-slate-950/50 rounded-2xl border border-white/5 p-5 text-sm font-medium focus:border-indigo-500 outline-none transition-colors resize-none placeholder:text-slate-700"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !original}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-500/10 disabled:opacity-20 active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Gerando...</span>
                  </>
                ) : (
                  <span>GERAR AGORA</span>
                )}
              </button>
            </div>
          </div>

          {/* Lado Direito: Resultado */}
          <div className="space-y-8">
            <div className="aspect-square bg-slate-950 rounded-[2.5rem] border border-indigo-500/10 overflow-hidden flex items-center justify-center relative shadow-[0_0_80px_rgba(79,70,229,0.05)]">
              {result ? (
                <img src={result} className="w-full h-full object-contain p-4 animate-in fade-in duration-700" alt="Result" />
              ) : (
                <div className="text-center opacity-5 select-none">
                  <p className="text-[12rem] font-black tracking-tighter italic">AI</p>
                </div>
              )}
            </div>

            {result && !loading && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => downloadImage('image/png')}
                  disabled={isSaving}
                  className="bg-slate-800 hover:bg-slate-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Download PNG'}
                </button>
                <button
                  onClick={() => downloadImage('image/jpeg')}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Download JPG'}
                </button>
              </div>
            )}
            
            <div className="p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center leading-loose">
                {mode === 'model' 
                  ? "Motor de Realismo Ativo: A joia original está sendo protegida enquanto a anatomia humana é adaptada à peça."
                  : "Modo de Isolamento: Focado em extração limpa para catálogo em fundo branco."
                }
              </p>
            </div>
          </div>
        </main>

        <footer className="mt-20 text-center text-slate-800 text-[9px] font-black uppercase tracking-[1em] pb-10">
          Pixshop Jewelry Studio AI • Zero-Alteration Logic
        </footer>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);