import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { Client, Databases, ID, Query } from "node-appwrite";
import { NextResponse } from "next/server";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(request) {
  try {
    const { errorMessage, language, clientId } = await request.json();

    if (!errorMessage || !language || !clientId) {
      return NextResponse.json(
        { error: "Error message, language, and clientId are required" },
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
        { error: "Service not configured" },
        { status: 500 }
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Check rate limit (5 per day)
    const today = new Date().toISOString().split('T')[0];
    
    try {
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
      let usageDocId = null;

      if (usageResponse.documents.length > 0) {
        usageCount = usageResponse.documents[0].usageCount;
        usageDocId = usageResponse.documents[0].$id;
      }

      if (usageCount >= 5) {
        return NextResponse.json(
          { error: "Daily limit of 5 analyses reached. Try again tomorrow!" },
          { status: 429 }
        );
      }

      // Call Groq AI for analysis
      const prompt = `Analyze this ${language} error and provide a structured response:

Error: ${errorMessage}

Provide your response in the following JSON format:
{
  "explanation": "Clear explanation of what this error means",
  "causes": ["cause1", "cause2", "cause3"],
  "solutions": [
    {
      "title": "Solution title",
      "description": "Detailed solution",
      "code": "example code if applicable"
    }
  ],
  "category": "one of: Syntax Error, Runtime Error, Logic Error, Configuration Error, Network Error, Database Error",
  "severity": "one of: low, medium, high, critical",
  "exampleCode": "minimal reproducible code example that causes this error"
}`;

      const { text } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt: prompt,
        temperature: 0.7,
        maxTokens: 2000,
      });

      // Parse AI response
      let analysis;
      try {
        // Extract JSON from response (AI might add markdown formatting)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : text;
        
        console.log("AI Response:", text); // Debug log
        console.log("Extracted JSON:", jsonText); // Debug log
        
        analysis = JSON.parse(jsonText);
        
        // Validate required fields
        if (!analysis.explanation || !analysis.causes || !analysis.solutions) {
          throw new Error("AI response missing required fields");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        console.error("Raw AI response:", text);
        
        // Fallback: create a basic analysis from the raw text
        analysis = {
          explanation: text.substring(0, 500) || "Unable to analyze this error. Please try again.",
          causes: ["Unable to determine specific causes. Please check the error format."],
          solutions: [{
            title: "Verify Error Format",
            description: "Ensure the error message is complete and properly formatted.",
            code: ""
          }],
          category: "Unknown Error",
          severity: "medium",
          exampleCode: null
        };
      }

      // Save to database
      const shareId = ID.unique();
      const document = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ERROR_SUBMISSIONS_COLLECTION_ID,
        ID.unique(),
        {
          clientId,
          errorMessage,
          language,
          explanation: analysis.explanation,
          causes: analysis.causes,
          solutions: analysis.solutions,
          category: analysis.category || "Runtime Error",
          severity: analysis.severity || "medium",
          exampleCode: analysis.exampleCode || null,
          isShared: false,
          isPrivate: false,
          shareId: shareId,
        }
      );

      // Update usage count
      if (usageDocId) {
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          process.env.NEXT_PUBLIC_APPWRITE_DAILY_USAGE_COLLECTION_ID || 'daily-usage',
          usageDocId,
          { usageCount: usageCount + 1 }
        );
      } else {
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          process.env.NEXT_PUBLIC_APPWRITE_DAILY_USAGE_COLLECTION_ID || 'daily-usage',
          ID.unique(),
          {
            clientId,
            date: today,
            usageCount: 1
          }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: document.$id,
          shareId: shareId,
          analysis: {
            explanation: analysis.explanation,
            causes: analysis.causes,
            solutions: analysis.solutions,
            category: analysis.category,
            severity: analysis.severity,
            exampleCode: analysis.exampleCode
          },
          remainingAnalyses: 5 - (usageCount + 1)
        }
      });

    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Database operation failed" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Analysis API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze error" },
      { status: 500 }
    );
  }
}