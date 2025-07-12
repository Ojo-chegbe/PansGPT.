import { getClient } from './db';

let dbInstance: Awaited<ReturnType<typeof getClient>> | null = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await getClient();
  }
  return dbInstance;
}

// Export a default db instance for backward compatibility
export const db = {
  collection: async (name: string) => {
    const client = await getDb();
    return client.collection(name);
  },
  listCollections: async () => {
    const client = await getDb();
    return client.listCollections();
  },
  createCollection: async (name: string) => {
    const client = await getDb();
    return client.createCollection(name);
  }
}; 