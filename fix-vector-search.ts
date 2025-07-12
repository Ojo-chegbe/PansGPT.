import { getClient } from './src/lib/db';

async function fixVectorSearch() {
  try {
    console.log('Fixing vector search...');
    const client = await getClient();

    // Get current documents and chunks
    console.log('Backing up current data...');
    const documents = await client.collection('documents').find({}).toArray();
    const chunks = await client.collection('document_chunks').find({}).toArray();
    
    console.log(`Found ${documents.length} documents and ${chunks.length} chunks`);

    // Drop existing collections
    console.log('Dropping existing collections...');
    try {
      await client.dropCollection('document_chunks');
      await client.dropCollection('documents');
    } catch (error) {
      console.log('Collections already dropped or error:', error.message);
    }

    // Recreate collections with correct vector configuration
    console.log('Creating documents collection...');
    await client.createCollection('documents');

    console.log('Creating document_chunks collection with vector search...');
    await client.createCollection('document_chunks', {
      vector: {
        dimension: 384,
        metric: 'cosine'
      }
    });

    // Reinsert documents
    console.log('Reinserting documents...');
    if (documents.length > 0) {
      await client.collection('documents').insertMany(documents);
    }

    // Reinsert chunks with vector field named correctly
    console.log('Reinserting chunks with correct vector field...');
    const chunksCollection = client.collection('document_chunks');
    
    for (const chunk of chunks) {
      // Create new document with vector field named correctly
      const newChunk = {
        _id: chunk._id,
        document_id: chunk.document_id,
        chunk_text: chunk.chunk_text,
        metadata: chunk.metadata,
        // Use $vector as the field name for vector search
        $vector: chunk.embedding
      };
      
      await chunksCollection.insertOne(newChunk);
    }

    console.log('Vector search fix completed!');
    
    // Test the fix
    console.log('\nTesting vector search after fix...');
    const testCollection = client.collection('document_chunks');
    const testDocs = await testCollection.find({}).toArray();
    console.log(`Test: Found ${testDocs.length} documents`);
    
    if (testDocs.length > 0) {
      console.log('Sample document fields:', Object.keys(testDocs[0]));
      console.log('Has $vector field:', '$vector' in testDocs[0]);
      console.log('$vector length:', testDocs[0].$vector?.length);
    }

  } catch (error) {
    console.error('Fix failed:', error);
  }
}

fixVectorSearch(); 