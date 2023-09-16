"use client";

import ThemeToggle from "@/components/theme-toggle";
import { useEffect } from "react";
import { set, get, del, getMany, setMany } from "idb-keyval";
import { FormProvider, useForm } from "react-hook-form";
import LanguageSelect from "@/components/language-select";
import { nanoid } from "nanoid";
import RecordingButton from "@/components/recording-button";
import { useAtom, useSetAtom } from "jotai";
import {
  aiTextResponseAtom,
  isReturningUserAtom,
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

export default function Home() {
  const [sessionId, setSessionId] = useAtom(sessionIdAtom);
  const [{ text, words }, setResponse] = useAtom(aiTextResponseAtom);
  const [showJoyride, setShowJoyride] = useAtom(showJoyRideAtom);
  const setShowAiResponseJoyRide = useSetAtom(showAiResponseJoyRideAtom);
  const [isReturningUser, setIsReturningUser] = useAtom(isReturningUserAtom);
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
      const [isReturningUser, settings, session, previousResponse] =
        await getMany([
          "isReturningUser",
          "settings",
          "session",
          "previousResponse",
        ]);
      const hasFinishedAiResponseJoyride = await get(
        "hasFinishedAiResponseJoyride",
      );
      setIsReturningUser(!!isReturningUser);
      setShowAiResponseJoyRide(!hasFinishedAiResponseJoyride);
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

  const handleShowJoyride = () => {
    setShowJoyride(true);
    setShowAiResponseJoyRide(true);
  };

  const handleSkipTutorial = async () => {
    await setMany([
      ["isReturningUser", true],
      ["hasFinishedAiResponseJoyride", true],
    ]);
    setShowJoyride(false);
    setShowAiResponseJoyRide(false);
  };

  if (!sessionId) {
    return (
      <div className="flex justify-center h-screen items-center zinc">
        <Loader2 className="h-14 w-14 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex justify-center h-screen">
      <div className="flex flex-col gap-5 p-5 sm:max-w-7xl w-full">
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
            <div className="w-full flex flex-col text-center justify-center items-center h-full gap-20">
              <div className="w-full max-h-[50%] overflow-y-auto">
                {language === "es" &&
                  words.map((word, index) => (
                    <span key={index} className={`word-${index}`}>
                      <AiResponseWord word={word} context={text} />
                    </span>
                  ))}
              </div>
              <RecordingButton language={language} />
            </div>
            <GuidedTour />
            {!!words.length && <AiResponseGuidedTour />}
          </>
        )}
      </div>
    </div>
  );
}
