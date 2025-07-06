import { DataAPIClient } from '@datastax/astra-db-ts';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let client: ReturnType<typeof DataAPIClient.prototype.db> | null = null;

export async function getClient() {
  if (client) return client;

  const requiredEnvVars = {
    ASTRA_DB_ID: process.env.ASTRA_DB_ID,
    ASTRA_DB_REGION: process.env.ASTRA_DB_REGION,
    ASTRA_DB_APPLICATION_TOKEN: process.env.ASTRA_DB_APPLICATION_TOKEN,
    ASTRA_DB_KEYSPACE: process.env.ASTRA_DB_KEYSPACE,
  };

  // Check for missing environment variables
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  try {
    // Initialize the client with increased timeouts
    const apiClient = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!, {
      timeoutDefaults: {
        requestTimeoutMs: 30000, // 30 seconds
        generalMethodTimeoutMs: 60000, // 1 minute
        collectionAdminTimeoutMs: 120000, // 2 minutes
      },
      logging: [
        { events: ['commandStarted', 'commandSucceeded'], emits: 'stdout' },
        { events: ['commandFailed', 'commandWarnings'], emits: 'stderr' }
      ]
    });
    
    // Get the database instance
    const dbEndpoint = `https://${process.env.ASTRA_DB_ID}-${process.env.ASTRA_DB_REGION}.apps.astra.datastax.com`;
    client = apiClient.db(dbEndpoint, { 
      keyspace: process.env.ASTRA_DB_KEYSPACE!,
      timeoutDefaults: {
        requestTimeoutMs: 30000, // 30 seconds
        generalMethodTimeoutMs: 60000 // 1 minute
      }
    });
    
    // Test the connection by listing collections
    try {
      const collections = await client.listCollections();
      console.log('Successfully connected to Astra DB. Available collections:', collections);
    } catch (error) {
      console.error('Failed to list collections:', error);
      // Don't throw here, as we might just have permission issues with listing collections
    }

    return client;
  } catch (error) {
    console.error('Failed to connect to Astra DB:', error);
    throw error;
  }
}

export async function closeClient() {
  // The Astra DB client doesn't require explicit cleanup
  client = null;
} 