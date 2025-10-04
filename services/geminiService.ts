
import { GoogleGenAI, Type } from "@google/genai";
import type { Idea } from "../types";

// A chave de API é acessada de forma segura através das variáveis de ambiente.
// A Vercel irá substituir process.env.API_KEY pelo valor que você configurou no dashboard.
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set. Please add it to your Vercel project settings.");
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

export async function generateIdeas(topic: string): Promise<Idea[] | null> {
  try {
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
    if (!jsonText) {
      console.error("Gemini API returned an empty response.");
      return null;
    }
    
    // O Gemini já retorna um JSON válido por causa do responseSchema
    const parsedJson = JSON.parse(jsonText);
    return parsedJson as Idea[];

  } catch (error) {
    console.error("Erro ao chamar a API Gemini:", error);
    // Lançar o erro permite que o componente de UI o capture e exiba uma mensagem amigável.
    throw error;
  }
}
