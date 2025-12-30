
import { GoogleGenAI } from "@google/genai";

export async function editImage(imageBase64: string, mimeType: string, prompt: string): Promise<string | null> {
  try {
    // Inicializa o AI diretamente no frontend usando a chave de ambiente
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
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
      contents: { parts: [imagePart, textPart] },
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("A IA não gerou nenhuma resposta. Tente um prompt diferente.");
    }

    let resultBase64: string | null = null;

    // Itera pelas partes da resposta para encontrar a imagem editada
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        resultBase64 = part.inlineData.data;
        break;
      }
    }

    if (!resultBase64) {
      // Se não houver imagem, talvez a IA tenha respondido apenas com texto (ex: erro de segurança)
      const textResponse = response.text;
      if (textResponse) {
        throw new Error(`A IA retornou uma mensagem em vez de uma imagem: ${textResponse}`);
      }
      throw new Error("Não foi possível extrair a imagem editada da resposta.");
    }

    return resultBase64;

  } catch (error) {
    console.error("Erro no Gemini Service:", error);
    if (error instanceof Error) {
      if (error.message.includes("API_KEY")) {
        throw new Error("Chave de API inválida ou não configurada. Verifique as variáveis de ambiente.");
      }
      throw error;
    }
    throw new Error("Ocorreu um erro inesperado ao processar sua imagem.");
  }
}
