"use client";

import {
  aiTextResponseAtom,
  conversationHistoryAtom,
  isReturningUserAtom,
  sessionIdAtom,
  showAiResponseJoyRideAtom,
  showJoyRideAtom,
} from "@/atoms";
import HomeScreen from "@/components/home-screen";
import Toolbar from "@/components/toolbar";
import Welcome from "@/components/welcome-screen";
import { storeResponse } from "@/constants/language";
import { scenarioPrompts } from "@/constants/prompts";
import { del, get, getMany, set } from "idb-keyval";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Loader2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

export default function Home() {
  const [sessionId, setSessionId] = useAtom(sessionIdAtom);
  const [{ text: aiResponseText }, setResponse] = useAtom(aiTextResponseAtom);
  const showJoyride = useAtomValue(showJoyRideAtom);
  const setShowAiResponseJoyRide = useSetAtom(showAiResponseJoyRideAtom);
  const [isReturningUser, setIsReturningUser] = useAtom(isReturningUserAtom);
  const setConversationHistory = useSetAtom(conversationHistoryAtom);

  const isNewUser = !isReturningUser && !showJoyride;

  const methods = useForm({
    defaultValues: {
      language: "es",
      scenario: "freetalk",
    },
  });

  const language = methods.watch("language");
  const scenario = methods.watch("scenario");

  const handleLanguageUpdate = async () => {
    // get the first 21 out of 24 characters of the session id
    // always adding a "-" and the language code to the end of the session id
    // TODO: improve this logic once the app gains more users
    if (!sessionId) {
      return;
    }
    const updatedSessionId = `${sessionId.slice(0, 21)}-${language}`;
    setSessionId(updatedSessionId);
    let previousResponse: string | undefined;
    switch (language) {
      case "it":
        previousResponse = await get("previousItalianResponse");
        break;
      case "en":
        previousResponse = await get("previousEnglishResponse");
        break;
      default:
        previousResponse = await get("previousSpanishResponse");
        break;
    }
    if (!isNewUser) {
      if (previousResponse) {
        const text = previousResponse;
        const words = previousResponse.length
          ? previousResponse.split(" ")
          : [];
        setResponse({ text, words });
      } else {
        setResponse({ text: "", words: [] });
        setConversationHistory([]);
        handleAiGreetings(updatedSessionId);
      }
    }
  };
  // update session id when language changes
  useEffect(() => {
    handleLanguageUpdate();
  }, [language]);

  const createSession = async () => {
    const id = nanoid();
    await set("session", {
      sessionId: id,
      createdAt: new Date().toLocaleString(),
    });
    setResponse({ text: "", words: [] });
    await del("previousResponse");
    setSessionId(`${id}-${language}`);
    // clear the previous response
  };

  useEffect(() => {
    const retrieveSession = async () => {
      // get the settings
      // get the conversation session id
      const store = await getMany([
        "isReturningUser",
        "settings",
        "session",
        "previousItalianResponse",
        "previousSpanishResponse",
        "previousEnglishResponse",
        "hasFinishedAiResponseJoyride",
      ]);
      const [
        isReturningUser,
        settings,
        session,
        previousItalianResponse,
        previousSpanishResponse,
        previousEnglishResponse,
        hasFinishedAiResponseJoyride,
      ] = store;
      const previousUsedLanguage = settings?.language ?? "es";
      const previousUsedScenario = settings?.scenario ?? "freetalk";
      methods.setValue("language", previousUsedLanguage);
      methods.setValue("scenario", previousUsedScenario);
      // restore the last thing the ai said
      switch (previousUsedLanguage) {
        case "it":
          if (previousItalianResponse) {
            setResponse({
              text: previousItalianResponse,
              words: previousItalianResponse.split(" "),
            });
          }
          break;
        case "en":
          if (previousEnglishResponse) {
            setResponse({
              text: previousEnglishResponse,
              words: previousEnglishResponse.split(" "),
            });
          }
          break;
        default:
          if (previousSpanishResponse) {
            setResponse({
              text: previousSpanishResponse,
              words: previousSpanishResponse.split(" "),
            });
          }
          break;
      }
      setIsReturningUser(!!isReturningUser);
      setShowAiResponseJoyRide(!hasFinishedAiResponseJoyride);
      // if session id is not present, create a new session id
      if (!session) {
        await createSession();
        return;
      }

      // if session id is present, check if it is expired, check if the session created time is a new day
      const {
        sessionId: id,
        createdAt,
      }: { sessionId: string; createdAt: string } = session;
      const now = new Date();
      const createdDate = new Date(createdAt);
      const isSameDay = createdDate.getDate() === now.getDate();
      if (!isSameDay) {
        await createSession();
        return;
      }
      // const conversationHistoryRequest = await fetch(
      //   "/api/getConversationHistory",
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       sessionId: id,
      //     }),
      //   },
      // );

      // if (!conversationHistoryRequest.ok) {
      //   console.error("Error getting conversation history");
      // }

      // const {
      //   conversationHistory,
      // }: { conversationHistory: ChatCompletionMessageParam[] } =
      //   await conversationHistoryRequest.json();
      // console.log("conversation length => ", conversationHistory.length);
      // setConversationHistory(conversationHistory);
      // if session id is present and not expired, use the session id
      setSessionId(id);
    };
    retrieveSession();
  }, []);

  // function for ai to greet the user
  const handleAiGreetings = async (currentSessionId: string) => {
    try {
      const prompt = scenarioPrompts[scenario];
      const opeanAiChatRes = await fetch("/api/chatCompletion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "Greet yourself with your name!",
          conversationHistory: [],
          language,
          prompt,
        }),
      });

      if (!opeanAiChatRes.ok) {
        throw new Error("Error generating openai response");
      }

      const body = opeanAiChatRes.body;

      if (!body) {
        return;
      }
      const openAiReader = body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = "";
      while (!done) {
        const { value, done: doneReading } = await openAiReader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        setResponse((prev) => {
          const newText = prev.text + chunkValue;
          return {
            words: newText.split(" "),
            text: newText,
          };
        });
        text += chunkValue;
      }
      await storeResponse(language, text);
      // save the response to db
      const res = await fetch("/api/storeNewChats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              session_id: currentSessionId,
              type: "ai",
              content: text,
            },
          ],
        }),
      });

      setConversationHistory((prev) => {
        return [
          ...prev,
          {
            role: "assistant",
            content: text,
          },
        ];
      });

      if (!res.ok) {
        console.error("Error storing chats");
        const data = await res.json();
        console.error(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // if the user is returning, and there is no text, then we need to generate an intro
  useEffect(() => {
    if (isReturningUser && sessionId && !aiResponseText) {
      handleAiGreetings(sessionId);
    }
  }, [sessionId, isReturningUser]);

  useEffect(() => {
    if (isReturningUser && sessionId && aiResponseText) {
      setResponse({ text: "", words: [] });
      handleAiGreetings(sessionId);
    }
  }, [scenario]);

  // if no session id show loading
  if (!sessionId) {
    return (
      <div className="flex justify-center h-screen items-center zinc">
        <Loader2 className="h-14 w-14 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex justify-center h-screen app-container">
      <div className="flex flex-col p-5 sm:max-w-7xl w-full">
        <Toolbar methods={methods} />
        {isNewUser ? (
          // show welcome screen
          <Welcome />
        ) : (
          // show the home screen
          <HomeScreen language={language} scenario={scenario} />
        )}
      </div>
    </div>
  );
}
