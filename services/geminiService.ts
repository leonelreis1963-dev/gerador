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
      // Tenta extrair a mensagem de erro específica do backend.
      const errorData = await response.json().catch(() => ({ error: 'A resposta da API não foi bem-sucedida e não contém JSON.' }));
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.imageBase64;
    
  } catch (error) {
    console.error("Erro ao chamar o endpoint /api/editImage:", error);
    // Re-lança o erro para que a UI possa capturá-lo e exibir a mensagem correta.
    throw error;
  }
}