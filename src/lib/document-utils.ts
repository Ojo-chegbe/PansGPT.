import { getSession } from "next-auth/react";

export async function logDocumentAccess(documentId: string) {
  try {
    const session = await getSession();
    if (!session?.user) return;

    const response = await fetch("/api/documents/access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId }),
    });

    if (!response.ok) {
      console.error("Failed to log document access");
    }
  } catch (error) {
    console.error("Error logging document access:", error);
  }
} 