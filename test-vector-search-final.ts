import { getClient } from './src/lib/db';

interface EmbeddingResponse {
  embeddings: number[][];
}

async function testVectorSearchFinal() {
  try {
    console.log('Final vector search test...');
    
    // Get embedding
    const embedResponse = await fetch("https://pansgpt.onrender.com/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: ["titration"] }),
    });

    if (!embedResponse.ok) {
      throw new Error("Failed to generate query embedding");
    }

    const embedData = await embedResponse.json() as EmbeddingResponse;
    const queryEmbedding = embedData.embeddings[0];
    console.log('Got embedding, size:', queryEmbedding.length);

    // Connect to AstraDB
    const client = await getClient();
    const collection = client.collection('document_chunks');

    // Get all documents
    const allDocs = await collection.find({}).toArray();
    console.log(`Total documents: ${allDocs.length}`);

    if (allDocs.length === 0) {
      console.log('No documents found');
      return;
    }

    // Check document structure
    console.log('\nDocument structure analysis:');
    const sampleDoc = allDocs[0];
    console.log('All fields:', Object.keys(sampleDoc));
    
    // Check for any vector-related fields
    const vectorFields = Object.keys(sampleDoc).filter(key => 
      key.toLowerCase().includes('vector') || 
      key.toLowerCase().includes('embedding') ||
      key === '$vector'
    );
    console.log('Vector-related fields:', vectorFields);
    
    // Check if there's a hidden vector field
    console.log('Document keys (including symbols):', Object.getOwnPropertyNames(sampleDoc));
    
    // Try vector search with the original embedding field name
    console.log('\nTrying vector search with embedding field...');
    try {
      const results = await collection.find(
        {},
        {
          sort: {
            $vector: queryEmbedding
          },
          limit: 3,
          includeSimilarity: true
        }
      ).toArray();
      console.log(`Vector search results: ${results.length}`);
      if (results.length > 0) {
        console.log('First result similarity:', results[0].$similarity);
        console.log('First result text:', results[0].chunk_text?.substring(0, 100));
      }
    } catch (error) {
      console.log('Vector search failed:', error.message);
    }
    
    // Try to manually add vector field to a document
    console.log('\nTrying to add vector field manually...');
    try {
      const testDoc = allDocs[0];
      
      // Try to update the document
      await collection.updateOne(
        { _id: testDoc._id },
        { $set: { $vector: queryEmbedding } }
      );
      
      console.log('Updated document with vector field');
      
      // Try vector search again
      const results2 = await collection.find(
        {},
        {
          sort: {
            $vector: queryEmbedding
          },
          limit: 3,
          includeSimilarity: true
        }
      ).toArray();
      console.log(`Vector search after update: ${results2.length} results`);
      
    } catch (error) {
      console.log('Manual vector field addition failed:', error.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testVectorSearchFinal(); 