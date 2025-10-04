// Este arquivo DEVE estar em uma pasta /api na raiz do seu projeto.
// Ex: /api/editImage.ts
// A Vercel automaticamente o transformará em um endpoint de API.

import { GoogleGenAI, Modality } from "@google/genai";

// Esta função agora retorna um stream para evitar o timeout da Vercel em tarefas longas.
export async function POST(req: Request) {
  if (!process.env.API_KEY) {
     return new Response(JSON.stringify({ error: 'A variável de ambiente API_KEY não está configurada no servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        const { imageBase64, mimeType, prompt } = await req.json();

        if (!imageBase64 || !mimeType || !prompt) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'Imagem, tipo MIME e prompt são obrigatórios.' })));
          controller.close();
          return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
        const imagePart = {
          inlineData: { data: imageBase64, mimeType: mimeType },
        };

        const textPart = { text: prompt };
          
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [{ role: 'user', parts: [imagePart, textPart] }],
          config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
        });

        if (!response.candidates || response.candidates.length === 0) {
          const blockReason = response.promptFeedback?.blockReason;
          const errorMessage = blockReason
            ? `A solicitação foi bloqueada por segurança. Motivo: ${blockReason}`
            : 'A API não retornou um candidato válido.';
          controller.enqueue(encoder.encode(JSON.stringify({ error: errorMessage })));
          controller.close();
          return;
        }
        
        const candidate = response.candidates[0];
        
        if (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MODEL_LENGTH') {
           const errorMessage = `O processamento foi interrompido. Motivo: ${candidate.finishReason}`;
           controller.enqueue(encoder.encode(JSON.stringify({ error: errorMessage })));
           controller.close();
           return;
        }

        let editedImageBase64: string | null = null;
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
            editedImageBase64 = part.inlineData.data;
            break;
          }
        }

        if (!editedImageBase64) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'A API processou a solicitação, mas não retornou uma imagem.' })));
        } else {
          controller.enqueue(encoder.encode(JSON.stringify({ imageBase64: editedImageBase64 })));
        }

      } catch (error) {
        console.error("Erro na função da API de edição de imagem:", error);
        const errorMessage = error instanceof Error ? error.message : 'Falha ao editar a imagem no servidor.';
        controller.enqueue(encoder.encode(JSON.stringify({ error: `Erro no servidor: ${errorMessage}` })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}