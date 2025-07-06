import { NextRequest, NextResponse } from "next/server";
import { DataAPIClient as AstraDB } from "@datastax/astra-db-ts";

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_ENDPOINT = process.env.ASTRA_DB_ENDPOINT!;

const astraClient = new AstraDB(ASTRA_DB_APPLICATION_TOKEN);
const db = astraClient.db(ASTRA_DB_ENDPOINT);

export async function GET() {
  try {
    // Get or create documents collection
    const documentsCollection = await db.createCollection('documents');
    
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

    // Get collections
    const documentsCollection = await db.createCollection('documents');
    const chunksCollection = await db.createCollection('document_chunks');

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