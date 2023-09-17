import { atom } from "jotai";

export const aiTextResponseAtom = atom<{ text: string; words: string[] }>({
  text: "",
  words: [],
});
export const sessionIdAtom = atom<string | null>(null);
export const showJoyRideAtom = atom<boolean>(false);
export const showAiResponseJoyRideAtom = atom<boolean>(false);
export const isReturningUserAtom = atom<boolean>(false);
export const recordingAtom = atom({
  recording: false,
  recordingText: "Recording in progress...",
  shouldUpdateText: false,
})
