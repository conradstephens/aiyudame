"use client";

import {
  aiTextResponseAtom,
  isReturningUserAtom,
  showJoyRideAtom,
} from "@/atoms";
import { getMany } from "idb-keyval";
import { useSetAtom } from "jotai";
import React from "react";
import { useEffect } from "react";

export default function Reroute({ children }: { children: React.ReactNode }) {
  const setIsReturningUser = useSetAtom(isReturningUserAtom);
  const setShowAiResponseJoyRide = useSetAtom(showJoyRideAtom);
  const setResponse = useSetAtom(aiTextResponseAtom);

  useEffect(() => {
    const checkIfReturningUser = async () => {
      // get the settings
      // get the conversation session id
      const store = await getMany([
        "isReturningUser",
        "settings",
        "previousResponses",
        "hasFinishedAiResponseJoyride",
      ]);

      const [
        isReturningUser,
        settings,
        previousResponses,
        hasFinishedAiResponseJoyride,
      ] = store;
      // if the user is not returning and has not finished the ai response joyride, add the onboarding query param
      const isReturning = !!isReturningUser;
      const previousUsedLanguage = settings?.language ?? "es";
      // restore the last thing the ai said
      const responses: { language: string; response: string }[] =
        previousResponses ?? [
          { language: "es", response: "" },
          { language: "it", response: "" },
          { language: "en", response: "" },
        ];
      const previousResponse = responses.find(
        ({ language }) => language === previousUsedLanguage,
      )?.response;

      if (previousResponse) {
        setResponse({
          text: previousResponse,
          words: previousResponse.split(" "),
        });
      }

      setIsReturningUser(isReturning);
      setShowAiResponseJoyRide(!hasFinishedAiResponseJoyride);
    };
    checkIfReturningUser();
  }, []);

  return <>{children}</>;
}
