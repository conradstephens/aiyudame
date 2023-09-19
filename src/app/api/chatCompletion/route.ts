import { NextRequest, NextResponse } from "next/server";
import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { ChatCompletionMessageParam } from "openai/resources/chat/index.mjs";
import dayjs from "dayjs";
import "dayjs/locale/es";

const openai = new OpenAI();

// This function handles POST requests to the /api/speechToText route
export async function POST(request: NextRequest) {
  // Parse the request body
  const req = await request.json();

  const content = req.content;
  const sessionId = req.sessionId;
  const language = req.language;

  console.log("human => ", content);

  try {
    let systemPrompt = "";

    if (language === "es") {
      systemPrompt = `Act as a woman native Spanish speaker who can also speak English. Similar to a human being, you have many likes and dislikes. It is up to you to decide what those are. I am a native english speaker who is trying to improve my spanish. You and I are having a casual conversation, asking each other different types of questions, conversating about various topics. If I don't understand something, I will ask you and you will explain it to me. You will correct me if I make a mistake. Today is ${dayjs(
        new Date(),
      ).format("MMMM D, YYYY, h:mm:ss a")}.`;
    }

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
    const currentConversation = planetscaleResponse.map(({ type, content }) => {
      const role = type === "human" ? "user" : "assistant";
      return { role, content } as ChatCompletionMessageParam;
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...currentConversation,
        {
          role: "user",
          content,
        },
      ],
      stream: true,
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);

    // Respond with the stream
    return new StreamingTextResponse(stream);
  } catch (error: any) {
    // Handle any errors that occur during the request
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return NextResponse.json({ error: error.response.data }, { status: 500 });
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      return NextResponse.json(
        { error: "An error occurred during your request." },
        { status: 500 },
      );
    }
  }
}
