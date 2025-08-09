import { getClient } from '../src/lib/db';

async function main() {
  try {
    console.log('Testing search functionality...');
    
    // First get the embedding for our search query
    const embedResponse = await fetch("http://3.81.234.132:8000/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: ["What is a pipette and how is it used in titration?"] }),
    });

    if (!embedResponse.ok) {
      throw new Error("Failed to generate query embedding");
    }

    const { embeddings } = await embedResponse.json();
    const queryEmbedding = embeddings[0];

    // Now search using vector similarity
    const client = await getClient();
    const collection = await client.collection('document_chunks');
    
    console.log('\nSearching for pipette-related content:');
    const results = await collection.find(
      {},
      {
        sort: {
          $vector: queryEmbedding
        },
        limit: 5,
        includeSimilarity: true
      }
    );
    
    results.forEach(doc => {
      console.log('\nDocument:', {
        id: doc._id,
        text: doc.chunk_text,
        metadata: doc.metadata,
        similarity: doc.$similarity
      });
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

main(); 