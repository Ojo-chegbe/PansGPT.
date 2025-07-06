import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { supabase } from './supabase';

async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Database URL:', process.env.DATABASE_URL);

    // Test database connection
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      return;
    }

    console.log('Successfully connected to Supabase!');
    console.log('Current users in database:', data);

  } catch (error) {
    console.error('Error testing Supabase connection:', error);
  }
}

// Run the test
testSupabaseConnection()
  .then(() => console.log('\nSupabase connection test completed!'))
  .catch((error) => console.error('Test failed:', error)); 