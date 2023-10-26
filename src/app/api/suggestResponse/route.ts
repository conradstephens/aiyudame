import prisma from "@/lib/prisma";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/index.mjs";

const openai = new OpenAI();

// This function handles POST requests to the /api/suggestResponse route
export async function POST(request: NextRequest) {
  // Parse the request body
  const req = await request.json();

  const context = req.context;
  const sessionId = req.sessionId;

  try {
    // get last 6 messages from the database
    const planetscaleResponse = await prisma.conversation_history.findMany({
      where: {
        session_id: sessionId,
      },
      orderBy: {
        // Order by the most recent messages
        created_at: "desc",
      },
      take: 6, // Only get the last 6 messages
    });

    // Convert the messages into a format that OpenAI can understand
    const currentConversation = planetscaleResponse
      // reverse the order of the messages
      .reverse()
      .map(({ type, content }) => {
        const role = type === "human" ? "user" : "assistant";
        return { role, content } as ChatCompletionMessageParam;
      });

    const suggestion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You will be asked to suggest a response to a question/statement. Make sure the suggestion is in the same language as the question/statement. Make sure the suggestion is an open-ended response. Start with 'A good response would be, '.",
        },
        ...currentConversation,
        {
          role: "user",
          content: `Provide a response to the following question/statement: ${context}?`,
        },
      ],
      stream: true,
    });

    if (!suggestion) {
      throw new Error("Error generating suggestion.");
    }

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(suggestion);

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
