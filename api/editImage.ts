// Este arquivo DEVE estar em uma pasta /api na raiz do seu projeto.
// Ex: /api/editImage.ts
// A Vercel automaticamente o transformará em um endpoint de API.

import { GoogleGenAI, Modality } from "@google/genai";

// A configuração 'runtime: edge' foi REMOVIDA para usar o ambiente Node.js padrão da Vercel,
// que é mais estável e compatível para esta tarefa.

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!process.env.API_KEY) {
     return new Response(JSON.stringify({ error: 'A variável de ambiente API_KEY não está configurada no servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { imageBase64, mimeType, prompt } = await req.json();

    if (!imageBase64 || !mimeType || !prompt) {
        return new Response(JSON.stringify({ error: 'Imagem, tipo MIME e prompt são obrigatórios.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: prompt,
    };
      
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        role: 'user',
        parts: [imagePart, textPart]
      }],
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    // Tratamento de erro robusto: verifique se a API retornou algum candidato
    if (!response.candidates || response.candidates.length === 0) {
      const blockReason = response.promptFeedback?.blockReason;
      if (blockReason) {
        return new Response(JSON.stringify({ error: `A solicitação foi bloqueada por segurança. Motivo: ${blockReason}` }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'A API não retornou um candidato válido.' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const candidate = response.candidates[0];
    
    // Verifica se o processamento foi interrompido por algum motivo
    if (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MODEL_LENGTH') {
       return new Response(JSON.stringify({ error: `O processamento foi interrompido. Motivo: ${candidate.finishReason}` }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
    }

    let editedImageBase64: string | null = null;
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        editedImageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!editedImageBase64) {
      return new Response(JSON.stringify({ error: 'A API processou a solicitação, mas não retornou uma imagem.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ imageBase64: editedImageBase64 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erro na função da API de edição de imagem:", error);
    const errorMessage = error instanceof Error ? error.message : 'Falha ao editar a imagem no servidor.';
    // Retorna uma mensagem de erro mais específica, se disponível
    return new Response(JSON.stringify({ error: `Erro no servidor: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}