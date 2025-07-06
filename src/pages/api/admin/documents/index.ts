import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/astra';
import { supabase } from '@/lib/supabase';

async function ensureCollectionExists() {
  try {
    // First check if collection exists
    const collections = await db.listCollections();
    const exists = collections.some(c => c.name === 'documents');
    
    if (!exists) {
      // Create collection with minimal options
      await db.createCollection('documents');
      console.log('Created documents collection');
    } else {
      console.log('Documents collection already exists');
    }
  } catch (error: any) {
    console.error('Error ensuring collection exists:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Ensure collection exists before any operation
    await ensureCollectionExists();

  if (req.method === 'GET') {
    // List documents
    const docs = await db.collection('documents').find({}).toArray();
    res.status(200).json(docs);
  } else if (req.method === 'DELETE') {
    // Delete document by id (expects ?id=...)
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' });
    const doc = await db.collection('documents').findOne({ _id: id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    // Delete from Supabase Storage
    const fileName = doc.url.split('/').pop();
    if (fileName) await supabase.storage.from('documents').remove([fileName]);
    // Delete from Astra DB
    await db.collection('documents').deleteOne({ _id: id });
    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Database operation error:', error);
    res.status(500).json({ error: 'Database operation failed', details: error.message });
  }
} 