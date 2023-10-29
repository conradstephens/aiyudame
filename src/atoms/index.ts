import { atom } from "jotai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

export const aiTextResponseAtom = atom<{ text: string; words: string[] }>({
  text: "",
  words: [],
});
export const sessionIdAtom = atom<string | null>(null);
export const showJoyRideAtom = atom<boolean>(false);
export const showAiResponseJoyRideAtom = atom<boolean>(false);
export const isReturningUserAtom = atom<boolean>(false);
export const recorderAtom = atom({
  isRecording: false,
  status: "Recording in progress...",
});
export const conversationHistoryAtom = atom<ChatCompletionMessageParam[]>([]);
