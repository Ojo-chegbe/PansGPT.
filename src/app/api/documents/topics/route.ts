import { NextResponse } from "next/server";
import { getClient } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get('courseCode');
    
    const client = await getClient();
    const documentsCollection = client.collection('documents');
    
    // Build filter based on courseCode if provided
    const filter: any = {};
    if (courseCode) {
      filter.course_code = courseCode;
    }
    
    const docs = await documentsCollection.find(filter).toArray();
    
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