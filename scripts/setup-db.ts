import { getClient } from '../src/lib/db';

async function main() {
  const client = await getClient();

  try {
    console.log('Starting database setup...');

    // First, drop existing collections if they exist
    const collections = await client.listCollections();
    for (const collection of collections) {
      if (collection.name === 'documents' || collection.name === 'document_chunks') {
        console.log(`Dropping collection: ${collection.name}`);
        await client.collection(collection.name).drop();
      }
    }

    // Create documents collection
    console.log('Creating documents collection...');
    await client.createCollection('documents');

    // Create document_chunks collection with vector search
    console.log('Creating document_chunks collection with vector search...');
    await client.createCollection('document_chunks', {
      vector: {
        dimension: 384,
        metric: 'cosine'
      }
    });

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error during database setup:', error);
    process.exit(1);
  }
}

main(); 