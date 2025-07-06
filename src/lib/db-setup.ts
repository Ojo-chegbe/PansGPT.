import { getClient } from './db';

interface DocumentMetadata {
  professorName: string;
  title: string;
  courseCode: string;
  courseTitle: string;
  topic: string;
  course: string;
}

interface Document {
  _id: string;
  professor_name: string;
  course_code: string;
  topic: string;
  title: string;
  created_at: string;
}

interface DocumentChunk {
  _id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding: number[];
  created_at: string;
  metadata: DocumentMetadata;
}

export async function setupCollections() {
  const client = await getClient();

  try {
    // Delete existing collections if they exist
    try {
      const collections = await client.listCollections();
      for (const collection of collections) {
        if (collection.name === 'documents' || collection.name === 'document_chunks') {
          await client.collection(collection.name).drop();
        }
      }
    } catch (e) {
      console.log('No existing collections to delete');
    }

    // Create collections
    await client.createCollection('documents');
    await client.createCollection('document_chunks', {
      vector: {
        dimension: 384,
        metric: 'cosine'
      }
    });

    // Get collection references
    const documentsCollection = await client.collection<Document>('documents');
    const chunksCollection = await client.collection<DocumentChunk>('document_chunks');

    // Create sample documents to ensure collections are properly initialized
    const sampleDoc = {
      _id: 'sample_doc',
      professor_name: 'test',
      course_code: 'test',
      topic: 'test',
      title: 'test',
      created_at: new Date().toISOString()
    };

    const sampleChunk = {
      _id: 'sample_chunk',
      document_id: 'test',
      chunk_index: 0,
      chunk_text: 'test',
      embedding: new Array(384).fill(0),
      created_at: new Date().toISOString(),
      metadata: {
        professorName: 'test',
        title: 'test',
        courseCode: 'test',
        courseTitle: 'test',
        topic: 'test',
        course: 'test'
      }
    };

    // Insert and then delete sample documents to initialize collections
    await documentsCollection.insertOne(sampleDoc);
    await chunksCollection.insertOne(sampleChunk);
    await documentsCollection.deleteOne({ _id: 'sample_doc' });
    await chunksCollection.deleteOne({ _id: 'sample_chunk' });

    console.log('Successfully created collections with vector search enabled');
    return true;
  } catch (error) {
    console.error('Failed to set up collections:', error);
    throw error;
  }
} 