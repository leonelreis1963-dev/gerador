export async function editImage(imageBase64: string, mimeType: string, prompt: string): Promise<string | null> {
  try {
    const response = await fetch('/api/editImage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64, mimeType, prompt }),
    });

    if (!response.ok || !response.body) {
      // Tenta ler o corpo do erro mesmo se não estiver ok
      const errorText = await response.text();
      throw new Error(`Erro do servidor (${response.status}): ${errorText || 'Resposta vazia.'}`);
    }

    // Lida com a resposta de streaming
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      result += decoder.decode(value);
    }
    
    // Após receber todo o stream, analisa o resultado JSON final
    const data = JSON.parse(result);
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.imageBase64;
    
  } catch (error) {
    console.error("Erro ao chamar o endpoint /api/editImage:", error);
    // Re-lança o erro para que a UI possa capturá-lo e exibir a mensagem correta.
    throw error;
  }
}