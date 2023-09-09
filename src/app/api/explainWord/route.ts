import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI();

// This function handles POST requests to the /api/speechToText route
export async function POST(request: NextRequest) {
  // Parse the request body
  const req = await request.json();
  
  const word = req.word;
  const context = req.context;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "Whenever you are requested to explain what a word means, make sure to begin the explanation with 'Explanation:'. Don't give examples. If context is provided, start with 'In the context of ...'."
        },
        {
          role: "user",
          content: `What does '${word}' mean in spanish in the context of '${context}' ?`
        }
      ]
    });

    const explanation = response.choices[0].message.content;

    return NextResponse.json({ explanation });
  } catch (error: any) {
      console.error(`Error with OpenAI API request: ${error.message}`);
      return NextResponse.json(
        { error: "An error occurred during your request." },
        { status: 500 },
      );
    
  }
}
