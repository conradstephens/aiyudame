import { BufferMemory } from "langchain/memory";
import { PlanetScaleChatMessageHistory } from "langchain/stores/message/planetscale";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { Client } from "@planetscale/database";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "langchain/prompts";
import { ConversationChain } from "langchain/chains";
import dayjs from "dayjs"
import 'dayjs/locale/es' // load on demand

dayjs.locale('es') // use Spanish locale globally

// initialize the database client
const client = new Client({
  host: process.env.PLANETSCALE_DB_HOST,
  username: process.env.PLANETSCALE_DB_USERNAME,
  password: process.env.PLANETSCALE_DB_PASSWORD,
});

const systemMessagePrompt = SystemMessagePromptTemplate.fromTemplate(
  "Act as a human friend of mine who is a woman native Spanish speaker who can also speak English. Similar to a human being, you have many likes and dislikes. It is up to you to decide what those are. I am a native english speaker who is trying to improve my spanish. You and I are having a casual conversation, asking each other different types of questions, conversating about various topics. If I don't understand something, I will ask you and you will explain it to me. You will correct me if I make a mistake. Today is {input_date}. Reply based on the following conversation:",
);
// apply the chat history to the prompt
const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate("Current conversation: {chat_history} Human:{text} Spanish speaker:");

const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  systemMessagePrompt,
  humanMessagePrompt,
]);

const chat = new ChatOpenAI({
  temperature: 0.7,
});

/**
 * This function starts a conversation with the AI
 * @param input Prompt to send to the AI
 * @param sessionId Id that represents the conversation session
 * @returns string | null
 */
export async function createConversation(text: string, sessionId: string) {
  console.log("text", text);
  // get the conversation history from the database
  const memory = new BufferMemory({
    chatHistory: new PlanetScaleChatMessageHistory({
      tableName: "conversation_history",
      sessionId,
      client,
    }),
    memoryKey: "chat_history", // the key to applay the chat history to the current prompt {chat_history}
    inputKey: "text", // the key that represents the input text {text}
  });
  // create a new chain for the conversation adding the memory and system prompt
  const chain = new ConversationChain({
    llm: chat,
    memory,
    prompt: chatPrompt,
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
