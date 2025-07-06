import { DataAPIClient as AstraDB } from "@datastax/astra-db-ts";

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_ENDPOINT = process.env.ASTRA_DB_ENDPOINT!;
const ASTRA_DB_COLLECTION = process.env.ASTRA_DB_COLLECTION || 'document_chunks';

async function checkDB() {
  try {
    console.log('Connecting to AstraDB...');
    const astraClient = new AstraDB(ASTRA_DB_APPLICATION_TOKEN);
    const db = astraClient.db(ASTRA_DB_ENDPOINT);
    const collection = db.collection(ASTRA_DB_COLLECTION);

    // Get all documents to count them
    const documents = await collection.find({}).toArray();
    const count = documents.length;
    console.log(`Total documents in collection: ${count}`);

    // Show sample document if any exist
    if (count > 0) {
      console.log('Sample document:', JSON.stringify(documents[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDB(); 