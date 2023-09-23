"use client";

import ThemeToggle from "@/components/theme-toggle";
import React, { useEffect } from "react";
import { set, del, getMany, setMany } from "idb-keyval";
import { FormProvider, useForm } from "react-hook-form";
import LanguageSelect from "@/components/language-select";
import { nanoid } from "nanoid";
import RecordingButton from "@/components/recording-button";
import { useAtom, useSetAtom } from "jotai";
import {
  aiTextResponseAtom,
  isReturningUserAtom,
  // recordingAtom,
  sessionIdAtom,
  showAiResponseJoyRideAtom,
  showJoyRideAtom,
} from "@/atoms";
import AiResponseWord from "@/components/ai-response-word";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import GuidedTour from "@/components/guided-tour";
import AiResponseGuidedTour from "@/components/ai-response-guided-tour";
// import SuggestResponsePopover from "@/components/suggest-response-popover";

export default function Home() {
  const [sessionId, setSessionId] = useAtom(sessionIdAtom);
  const [{ text, words }, setResponse] = useAtom(aiTextResponseAtom);
  const [showJoyride, setShowJoyride] = useAtom(showJoyRideAtom);
  const setShowAiResponseJoyRide = useSetAtom(showAiResponseJoyRideAtom);
  const [isReturningUser, setIsReturningUser] = useAtom(isReturningUserAtom);
  // const { recording } = useAtomValue(recordingAtom);
  // const [showSuggestionButton, setShowSuggestionButton] = React.useState(false);
  const methods = useForm({
    defaultValues: {
      language: "es",
    },
  });

  const language = methods.watch("language");

  const createSession = async () => {
    const id = nanoid();

    await set("session", {
      sessionId: id,
      createdAt: new Date().toLocaleString(),
    });
    setSessionId(id);
    // clear the previous response
    await del("previousResponse");
  };

  useEffect(() => {
    const retrieveSession = async () => {
      // get the settings
      // get the conversation session id
      const [
        isReturningUser,
        settings,
        session,
        previousResponse,
        hasFinishedAiResponseJoyride,
      ] = await getMany([
        "isReturningUser",
        "settings",
        "session",
        "previousResponse",
        "hasFinishedAiResponseJoyride",
      ]);
      if (settings) {
        methods.setValue("language", settings.language);
      }
      // restore the last thing the ai said
      if (previousResponse) {
        setResponse({
          text: previousResponse,
          words: previousResponse.split(" "),
        });
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
      setSessionId(id);
    };
    retrieveSession();
  }, []);

  // function for ai to greet the user
  const handleAiGreetings = async () => {
    try {
      const opeanAiChatRes = await fetch("/api/chatCompletion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "Greet yourself with your name!",
          sessionId,
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
            words: prev.text.split(" "),
            text: newText,
          };
        });
        text += chunkValue;
      }
      await set("previousResponse", text);
      // save the response to db
      const res = await fetch("/api/storeNewChats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              session_id: sessionId,
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
    if (isReturningUser && !text) {
      handleAiGreetings();
    }
  }, [isReturningUser]);

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

  // useEffect(() => {
  //   if (recording) {
  //     setShowSuggestionButton(false);
  //   }
  // }, [recording]);

  // useEffect(() => {
  //   let timer: NodeJS.Timeout;
  //   if (text.length) {
  //     timer = setTimeout(() => {
  //       setShowSuggestionButton(true);
  //     }, 5000);
  //   }
  //   return () => clearTimeout(timer);
  // }, [text]);

  // if no session id or no text, show loading
  if (!sessionId || (!text.length && isReturningUser)) {
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
            !isReturningUser && !showJoyride && "flex-row-reverse",
          )}
        >
          {(isReturningUser || showJoyride) && (
            <FormProvider {...methods}>
              <LanguageSelect />
            </FormProvider>
          )}
          <ThemeToggle />
        </div>
        {!isReturningUser && !showJoyride ? (
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
            <div className="w-full flex flex-col text-center justify-center items-center h-full gap-10">
              <div className="max-h-[50%] overflow-y-auto">
                {language === "es" && words.length > 0 ? (
                  words.map((word, index) => (
                    <span key={index} className={`word-${index}`}>
                      <AiResponseWord word={word} context={text} />
                    </span>
                  ))
                ) : (
                  <>{text}</>
                )}
              </div>
              <div className="flex flex-col gap-3 w-full items-center">
                <RecordingButton language={language} />
                {/* {(showSuggestionButton || showJoyride) && (
                  <SuggestResponsePopover context={text} />
                )} */}
              </div>
            </div>
            {!isReturningUser && <GuidedTour />}
            {!!words.length && <AiResponseGuidedTour />}
          </>
        )}
      </div>
    </div>
  );
}
