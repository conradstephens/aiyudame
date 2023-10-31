import prisma from "@/lib/prisma";
import "dayjs/locale/es";
import { NextRequest, NextResponse } from "next/server";
import { ChatCompletionMessageParam } from "openai/resources/chat/index.mjs";

// This function handles POST requests to the /api/speechToText route
export async function POST(request: NextRequest) {
  // Parse the request body
  const req = await request.json();
  const sessionId = req.sessionId;
  console.log("sessionId => ", sessionId);
  try {
    const planetscaleResponse = await prisma.conversation_history.findMany({
      where: {
        session_id: sessionId,
      },
      orderBy: {
        // Order by the most recent messages
        created_at: "asc",
      },
    });

    // Convert the messages into a format that OpenAI can understand
    const conversationHistory = planetscaleResponse.map(({ type, content }) => {
      const role = type === "human" ? "user" : "assistant";
      return { role, content } as ChatCompletionMessageParam;
    });

    return NextResponse.json({ conversationHistory });
  } catch (error: any) {
    console.error("error => ", error);
    return NextResponse.json(
      { error: "An error occurred during your request." },
      { status: 500 },
    );
  }
}
