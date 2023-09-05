import { NextRequest, NextResponse } from "next/server";
import { createConversation } from "@/text-generation";
import { convertAudioToText } from "@/speech-to-text";

// This function handles POST requests to the /api/speechToText route
export async function POST(request: NextRequest) {
  // Parse the request body
  const req = await request.json();
  // Extract the audio data from the request body
  const base64Audio = req.audio;
  const sessionId = req.sessionId;
  console.log("sessionId", sessionId);
  // Convert the Base64 audio data back to a Buffer
  const audio = Buffer.from(base64Audio, "base64");
  try {
    // Convert the audio data to text
    const text = await convertAudioToText(audio);
    // Start a conversation with the AI
    console.log("human:", text)
    const response = await createConversation(text, sessionId);
    console.log("ai:", response);
    if (!response) return NextResponse.json({ error: "Error creating conversation" }, { status: 500 });

    return NextResponse.json({ openaiResponse: response });

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
