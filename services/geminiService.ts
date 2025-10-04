export async function editImage(imageBase64: string, mimeType: string, prompt: string): Promise<string | null> {
  try {
    const response = await fetch('/api/editImage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64, mimeType, prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'A resposta da API não foi bem-sucedida.');
    }

    const data = await response.json();
    return data.imageBase64;
    
  } catch (error) {
    console.error("Erro ao buscar imagem do endpoint da API:", error);
    throw error;
  }
}