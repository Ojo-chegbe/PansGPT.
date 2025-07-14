// Embedding service configuration
export const EMBEDDING_SERVICE_CONFIG = {
  // Local development
  local: 'http://localhost:8000',
  
  // Northflank hosted service
  production: process.env.NEXT_PUBLIC_EMBEDDING_SERVICE_URL || 'https://p01--embedding-model--qq4rx7ycpfhm.code.run',
  
  // Get the appropriate URL based on environment
  getUrl: () => {
    if (process.env.NODE_ENV === 'development') {
      return EMBEDDING_SERVICE_CONFIG.local;
    }
    return EMBEDDING_SERVICE_CONFIG.production;
  }
};

// Helper function to call the embedding service
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const url = EMBEDDING_SERVICE_CONFIG.getUrl();
  
  try {
    const response = await fetch(`${url}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) {
      throw new Error(`Embedding service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.embeddings;
  } catch (error) {
    console.error('Error calling embedding service:', error);
    throw error;
  }
}

// Helper function to generate single embedding
export async function generateSingleEmbedding(text: string): Promise<number[]> {
  const url = EMBEDDING_SERVICE_CONFIG.getUrl();
  
  try {
    const response = await fetch(`${url}/embed-single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts: [text] }),
    });

    if (!response.ok) {
      throw new Error(`Embedding service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Error calling embedding service:', error);
    throw error;
  }
} 