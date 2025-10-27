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
      // Get user's error history (exclude private entries)
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ERROR_SUBMISSIONS_COLLECTION_ID,
        [
          Query.equal("clientId", clientId),
          Query.equal("isPrivate", false), // Only fetch non-private entries
          Query.orderDesc("$createdAt"),
          Query.limit(100)
        ]
      );

      console.log("📋 History fetch:", {
        clientId,
        found: response.documents.length,
        total: response.total
      });

      // Transform documents to match component format
      const history = response.documents.map(doc => ({
        id: doc.$id,
        errorMessage: doc.errorMessage,
        language: doc.language,
        category: doc.category || "Runtime Error",
        severity: doc.severity || "medium",
        timestamp: doc.$createdAt,
        isShared: doc.isShared || false,
        isPrivate: doc.isPrivate || false,
        shareId: doc.shareId,
        analysis: {
          explanation: doc.explanation,
          causes: doc.causes || [],
          solutions: doc.solutions || [],
          exampleCode: doc.exampleCode || null
        }
      }));

      // Calculate stats
      const languages = {};
      const severity = { low: 0, medium: 0, high: 0 };
      const categories = {};
      const timelineMap = {};

      history.forEach(item => {
        // Count languages
        languages[item.language] = (languages[item.language] || 0) + 1;

        // Count severity
        const sev = item.severity.toLowerCase();
        if (severity.hasOwnProperty(sev)) {
          severity[sev]++;
        }

        // Count categories
        categories[item.category] = (categories[item.category] || 0) + 1;

        // Build timeline (last 7 days)
        const date = new Date(item.timestamp);
        const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        timelineMap[dateKey] = (timelineMap[dateKey] || 0) + 1;
      });

      // Convert timeline to array
      const timeline = Object.entries(timelineMap)
        .map(([label, count]) => ({ label, count }))
        .slice(0, 7)
        .reverse();

      const stats = {
        total: history.length,
        languages,
        severity,
        categories,
        timeline
      };

      return NextResponse.json({
        success: true,
        history: history,
        stats: stats
      });

    } catch (error) {
      console.error("❌ Error fetching history:", error);
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to fetch error history",
          history: [],
          stats: {
            total: 0,
            languages: {},
            severity: { low: 0, medium: 0, high: 0 },
            categories: {},
            timeline: []
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ History API error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to process request",
        history: [],
        stats: {
          total: 0,
          languages: {},
          severity: { low: 0, medium: 0, high: 0 },
          categories: {},
          timeline: []
        }
      },
      { status: 500 }
    );
  }
}