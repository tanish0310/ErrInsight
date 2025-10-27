import { Client, Databases } from "node-appwrite";
import { NextResponse } from "next/server";

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");
    const clientId = searchParams.get("clientId");

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
        { error: "Delete service not configured" },
        { status: 500 }
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
      // Get the document to verify ownership
      const document = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ERROR_SUBMISSIONS_COLLECTION_ID,
        documentId
      );

      // Verify ownership
      if (document.clientId !== clientId) {
        return NextResponse.json(
          { error: "Unauthorized to delete this error" },
          { status: 403 }
        );
      }

      // Delete the document
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ERROR_SUBMISSIONS_COLLECTION_ID,
        documentId
      );

      return NextResponse.json({
        success: true,
        message: "Error deleted successfully"
      });

    } catch (error) {
      console.error("Error deleting document:", error);
      if (error.code === 404) {
        return NextResponse.json(
          { error: "Error not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to delete error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Delete API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}