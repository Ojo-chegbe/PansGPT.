import { getClient } from '../src/lib/db';

async function main() {
  try {
    console.log('Testing Astra DB connection...');
    const client = await getClient();

    // Check documents collection
    const documentsCollection = await client.collection('documents');
    const documents = await documentsCollection.find({}).toArray();
    console.log('\nDocuments collection:', documents.length, 'documents found');
    
    // Check document_chunks collection
    const chunksCollection = await client.collection('document_chunks');
    const chunks = await chunksCollection.find({}).toArray();
    console.log('\nDocument chunks collection:', chunks.length, 'chunks found');
    
    // Print sample chunk if available
    if (chunks.length > 0) {
      console.log('\nSample chunk:');
      const sampleChunk = chunks[0];
      console.log({
        id: sampleChunk._id,
        text: sampleChunk.chunk_text?.substring(0, 200) + '...',
        metadata: sampleChunk.metadata,
        hasEmbedding: !!sampleChunk.embedding,
        embeddingSize: sampleChunk.embedding?.length
      });
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

main(); 