
import type { Idea } from "../types";

export async function generateIdeas(topic: string): Promise<Idea[] | null> {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'A resposta da API não foi bem-sucedida.');
    }

    const data = await response.json();
    return data.ideas;
    
  } catch (error) {
    console.error("Erro ao buscar ideias do endpoint da API:", error);
    // Lançar o erro permite que o componente de UI o capture.
    throw error;
  }
}
