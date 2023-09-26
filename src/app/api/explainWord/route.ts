import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import { StreamingTextResponse, OpenAIStream } from "ai";

const openai = new OpenAI();

// This function handles POST requests to the /api/speechToText route
export async function POST(request: NextRequest) {
  // Parse the request body
  const req = await request.json();

  const word = req.word;
  const context = req.context;
  let language: string;
  switch (req.language) {
    case "en":
      language = "english";
      break;
    case "it":
      language = "italian";
      break;
    default:
      language = "spanish";
      break;
  }

  try {
    const explanation = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "Whenever you are requested to explain what a word means, make sure to begin the explanation with 'Explanation:'. Don't give examples. If context is provided, start with 'In this context...', but don't repeat the context.",
        },
        {
          role: "user",
          content: `What does '${word}' mean in ${language} in the context of '${context}' ?`,
        },
      ],
      stream: true,
    });

    if (!explanation) {
      throw new Error("Error generating explanation.");
    }

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(explanation);

    // Respond with the stream
    return new StreamingTextResponse(stream);
  } catch (error: any) {
    console.error(`Error with OpenAI API request: ${error.message}`);
    return NextResponse.json(
      { error: "Error generating explanation." },
      { status: 500 },
    );
  }
}
