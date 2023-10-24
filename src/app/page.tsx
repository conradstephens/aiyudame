"use client";

import {
  aiTextResponseAtom,
  isReturningUserAtom,
  sessionIdAtom,
  showAiResponseJoyRideAtom,
  showJoyRideAtom,
} from "@/atoms";
import AiResponseGuidedTour from "@/components/ai-response-guided-tour";
import AiResponseWord from "@/components/ai-response-word";
import GuidedTour from "@/components/guided-tour";
import LanguageSelect from "@/components/language-select";
import RecordingButton from "@/components/recording-button";
import ThemeToggle from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { storeResponse } from "@/constants/language";
import clsx from "clsx";
import { del, get, getMany, set, setMany } from "idb-keyval";
import { useAtom, useSetAtom } from "jotai";
import { Loader2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

export default function Home() {
  const [sessionId, setSessionId] = useAtom(sessionIdAtom);
  const [{ text, words }, setResponse] = useAtom(aiTextResponseAtom);
  const [showJoyride, setShowJoyride] = useAtom(showJoyRideAtom);
  const setShowAiResponseJoyRide = useSetAtom(showAiResponseJoyRideAtom);
  const [isReturningUser, setIsReturningUser] = useAtom(isReturningUserAtom);

  const isNewUser = !isReturningUser && !showJoyride;

  const methods = useForm({
    defaultValues: {
      language: "es",
    },
  });

  const language = methods.watch("language");
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
    setSessionId(`${id}-${language}`);
    // clear the previous response
    await del("previousResponse");
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
      methods.setValue("language", previousUsedLanguage);
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
      // if session id is present and not expired, use the session id
      setSessionId(`${id}-${previousUsedLanguage}`);
    };
    retrieveSession();
  }, []);

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

  const handleShowJoyride = () => {
    setShowJoyride(true);
    setShowAiResponseJoyRide(true);
  };

  const handleSkipTutorial = async () => {
    await setMany([
      ["isReturningUser", true],
      ["hasFinishedAiResponseJoyride", true],
    ]);
    setIsReturningUser(true);
    setShowJoyride(false);
    setShowAiResponseJoyRide(false);
  };

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
        <div
          className={clsx(
            "flex justify-between flex-row",
            isNewUser && "flex-row-reverse",
          )}
        >
          {(isReturningUser || showJoyride) && (
            <FormProvider {...methods}>
              <LanguageSelect />
            </FormProvider>
          )}
          <ThemeToggle />
        </div>
        {isNewUser ? (
          // show welcome screen
          <div className="flex flex-col items-center gap-10 justify-center h-full text-center">
            <div className="flex flex-col gap-5">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r dark:from-white dark:to-gray-500 from-black to-gray-500">
                Welcome to AIyudame!
              </h1>
              <p className="max-w-[600px] md:text-xl mx-auto">
                Practice your conversational Spanish with an AI companion.
              </p>
            </div>
            <div className="flex gap-2 bg-zinc">
              <Button onClick={handleShowJoyride}>Get started!</Button>
              <Button onClick={handleSkipTutorial} variant="ghost">
                Skip tutorial
              </Button>
            </div>
          </div>
        ) : (
          // show the main screen
          <>
            <div className="w-full flex flex-col text-center justify-center items-center h-full gap-16">
              <div className="h-72 md:h-96 overflow-y-auto">
                {words.length > 0 ? (
                  words.map((word, index) => (
                    <span key={index} className={`word-${index}`}>
                      <AiResponseWord
                        word={word}
                        context={text}
                        language={language}
                      />
                    </span>
                  ))
                ) : (
                  <>
                    <Skeleton className="w-96 h-10" />
                  </>
                )}
              </div>

              <RecordingButton language={language} />
            </div>
            {!isReturningUser && <GuidedTour />}
            {!!words.length && <AiResponseGuidedTour />}
          </>
        )}
      </div>
    </div>
  );
}
