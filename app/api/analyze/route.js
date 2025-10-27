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
      const prompt = `You are an expert programmer analyzing errors. Analyze this ${language} error and respond ONLY with valid JSON, no markdown, no extra text.

Error Message:
${errorMessage}

Respond with ONLY this JSON structure (no markdown code blocks, no explanations outside JSON):
{
  "explanation": "Clear 2-3 sentence explanation of what this error means",
  "causes": ["cause1", "cause2", "cause3"],
  "solutions": ["solution1", "solution2", "solution3"],
  "category": "Runtime Error",
  "severity": "medium",
  "exampleCode": "// minimal code that reproduces this error"
}

Rules:
- solutions must be an array of strings, not objects
- Use one of these categories: Syntax Error, Runtime Error, Logic Error, Configuration Error, Network Error, Database Error
- Use one of these severities: low, medium, high, critical
- Keep explanation under 500 characters
- Provide 3-5 causes
- Provide 3-5 solutions as simple strings
- exampleCode should be actual working code (optional, can be null)

Return ONLY the JSON object, nothing else.`;

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
      
      // Ensure arrays are properly formatted for Appwrite
      const causesArray = Array.isArray(analysis.causes) 
        ? analysis.causes.map(c => String(c).substring(0, 500))
        : [];
      
      const solutionsArray = Array.isArray(analysis.solutions)
        ? analysis.solutions.map(s => String(s).substring(0, 2000))
        : [];
      
      console.log("Attempting to save to database with data:", {
        clientId,
        errorMessage: errorMessage.substring(0, 50) + "...",
        language,
        causesCount: causesArray.length,
        solutionsCount: solutionsArray.length,
        category: analysis.category,
        severity: analysis.severity,
      });

      try {
        const document = await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          process.env.NEXT_PUBLIC_APPWRITE_ERROR_SUBMISSIONS_COLLECTION_ID,
          ID.unique(),
          {
            clientId,
            errorMessage: errorMessage.substring(0, 10000),
            language: language.substring(0, 50),
            explanation: String(analysis.explanation || "").substring(0, 5000),
            causes: causesArray,
            solutions: solutionsArray,
            category: String(analysis.category || "Runtime Error").substring(0, 100),
            severity: String(analysis.severity || "medium").substring(0, 20),
            exampleCode: analysis.exampleCode ? String(analysis.exampleCode).substring(0, 5000) : "",
            isShared: false,
            isPrivate: false,
            shareId: shareId,
          }
        );
        
        console.log("Document saved successfully:", document.$id);
      } catch (saveError) {
        console.error("Database save error details:", {
          message: saveError.message,
          code: saveError.code,
          type: saveError.type,
          response: saveError.response,
        });
        throw saveError;
      }

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