import { getClient } from './src/lib/db';

interface EmbeddingResponse {
  embeddings: number[][];
}

interface SearchResponse {
  chunks: any[];
  grouped_results: any;
  total: number;
  query: string;
  metadata: any;
}

async function testSearch() {
  try {
    console.log('Testing search functionality...');
    
    // Test database connection
    console.log('1. Testing database connection...');
    const client = await getClient();
    const collection = client.collection('document_chunks');
    
    // Get total count
    const allDocs = await collection.find({}).toArray();
    console.log(`Total documents in collection: ${allDocs.length}`);
    
    if (allDocs.length === 0) {
      console.log('No documents found. Please upload some documents first.');
      return;
    }
    
    // Show sample document metadata
    console.log('\nSample document metadata:', allDocs[0].metadata);
    
    // Check if documents have embeddings
    console.log('\nChecking document embeddings...');
    const docsWithEmbeddings = allDocs.filter(doc => doc.embedding && doc.embedding.length > 0);
    console.log(`Documents with embeddings: ${docsWithEmbeddings.length}/${allDocs.length}`);
    
    if (docsWithEmbeddings.length > 0) {
      console.log('Sample embedding:', {
        size: docsWithEmbeddings[0].embedding.length,
        sample: docsWithEmbeddings[0].embedding.slice(0, 5)
      });
    } else {
      console.log('No documents have embeddings! This is the problem.');
      return;
    }
    
    // Test basic text search
    console.log('\n2. Testing basic text search...');
    const allDocsForSearch = await collection.find({}).toArray();
    const textSearchResults = allDocsForSearch.filter(doc => 
      doc.chunk_text?.toLowerCase().includes('titration')
    );
    
    console.log(`Text search found ${textSearchResults.length} results`);
    if (textSearchResults.length > 0) {
      console.log('Sample text search result:', {
        text: textSearchResults[0].chunk_text?.substring(0, 100),
        metadata: textSearchResults[0].metadata
      });
    }
    
    // Test basic find with professor filter
    console.log('\n3. Testing basic find with professor filter...');
    const professorResults = await collection.find({
      "metadata.professorName": "Professor Odumosu"
    }).toArray();
    
    console.log(`Professor filter found ${professorResults.length} results`);
    if (professorResults.length > 0) {
      console.log('Sample professor result:', {
        text: professorResults[0].chunk_text?.substring(0, 100),
        metadata: professorResults[0].metadata
      });
    }
    
    // Test vector search if embedding service is available
    console.log('\n4. Testing vector search...');
    try {
      const embedResponse = await fetch("https://pansgpt.onrender.com/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: ["titration"] }),
      });

      if (embedResponse.ok) {
        const embedData = await embedResponse.json() as EmbeddingResponse;
        const queryEmbedding = embedData.embeddings[0];
        
        console.log('Got embedding, testing vector search...');
        
        // Test without filters first
        const vectorSearchResults = await collection.find(
          {},
          {
            sort: {
              $vector: queryEmbedding
            },
            limit: 3
          }
        ).toArray();
        
        console.log(`Vector search found ${vectorSearchResults.length} results`);
        if (vectorSearchResults.length > 0) {
          console.log('Sample vector search result:', {
            text: vectorSearchResults[0].chunk_text?.substring(0, 100),
            metadata: vectorSearchResults[0].metadata
          });
        } else {
          console.log('Vector search failed, falling back to text search...');
          // Fallback to text search
          const fallbackResults = allDocsForSearch
            .filter(doc => doc.chunk_text?.toLowerCase().includes('titration'))
            .slice(0, 3);
          console.log(`Fallback text search found ${fallbackResults.length} results`);
        }
        
        // Test with professor filter
        console.log('\n5. Testing vector search with professor filter...');
        const filteredResults = await collection.find(
          { "metadata.professorName": "Professor Odumosu" },
          {
            sort: {
              $vector: queryEmbedding
            },
            limit: 3
          }
        ).toArray();
        
        console.log(`Filtered search found ${filteredResults.length} results`);
        if (filteredResults.length > 0) {
          console.log('Sample filtered result:', {
            text: filteredResults[0].chunk_text?.substring(0, 100),
            metadata: filteredResults[0].metadata
          });
        }
      } else {
        console.log('Embedding service not available, skipping vector search test');
      }
    } catch (embedError) {
      console.log('Embedding service error, skipping vector search test:', embedError);
    }
    
    // Test API endpoint
    console.log('\n6. Testing API endpoint...');
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pansgpt.vercel.app';
      const apiResponse = await fetch(`${BASE_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: "According to prof Odumosu. define titration",
          filters: { 
            max_chunks: 3,
            author: "Odumosu"
          }
        }),
      });

      if (apiResponse.ok) {
        const apiData = await apiResponse.json() as SearchResponse;
        console.log(`API search found ${apiData.total} results`);
        console.log('API response structure:', {
          hasChunks: !!apiData.chunks,
          hasGroupedResults: !!apiData.grouped_results,
          hasMetadata: !!apiData.metadata
        });
        
        if (apiData.chunks && apiData.chunks.length > 0) {
          console.log('Sample API result:', {
            text: apiData.chunks[0].chunk_text?.substring(0, 100),
            metadata: apiData.chunks[0].metadata
          });
        }
      } else {
        const errorText = await apiResponse.text();
        console.log('API search failed:', apiResponse.status, errorText);
      }
    } catch (apiError) {
      console.log('API test failed:', apiError);
    }
    
    console.log('\nSearch test completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSearch(); 