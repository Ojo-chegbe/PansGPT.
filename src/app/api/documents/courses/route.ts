import { NextResponse } from "next/server";
import { getClient } from "@/lib/db";

export async function GET() {
  try {
    const client = await getClient();
    const documentsCollection = await client.createCollection('documents');
    const docs = await documentsCollection.find({}).toArray();

    // Get unique courses
    const courseMap = new Map();
    docs.forEach(doc => {
      if (doc.course_code && doc.course_title && doc.level) {
        const key = `${doc.course_code}|${doc.course_title}|${doc.level}`;
        if (!courseMap.has(key)) {
          courseMap.set(key, {
            courseCode: doc.course_code,
            courseTitle: doc.course_title,
            level: doc.level
          });
        }
      }
    });

    return NextResponse.json({ courses: Array.from(courseMap.values()) });
  } catch (err) {
    console.error("Failed to fetch courses:", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
} 