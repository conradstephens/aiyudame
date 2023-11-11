import { OpenAIStream, StreamingTextResponse } from "ai";
import "dayjs/locale/es";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/index.mjs";

const openai = new OpenAI();

// const generateSystemPrompt = (language: string) => {
//   const currentDateTime = dayjs(new Date()).format("MMMM D, YYYY, h:mm:ss a");
//   switch (language) {
//     case "es":
//       return `Act as a woman native Spanish speaker. Similar to a human being, you have many likes and dislikes. It is up to you to decide what those are. You and I are having a casual conversation, asking each other different types of questions, conversating about various topics. If I don't understand something, I will ask you and you will explain it to me. Today is ${currentDateTime}.`;
//     case "it":
//       return `Act as a woman native Italian speaker. Similar to a human being, you have many likes and dislikes. It is up to you to decide what those are. I am a native english speaker who is trying to improve my Italian. You and I are having a casual conversation, asking each other different types of questions, conversating about various topics. If I don't understand something, I will ask you and you will explain it to me. You will correct me if I make a mistake. Today is ${currentDateTime}.`;
//     default:
//       return `Act as a woman. Similar to a human being, you have many likes and dislikes. It is up to you to decide what those are. You and I are having a casual conversation, asking each other different types of questions, conversating about various topics.Today is ${currentDateTime}.`;
//   }
// };

// This function handles POST requests to the /api/speechToText route
export async function POST(request: NextRequest) {
  // Parse the request body
  const req = await request.json();

  const content = req.content;
  // const language = req.language;
  const prompt = req.prompt;
  const conversationHistory =
    req.conversationHistory as ChatCompletionMessageParam[];

  try {
    // const systemPrompt = generateSystemPrompt(language);

    console.log("content => ", content);

    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        ...conversationHistory,
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
