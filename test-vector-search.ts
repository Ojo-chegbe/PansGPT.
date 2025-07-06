import { getClient } from './src/lib/db';

async function main() {
  try {
    // First, get a sample embedding
    console.log('Getting embedding for query...');
    const embedResponse = await fetch("http://localhost:8000/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: ["What is normality in chemistry and how is it used in solutions?"] }),
    });

    if (!embedResponse.ok) {
      throw new Error("Failed to generate query embedding");
    }

    const embedData = await embedResponse.json();
    const queryEmbedding = embedData.embeddings[0];
    console.log('Got embedding:', {
      size: queryEmbedding.length,
      sample: queryEmbedding.slice(0, 5)
    });

    // Connect to AstraDB using configured client
    console.log('\nConnecting to AstraDB...');
    const client = await getClient();
    const collection = client.collection('document_chunks');

    // First, get total document count and check a sample
    const allDocs = await collection.find({}).toArray();
    console.log(`\nTotal chunks in collection: ${allDocs.length}`);
    
    if (allDocs.length > 0) {
      console.log('\nSample chunk:', {
        hasEmbedding: !!allDocs[0].embedding,
        embeddingSize: allDocs[0].embedding?.length,
        hasChunkText: !!allDocs[0].chunk_text,
        textPreview: allDocs[0].chunk_text?.substring(0, 100),
        metadata: allDocs[0].metadata
      });
    }

    // Perform vector search with no limit to see all scores
    console.log('\nPerforming vector search for "normality"...');
    const results = await collection.find(
      {},
      {
        sort: {
          embedding: queryEmbedding
        },
        includeSimilarity: true
      }
    ).toArray();

    // Sort results by similarity score
    const sortedResults = results
      .filter(doc => doc.$similarity !== undefined)
      .sort((a, b) => (b.$similarity || 0) - (a.$similarity || 0));

    console.log(`\nFound ${sortedResults.length} results with similarity scores`);
    
    // Show top 5 results with scores
    console.log('\nTop 5 results by similarity:');
    sortedResults.slice(0, 5).forEach((doc, i) => {
      console.log(`\nResult ${i + 1}:`, {
        similarity: doc.$similarity,
        textPreview: doc.chunk_text?.substring(0, 200),
        metadata: doc.metadata
      });
    });

    // Also show exact matches for comparison
    const textMatches = allDocs.filter(doc => 
      doc.chunk_text?.toLowerCase().includes('normality')
    );
    
    if (textMatches.length > 0) {
      console.log(`\nFound ${textMatches.length} direct text matches:`);
      textMatches.forEach((doc, i) => {
        // Find this document's similarity score
        const matchingResult = sortedResults.find(r => r._id === doc._id);
        console.log(`\nText Match ${i + 1}:`, {
          similarity: matchingResult?.$similarity,
          textPreview: doc.chunk_text?.substring(0, 200),
          metadata: doc.metadata
        });
      });
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

main(); 