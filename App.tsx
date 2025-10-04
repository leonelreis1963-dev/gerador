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
        setError(`O arquivo é muito grande. Por favor, envie uma imagem com menos de ${MAX_FILE_SIZE_MB}MB.`);
        setOriginalImage(null);
        if(fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const [header, base64] = dataUrl.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
        setOriginalImage({ base64, mimeType, dataUrl });
        setEditedImage(null);
        setError(null);
        setPrompt('');
      };
      reader.onerror = () => {
        setError("Falha ao ler o arquivo de imagem.");
      }
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = useCallback(async (editPrompt: string) => {
    if (!originalImage) {
      setError('Por favor, envie uma imagem primeiro.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
      const resultBase64 = await editImage(originalImage.base64, originalImage.mimeType, editPrompt);
      if (resultBase64) {
        // A API de edição retorna PNG ou JPG, então vamos detectar o tipo para o link
        const imageMimeType = editPrompt.toLowerCase().includes('transparente') ? 'image/png' : 'image/jpeg';
        setEditedImage(`data:${imageMimeType};base64,${resultBase64}`);
      } else {
        throw new Error('A API não retornou uma imagem editada válida.');
      }
    } catch (err) {
      console.error(err);
      // Exibe a mensagem de erro específica vinda do backend
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [originalImage]);

  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <main className="w-full max-w-5xl mx-auto">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 shadow-2xl shadow-purple-500/10 rounded-2xl p-8">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text mb-2">
              Editor Pixshop Gemini
            </h1>
            <p className="text-gray-400">
              Edite suas imagens com o poder da IA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Painel Esquerdo: Upload e Original */}
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold text-center text-gray-300">1. Envie sua Imagem</h2>
              <div 
                className="h-64 w-full bg-gray-900/80 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors"
                onClick={triggerFileSelect}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {originalImage ? (
                  <img src={originalImage.dataUrl} alt="Original" className="max-h-full max-w-full object-contain rounded-md" />
                ) : (
                  <div className="text-center text-gray-500">
                    <p>Clique ou arraste para enviar</p>
                    <p className="text-sm">(PNG, JPG, WebP)</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center -mt-2">Tamanho máximo: {MAX_FILE_SIZE_MB}MB</p>
              
              {originalImage && (
                <>
                  <h2 className="text-xl font-semibold text-center text-gray-300 mt-4">2. Escolha uma Ação</h2>
                   <div className="flex flex-col gap-3">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ou descreva sua edição aqui..."
                      className="w-full h-20 bg-gray-900/80 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 resize-none"
                      disabled={isLoading}
                    />
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button onClick={() => handleEdit('remova o fundo e mantenha o sujeito principal. o fundo deve ser transparente.')} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors">Remover Fundo</button>
                        <button onClick={() => handleEdit('melhore a qualidade e a nitidez da imagem, upscale para alta resolução.')} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors">Melhorar Qualidade</button>
                     </div>
                     <button onClick={() => handleEdit(prompt)} disabled={isLoading || !prompt.trim()} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300">
                      Processar Edição
                    </button>
                   </div>
                </>
              )}
            </div>

            {/* Painel Direito: Resultado */}
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold text-center text-gray-300">Resultado</h2>
              <div className="h-full min-h-[360px] w-full bg-gray-900/50 rounded-lg border border-gray-700/50 flex flex-col items-center justify-center p-4">
                {isLoading && <Spinner />}
                {error && <p className="text-red-400 text-center px-4 py-2 bg-red-900/20 rounded-lg border border-red-500/30">{error}</p>}
                {editedImage && !isLoading && !error && (
                  <div className="flex flex-col items-center gap-4">
                    <img src={editedImage} alt="Imagem editada por IA" className="rounded-lg max-w-full h-auto shadow-lg" />
                    <a
                      href={editedImage}
                      download={`pixshop-edit-${Date.now()}.png`}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-5 rounded-lg transition-colors duration-300 mt-2"
                    >
                      Download
                    </a>
                  </div>
                )}
                {!isLoading && !error && !editedImage && (
                  <p className="text-gray-500 text-center">O resultado da sua edição aparecerá aqui.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
       <footer className="w-full max-w-5xl mx-auto text-center mt-8 text-gray-500">
        <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-purple-400 transition-colors">
          <GithubIcon />
          <span>Powered by Google Gemini API</span>
        </a>
      </footer>
    </div>
  );
}

export default App;