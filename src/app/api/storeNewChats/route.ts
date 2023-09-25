import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

interface RequestBody {
  data: { session_id: string; type: string; content: string }[];
}

export async function POST(request: NextRequest) {
  // Parse the request body
  const req: RequestBody = await request.json();

  const data = req.data;

  data.forEach(({ type, content }) => {
    console.log(`${type} => ${content}`);
  });

  // Save the conversation to the database
  await prisma.conversation_history.createMany({
    data,
  });

  console.log("chat saved to database!");

  return new Response("ok", { status: 200 });
}
