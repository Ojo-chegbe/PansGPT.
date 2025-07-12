import { getClient } from './src/lib/db';

interface EmbeddingResponse {
  embeddings: number[][];
}

async function testVectorSearch() {
  try {
    console.log('Testing vector search with different syntaxes...');
    
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

    // Get all documents first
    const allDocs = await collection.find({}).toArray();
    console.log(`Total documents: ${allDocs.length}`);

    if (allDocs.length === 0) {
      console.log('No documents found');
      return;
    }

    // Test 1: Basic vector search
    console.log('\nTest 1: Basic vector search');
    try {
      const results1 = await collection.find(
        {},
        {
          sort: {
            $vector: queryEmbedding
          },
          limit: 3
        }
      ).toArray();
      console.log(`Results: ${results1.length}`);
    } catch (error) {
      console.log('Test 1 failed:', error.message);
    }

    // Test 2: Vector search with includeSimilarity
    console.log('\nTest 2: Vector search with includeSimilarity');
    try {
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
      console.log(`Results: ${results2.length}`);
      if (results2.length > 0) {
        console.log('First result similarity:', results2[0].$similarity);
      }
    } catch (error) {
      console.log('Test 2 failed:', error.message);
    }

    // Test 3: Vector search with specific vector field
    console.log('\nTest 3: Vector search with specific vector field');
    try {
      const results3 = await collection.find(
        {},
        {
          sort: {
            $vector: queryEmbedding
          },
          limit: 3
        }
      ).toArray();
      console.log(`Results: ${results3.length}`);
    } catch (error) {
      console.log('Test 3 failed:', error.message);
    }

    // Test 4: Vector search with embedding field specification
    console.log('\nTest 4: Vector search with embedding field');
    try {
      const results4 = await collection.find(
        {},
        {
          sort: {
            $vector: queryEmbedding
          },
          limit: 3
        }
      ).toArray();
      console.log(`Results: ${results4.length}`);
    } catch (error) {
      console.log('Test 4 failed:', error.message);
    }

    // Test 5: Check if documents have the right embedding field
    console.log('\nTest 5: Check document structure');
    const sampleDoc = allDocs[0];
    console.log('Sample document fields:', Object.keys(sampleDoc));
    console.log('Has embedding field:', 'embedding' in sampleDoc);
    console.log('Embedding type:', typeof sampleDoc.embedding);
    console.log('Embedding length:', Array.isArray(sampleDoc.embedding) ? sampleDoc.embedding.length : 'not array');
    
    // Test 6: Check if embedding is actually a vector
    console.log('\nTest 6: Check embedding vector properties');
    console.log('Embedding is array:', Array.isArray(sampleDoc.embedding));
    console.log('Embedding first 5 values:', sampleDoc.embedding.slice(0, 5));
    console.log('Embedding last 5 values:', sampleDoc.embedding.slice(-5));
    
    // Test 7: Try vector search without any filters or limits
    console.log('\nTest 7: Vector search without limits');
    try {
      const results7 = await collection.find(
        {},
        {
          sort: {
            $vector: queryEmbedding
          }
        }
      ).toArray();
      console.log(`Results: ${results7.length}`);
    } catch (error) {
      console.log('Test 7 failed:', error.message);
    }
    
    // Test 8: Try with a simple text search to verify collection works
    console.log('\nTest 8: Simple text search');
    try {
      const textResults = allDocs.filter(doc => 
        doc.chunk_text?.toLowerCase().includes('titration')
      );
      console.log(`Text search results: ${textResults.length}`);
      if (textResults.length > 0) {
        console.log('First text result:', textResults[0].chunk_text?.substring(0, 100));
      }
    } catch (error) {
      console.log('Test 8 failed:', error.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testVectorSearch(); 