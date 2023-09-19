import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // Parse the request body
  const req = await request.json();

  const sessionId = req.sessionId;
  const aiResponse = req.aiResponse;
  const humanResponse = req.humanResponse;

  // Save the conversation to the database
  await prisma.conversation_history.createMany({
    data: [
      {
        session_id: sessionId,
        type: "human",
        content: humanResponse,
      },
      {
        session_id: sessionId,
        type: "ai",
        content: aiResponse,
      },
    ],
  });

  console.log("chat saved to database!")

  return new Response("ok", { status: 200 });
}
