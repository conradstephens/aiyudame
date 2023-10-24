import { convertAudioToText } from "@/speech-to-text";
import "dayjs/locale/es";
import { NextRequest, NextResponse } from "next/server";

// Text that gets transcribed when there is nobody speaking in the audio
// help reduce hallucination
const badText = [
  "Subtítulos realizados por la comunidad de Amara.org", // spanish transcription
  "you", // english transcription
  "",
  "Sottotitoli creati dalla comunità Amara.org", // italian transcription
];

// This function handles POST requests to the /api/speechToText route
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const sessionId = formData.get("sessionId");
  const language = formData.get("language");
  const file = formData.get("audioBlob");

  if (!sessionId || !language || !file) {
    return NextResponse.json({ error: "Missing data" }, { status: 500 });
  }

  try {
    // Convert the audio data to text
    const transcribedText = await convertAudioToText(
      file as File,
      language as string,
    );

    // If the audio is empty, return an error
    if (badText.some((bad) => transcribedText === bad)) {
      return NextResponse.json(
        { error: "No audio detected. Try again" },
        { status: 500 },
      );
    }

    return NextResponse.json({ text: transcribedText }, { status: 200 });
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
