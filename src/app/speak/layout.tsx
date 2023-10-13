"use client";

import ThemeToggle from "@/components/theme-toggle";
import React, { useEffect } from "react";
import { del, get, getMany, set } from "idb-keyval";
import LanguageSelect from "@/components/language-select";
import { useAtom, useAtomValue } from "jotai";
import {
  aiTextResponseAtom,
  isReturningUserAtom,
  sessionIdAtom,
} from "@/atoms";
import clsx from "clsx";
import { storeResponse } from "@/constants/language";
import { useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { Loader2 } from "lucide-react";

export default function SpeakLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const onboarding = params.get("onboarding");
  const language = params.get("lang") ?? "es";
  const [sessionId, setSessionIdWithLanguage] = useAtom(sessionIdAtom);
  const [{ text }, setResponse] = useAtom(aiTextResponseAtom);
  const isReturningUser = useAtomValue(isReturningUserAtom);

  const isNewUser = !isReturningUser && onboarding;

  const createSession = async (language: string) => {
    const id = nanoid();
    await set("session", {
      sessionId: id,
      createdAt: new Date().toLocaleString(),
    });
    setSessionIdWithLanguage(`${id}-${language}`);
    // clear the previous response
    await del("previousResponse");
  };

  useEffect(() => {
    const retrieveSession = async () => {
      // get the settings
      // get the conversation session id
      const store = await getMany(["session"]);

      const [session] = store;
      // if session id is not present, create a new session id
      if (!session) {
        await createSession(language);
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
        await createSession(language);
        return;
      }

      // if session id is present and not expired, use the session id
      setSessionIdWithLanguage(`${id}-${language}`);
    };
    retrieveSession();
  }, []);

  const handleLanguageUpdate = async () => {
    // get the first 21 out of 24 characters of the session id
    // always adding a "-" and the language code to the end of the session id
    // TODO: improve this logic once the app gains more users
    if (!sessionId) {
      return;
    }
    const updatedSessionId = `${sessionId.slice(0, 21)}-${language}`;
    setSessionIdWithLanguage(updatedSessionId);
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
        handleAiGreetings(updatedSessionId);
      }
    }
  };
  // update session id when language changes
  useEffect(() => {
    handleLanguageUpdate();
  }, [language]);

  // function for ai to greet the user
  const handleAiGreetings = async (currentSessionId: string) => {
    try {
      const opeanAiChatRes = await fetch("/api/chatCompletion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "Greet yourself with your name!",
          sessionId: currentSessionId,
          language,
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
    if (isReturningUser && sessionId && !text) {
      handleAiGreetings(sessionId);
    }
  }, [sessionId, isReturningUser]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen zinc">
        <Loader2 className="h-14 w-14 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex justify-center h-screen app-container">
      <div className="flex flex-col p-5 sm:max-w-7xl w-full">
        <div
          className={clsx(
            "flex justify-between flex-row",
            isNewUser && "flex-row-reverse",
          )}
        >
          {(isReturningUser || onboarding) && <LanguageSelect />}
          <ThemeToggle />
        </div>

        {children}
      </div>
    </div>
  );
}
