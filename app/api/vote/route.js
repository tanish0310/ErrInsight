import { Client, Databases, ID, Query } from "node-appwrite";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { shareId, solutionIndex, voteType, userFingerprint } = await request.json();

    if (!shareId || solutionIndex === undefined || !voteType || !userFingerprint) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!['helpful', 'not_helpful'].includes(voteType)) {
      return NextResponse.json(
        { error: "Invalid vote type" },
        { status: 400 }
      );
    }

    // Check if Appwrite is configured
    if (
      !process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
      !process.env.APPWRITE_API_KEY ||
      !process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
      !process.env.NEXT_PUBLIC_APPWRITE_SOLUTION_VOTES_COLLECTION_ID
    ) {
      return NextResponse.json(
        { error: "Voting service not configured" },
        { status: 500 }
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
      // Check if user already voted for this solution
      const existingVotes = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_SOLUTION_VOTES_COLLECTION_ID || 'solution-votes',
        [
          Query.equal("shareId", shareId),
          Query.equal("solutionIndex", solutionIndex),
          Query.equal("userFingerprint", userFingerprint),
          Query.limit(1)
        ]
      );

      if (existingVotes.documents.length > 0) {
        // Update existing vote
        const voteDoc = existingVotes.documents[0];
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          process.env.NEXT_PUBLIC_APPWRITE_SOLUTION_VOTES_COLLECTION_ID || 'solution-votes',
          voteDoc.$id,
          { voteType }
        );
      } else {
        // Create new vote
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          process.env.NEXT_PUBLIC_APPWRITE_SOLUTION_VOTES_COLLECTION_ID || 'solution-votes',
          ID.unique(),
          {
            shareId,
            solutionIndex,
            voteType,
            userFingerprint
          }
        );
      }

      // Get vote counts
      const helpfulVotes = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_SOLUTION_VOTES_COLLECTION_ID || 'solution-votes',
        [
          Query.equal("shareId", shareId),
          Query.equal("solutionIndex", solutionIndex),
          Query.equal("voteType", "helpful")
        ]
      );

      const notHelpfulVotes = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_SOLUTION_VOTES_COLLECTION_ID || 'solution-votes',
        [
          Query.equal("shareId", shareId),
          Query.equal("solutionIndex", solutionIndex),
          Query.equal("voteType", "not_helpful")
        ]
      );

      return NextResponse.json({
        success: true,
        votes: {
          helpful: helpfulVotes.total,
          notHelpful: notHelpfulVotes.total
        }
      });

    } catch (error) {
      console.error("Error recording vote:", error);
      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Vote API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}