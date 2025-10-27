import { Client, Databases } from "node-appwrite";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { documentId, clientId } = await request.json();

    if (!documentId || !clientId) {
      return NextResponse.json(
        { error: "Document ID and clientId are required" },
        { status: 400 }
      );
    }

    // Check if Appwrite is configured
    if (
      !process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
      !process.env.APPWRITE_API_KEY ||
      !process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
      !process.env.NEXT_PUBLIC_APPWRITE_ERROR_SUBMISSIONS_COLLECTION_ID
    ) {
      return NextResponse.json(
        { error: "Sharing service not configured" },
        { status: 500 }
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
      // Get the document
      const document = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ERROR_SUBMISSIONS_COLLECTION_ID,
        documentId
      );

      // Verify ownership
      if (document.clientId !== clientId) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }

      // Update document to mark as shared
      const updatedDoc = await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ERROR_SUBMISSIONS_COLLECTION_ID,
        documentId,
        {
          isShared: true,
          sharedAt: new Date().toISOString()
        }
      );

      return NextResponse.json({
        success: true,
        shareId: updatedDoc.shareId,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shared/${updatedDoc.shareId}`
      });

    } catch (error) {
      console.error("Error sharing document:", error);
      return NextResponse.json(
        { error: "Failed to share error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Share API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}