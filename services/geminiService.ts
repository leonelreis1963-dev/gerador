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
      // Robust error handling: Check content type before parsing.
      const contentType = response.headers.get('content-type');
      let errorMessage;

      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || `Erro HTTP: ${response.status}`;
      } else {
        // If not JSON, it's likely a server error (e.g., timeout, crash). Read as text.
        const errorText = await response.text();
        errorMessage = `Erro do servidor (${response.status}): ${errorText || 'Resposta vazia.'}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.imageBase64;
    
  } catch (error) {
    console.error("Erro ao chamar o endpoint /api/editImage:", error);
    // Re-lança o erro para que a UI possa capturá-lo e exibir a mensagem correta.
    throw error;
  }
}