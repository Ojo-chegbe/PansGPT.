import { getClient } from './src/lib/db';

async function main() {
  try {
    console.log('Setting up vector search...');
    const client = await getClient();

    // Get current collection info
    const collections = await client.listCollections();
    const chunksCollection = collections.find(c => c.name === 'document_chunks');
    
    console.log('Current collection configuration:', chunksCollection);

    if (!chunksCollection?.definition?.vector) {
      console.log('Collection is not vector-enabled. Recreating with vector search...');
      
      // Drop the collection if it exists
      if (chunksCollection) {
        console.log('Dropping existing collection...');
        await client.dropCollection('document_chunks');
      }

      // Create collection with vector search
      console.log('Creating collection with vector search...');
      const collection = await client.createCollection('document_chunks', {
        vector: {
          dimension: 384,
          metric: "cosine"
        }
      });

      console.log('Collection created with vector search:', collection);
    } else {
      console.log('Collection is already vector-enabled with configuration:', chunksCollection.definition.vector);
    }

    // Now we need to reinsert all documents
    console.log('\nRe-inserting documents...');
    const documents = await client.collection('documents').find({}).toArray();
    console.log(`Found ${documents.length} documents to process`);

    for (const doc of documents) {
      // Get the chunks for this document
      const chunks = await client.collection('document_chunks')
        .find({ document_id: doc._id })
        .toArray();
      
      console.log(`Processing ${chunks.length} chunks for document ${doc._id}`);

      // Reinsert chunks with embeddings
      for (const chunk of chunks) {
        await client.collection('document_chunks').insertOne({
          _id: chunk._id,
          document_id: chunk.document_id,
          chunk_text: chunk.chunk_text,
          embedding: chunk.embedding,
          metadata: chunk.metadata
        });
      }
    }

    console.log('Setup complete!');

  } catch (error) {
    console.error('Setup failed:', error);
  }
}

main(); 