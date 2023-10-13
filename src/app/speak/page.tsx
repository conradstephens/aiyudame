"use client";

import React from "react";
import RecordingButton from "@/components/recording-button";
import { useAtomValue } from "jotai";
import { aiTextResponseAtom, isReturningUserAtom } from "@/atoms";
import AiResponseWord from "@/components/ai-response-word";
import GuidedTour from "@/components/guided-tour";
import AiResponseGuidedTour from "@/components/ai-response-guided-tour";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "next/navigation";

export default function Speak() {
  const params = useSearchParams();

  const language = params.get("lang") ?? "es";

  const { text, words } = useAtomValue(aiTextResponseAtom);
  const isReturningUser = useAtomValue(isReturningUserAtom);

  return (
    // show the main screen
    <>
      <div className="w-full flex flex-col text-center justify-center items-center h-screen gap-10">
        <div className="max-h-[50%] overflow-y-auto">
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
        <div className="flex flex-col gap-3 w-full items-center">
          <RecordingButton language={language} />
        </div>
      </div>
      {!isReturningUser && <GuidedTour />}
      {!!words.length && <AiResponseGuidedTour />}
    </>
  );
}
