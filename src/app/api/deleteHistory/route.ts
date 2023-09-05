import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isCron = searchParams.get('isCron');
  if (!isCron || isCron !== 'true') {
    return new Response('Not valid request', { status: 200 });
  }
  // Delete all conversation history older from the day before
  await prisma.conversation_history.deleteMany({
    where: {
      created_at: {
        lt: new Date()
      }
    }
  })

  return new Response('Successfully got isCron', { status: 200 });
}