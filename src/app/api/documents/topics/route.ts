import { NextResponse } from "next/server";
import { getClient } from "@/lib/db";

export async function GET() {
  try {
    const client = await getClient();
    const documentsCollection = client.collection('documents');
    const docs = await documentsCollection.find({}).toArray();
    // Get unique, non-empty topics
    const topicsSet = new Set<string>();
    docs.forEach(doc => {
      if (doc.topic && typeof doc.topic === 'string' && doc.topic.trim()) {
        topicsSet.add(doc.topic.trim());
      }
    });
    return NextResponse.json({ topics: Array.from(topicsSet) });
  } catch (err) {
    console.error("Failed to fetch topics:", err);
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
  }
} 