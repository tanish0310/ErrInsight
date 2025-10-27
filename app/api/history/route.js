import { Client, Databases, Query } from "node-appwrite";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
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
        { error: "History service not configured" },
        { status: 500 }
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
      // Get user's error history
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ERROR_SUBMISSIONS_COLLECTION_ID,
        [
          Query.equal("clientId", clientId),
          Query.orderDesc("$createdAt"),
          Query.limit(100) // Limit to last 100 errors
        ]
      );

      const errors = response.documents.map(doc => ({
        id: doc.$id,
        errorMessage: doc.errorMessage,
        language: doc.language,
        category: doc.category,
        severity: doc.severity,
        timestamp: doc.$createdAt,
        isShared: doc.isShared,
        shareId: doc.shareId,
        explanation: doc.explanation,
        causes: doc.causes,
        solutions: doc.solutions,
        exampleCode: doc.exampleCode
      }));

      return NextResponse.json({
        success: true,
        errors: errors,
        total: response.total
      });

    } catch (error) {
      console.error("Error fetching history:", error);
      return NextResponse.json(
        { error: "Failed to fetch error history" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("History API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}