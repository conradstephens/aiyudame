"use client";

import ThemeToggle from "@/components/theme-toggle";
import { useEffect } from "react";
import { set, get, del } from "idb-keyval";
import { FormProvider, useForm } from "react-hook-form";
import LanguageSelect from "@/components/language-select";
import { nanoid } from "nanoid";
import RecordingButton from "@/components/recording-button";
import { useAtom } from "jotai";
import { aiTextResponseAtom, sessionIdAtom } from "@/atoms";
import AiResponseWord from "@/components/ai-response-word";

export default function Home() {
  const [sessionId, setSessionId] = useAtom(sessionIdAtom);
  const [{ text, words }, setResponse] = useAtom(aiTextResponseAtom);

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
      const settings = await get("settings");
      if (settings) {
        methods.setValue("language", settings.language);
      }
      // get the conversation session id
      const session = await get("session");
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
      // restore the last thing the ai said
      const previousResponse = await get("previousResponse");
      if (previousResponse) {
        setResponse({
          text: previousResponse,
          words: previousResponse.split(" "),
        });
      }
    };
    retrieveSession();
  }, []);

  return (
    <div className="flex justify-center h-screen">
      <div className="flex flex-col gap-5 p-5 sm:max-w-7xl w-full">
        <div className="flex justify-between">
          <FormProvider {...methods}>
            <LanguageSelect />
          </FormProvider>
          <ThemeToggle />
        </div>
        <div className="w-full flex flex-col text-center justify-center items-center h-full gap-20">
          <div className="w-full max-h-[50%] overflow-y-auto">
            {language === "es" &&
              words.map((word, index) => (
                <AiResponseWord key={index} word={word} context={text} />
              ))}
          </div>
          <RecordingButton sessionId={sessionId} language={language} />
        </div>
      </div>
    </div>
  );
}
