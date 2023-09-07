import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

function validateCronjobBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return false;
  }
  return token === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!validateCronjobBearerToken(request)) {
    return new Response("Not valid request", { status: 400 });
  }

  // Delete all conversation history older from the day before
  await prisma.conversation_history.deleteMany({
    where: {
      created_at: {
        lt: new Date(),
      },
    },
  });

  return new Response("ok", { status: 200 });
}
