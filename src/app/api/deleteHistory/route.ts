import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isCron = searchParams.get("isCron");
  if (!isCron || isCron !== "true") {
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
