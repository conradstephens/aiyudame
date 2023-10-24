// Import necessary libraries
import fs from "fs";
import { OpenAI } from "openai";

const openai = new OpenAI();

/**
 * This function converts audio data to text using the OpenAI API
 * @param audioData string | NodeJS.ArrayBufferView
 * @returns string
 */
export async function convertAudioToText(file: File, language: string) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Create a temporary file to store the audio data
  const inputPath = "/tmp/input.webm";
  fs.writeFileSync(inputPath, buffer);

  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(inputPath),
    model: "whisper-1",
    language,
  });
  // Delete the temporary files
  fs.unlinkSync(inputPath);
  // The API response contains the transcribed text
  const transcribedText = response.text;
  return transcribedText;
}
