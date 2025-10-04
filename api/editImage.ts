// Este arquivo DEVE estar em uma pasta /api na raiz do seu projeto.
// Ex: /api/editImage.ts
// A Vercel automaticamente o transformará em um endpoint de API.

import { GoogleGenAI, Modality } from "@google/genai";

export const config = {
  runtime: 'edge',
};

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
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        // O modelo de edição de imagem requer que ambos os tipos sejam especificados.
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let editedImageBase64: string | null = null;
    // A resposta pode conter múltiplas partes, precisamos encontrar a parte da imagem.
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        editedImageBase64 = part.inlineData.data;
        break; // Encontramos a imagem, podemos parar.
      }
    }

    if (!editedImageBase64) {
      return new Response(JSON.stringify({ error: 'A API não retornou uma imagem editada.' }), {
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
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}