import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/db";

export async function GET() {
  try {
    const client = await getClient();
    
    // Get or create documents collection
    const documentsCollection = client.collection('documents');
    
    // Only fetch from the documents collection, not the chunks
    const docs = await documentsCollection.find({}).toArray();
    
    // Transform the documents to match the expected format
    const formattedDocs = docs.map(doc => ({
      document_id: doc._id,
      title: doc.title,
      file_name: doc.file_name,
      courseCode: doc.course_code,
      courseTitle: doc.course_title,
      professorName: doc.professor_name,
      topic: doc.topic,
      uploadedAt: doc.uploaded_at
    }));
    
    return NextResponse.json({ documents: formattedDocs });
  } catch (err) {
    console.error("Failed to fetch documents:", err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { document_id } = await req.json();
    if (!document_id) {
      return NextResponse.json({ error: "Missing document_id" }, { status: 400 });
    }

    const client = await getClient();

    // Get collections
    const documentsCollection = client.collection('documents');
    const chunksCollection = client.collection('document_chunks');

    // Delete the main document
    await documentsCollection.deleteOne({ _id: document_id });
    
    // Delete all associated chunks
    await chunksCollection.deleteMany({ document_id: document_id });
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete document:", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
} 

// Add this endpoint to get all unique topics
export async function GET_TOPICS() {
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