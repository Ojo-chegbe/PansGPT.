import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/astra';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
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
} 