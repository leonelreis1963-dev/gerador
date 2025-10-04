
// Este arquivo DEVE estar em uma pasta /api na raiz do seu projeto.
// Ex: /api/generate.ts
// A Vercel automaticamente o transformará em um endpoint de API.

import { GoogleGenAI, Type } from "@google/genai";
import type { Idea } from "../types";

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

  // A chave de API é acessada de forma segura através das variáveis de ambiente do servidor.
  if (!process.env.API_KEY) {
     return new Response(JSON.stringify({ error: 'A variável de ambiente API_KEY não está configurada no servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { topic } = await req.json();

    if (!topic) {
        return new Response(JSON.stringify({ error: 'O tópico é obrigatório.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "Um título curto e criativo para a ideia.",
          },
          description: {
            type: Type.STRING,
            description: "Uma breve descrição (2-3 frases) detalhando a ideia.",
          },
        },
        required: ["title", "description"],
      },
    };

    const prompt = `Gere 4 ideias criativas e distintas sobre o seguinte tópico: "${topic}". Para cada ideia, forneça um título e uma breve descrição.`;
      
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8,
        topP: 0.9,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText) as Idea[];

    return new Response(JSON.stringify({ ideas: parsedJson }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erro na função da API:", error);
    return new Response(JSON.stringify({ error: 'Falha ao gerar ideias a partir do servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
