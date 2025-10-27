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
      !process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
    ) {
      return NextResponse.json(
        { error: "Rate limit service not configured" },
        { status: 500 }
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const usageResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_DAILY_USAGE_COLLECTION_ID || 'daily-usage',
        [
          Query.equal("clientId", clientId),
          Query.equal("date", today),
          Query.limit(1)
        ]
      );

      let usageCount = 0;
      const limit = 5;

      if (usageResponse.documents.length > 0) {
        usageCount = usageResponse.documents[0].usageCount;
      }

      return NextResponse.json({
        success: true,
        used: usageCount,
        remaining: Math.max(0, limit - usageCount),
        limit: limit,
        canAnalyze: usageCount < limit,
        resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
      });

    } catch (error) {
      console.error("Error checking rate limit:", error);
      return NextResponse.json(
        { error: "Failed to check rate limit" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Rate limit API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}