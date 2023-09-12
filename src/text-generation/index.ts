import { BufferMemory } from "langchain/memory";
import { PlanetScaleChatMessageHistory } from "langchain/stores/message/planetscale";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { Client } from "@planetscale/database";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} from "langchain/prompts";
import { ConversationChain } from "langchain/chains";
import dayjs from "dayjs";
import "dayjs/locale/es"; // load on demand

dayjs.locale("es"); // use Spanish locale globally

// initialize the database client
const client = new Client({
  host: process.env.PLANETSCALE_DB_HOST,
  username: process.env.PLANETSCALE_DB_USERNAME,
  password: process.env.PLANETSCALE_DB_PASSWORD,
});

const chat = new ChatOpenAI({
  temperature: 0.7,
});

/**
 * This function starts a conversation with the AI
 * @param input Prompt to send to the AI
 * @param sessionId Id that represents the conversation session
 * @returns string | null
 */
export async function createConversation(
  text: string,
  sessionId: string,
  language: string,
) {
  let systemPrompt = "";

  if (language === "es") {
    systemPrompt =
      "Act as a woman native Spanish speaker who can also speak English. Similar to a human being, you have many likes and dislikes. It is up to you to decide what those are. I am a native english speaker who is trying to improve my spanish. You and I are having a casual conversation, asking each other different types of questions, conversating about various topics. If I don't understand something, I will ask you and you will explain it to me. You will correct me if I make a mistake. Today is {input_date}.";
  }

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemPrompt);
  // apply the chat history to the prompt
  const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate("{text}");

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    systemMessagePrompt,
    new MessagesPlaceholder("chat_history"), // the chat history will be applied here
    humanMessagePrompt,
  ]);
  
  // get the conversation history from the database
  const memory = new BufferMemory({
    chatHistory: new PlanetScaleChatMessageHistory({
      tableName: "conversation_history",
      sessionId,
      client,
    }),
    memoryKey: "chat_history", // the key to apply the chat history to the current prompt
    inputKey: "text", // the key that represents the input text {text}
    returnMessages: true, // return the messages from the database
  });

  // create a new chain for the conversation adding the memory and system prompt
  const chain = new ConversationChain({
    llm: chat,
    memory,
    prompt: chatPrompt,
    verbose: process.env.NODE_ENV === "development",
  });

  try {
    // talk to AI
    const { response } = await chain.call({
      input_date: dayjs(new Date()).format("MMMM D, YYYY, h:mm:ss a"),
      text,
    });

    return response as string;
  } catch (e) {
    console.error(e);
    return null;
  }
}
