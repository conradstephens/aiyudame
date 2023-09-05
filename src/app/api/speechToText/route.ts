import { NextRequest, NextResponse } from "next/server";
import { createConversation } from "@/text-generation";
import { blobToBase64String } from "@/lib/utils";
import { convertAudioToText } from "@/speech-to-text";

// This function handles POST requests to the /api/speechToText route
export async function POST(request: NextRequest) {
  // Parse the request body
  const req = await request.json();
  // Extract the audio data from the request body
  const base64Audio = req.audio;
  const sessionId = req.sessionId;
  console.log("sessionId", sessionId)
  // Convert the Base64 audio data back to a Buffer
  const audio = Buffer.from(base64Audio, "base64");
  try {
    // Convert the audio data to text
    const text = await convertAudioToText(audio);
    // Start a conversation with the AI
    const response = await createConversation(text, sessionId);
    console.log("response", response)
    if (!response) return NextResponse.json({ response: "No response" });

    // generate audio
    const voiceId = "N4Jse6hDfsD4Iqv16pxy";
    const elevenLabsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY as string,
        },
        body: JSON.stringify({
          text: response,
          model_id: "eleven_multilingual_v2",
        }),
      },
    );

    if (!elevenLabsRes.ok) {
      const error = await elevenLabsRes.json();
      console.error("Error generating audio", error);
      return NextResponse.json({ response });
    }
    // convert audio to base64
    const blob = await elevenLabsRes.blob();
    const base64Blob = await blobToBase64String(blob);
    // Return the the AI audio data
    return NextResponse.json({ result: base64Blob }, { status: 200 });
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
