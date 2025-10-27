import { Client, Databases } from "node-appwrite";
import { NextResponse } from "next/server";

export async function GET() {
  const config = {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    apiKey: process.env.APPWRITE_API_KEY,
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
    errorCollection: process.env.NEXT_PUBLIC_APPWRITE_ERROR_SUBMISSIONS_COLLECTION_ID,
    usageCollection: process.env.NEXT_PUBLIC_APPWRITE_DAILY_USAGE_COLLECTION_ID,
    votesCollection: process.env.NEXT_PUBLIC_APPWRITE_SOLUTION_VOTES_COLLECTION_ID,
  };

  const missing = [];
  const configured = [];

  Object.entries(config).forEach(([key, value]) => {
    if (!value) {
      missing.push(key);
    } else {
      configured.push(key);
    }
  });

  if (missing.length > 0) {
    return NextResponse.json({
      status: "error",
      message: "Missing environment variables",
      missing: missing,
      configured: configured,
    });
  }

  // Test Appwrite connection
  try {
    const client = new Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId)
      .setKey(config.apiKey);

    const databases = new Databases(client);

    // Try to list documents (should work even if collection is empty)
    try {
      await databases.listDocuments(
        config.databaseId,
        config.errorCollection,
        []
      );

      return NextResponse.json({
        status: "success",
        message: "All configurations are correct! Appwrite connection successful.",
        config: {
          endpoint: config.endpoint,
          projectId: config.projectId,
          databaseId: config.databaseId,
          collections: {
            errors: config.errorCollection,
            usage: config.usageCollection,
            votes: config.votesCollection,
          },
        },
      });
    } catch (dbError) {
      return NextResponse.json({
        status: "error",
        message: "Appwrite connection failed",
        error: dbError.message,
        code: dbError.code,
        type: dbError.type,
        hint: "Check if your Database ID and Collection IDs are correct in Appwrite Console",
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Failed to initialize Appwrite client",
      error: error.message,
      hint: "Check if your Appwrite Endpoint, Project ID, and API Key are correct",
    });
  }
}