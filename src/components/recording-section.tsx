"use client";

import { aiTextResponseAtom, isReturningUserAtom } from "@/atoms";
import AiResponseGuidedTour from "@/components/ai-response-guided-tour";
import AiResponseWord from "@/components/ai-response-word";
import GuidedTour from "@/components/guided-tour";
import RecordingButton from "@/components/recording-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAtomValue } from "jotai";
import { block } from "million/react";

const RecordingSection = block(
  function RecordingSection() {
    const { text, words } = useAtomValue(aiTextResponseAtom);
    const isReturningUser = useAtomValue(isReturningUserAtom);

    return (
      // show the main screen
      <>
        <div className="w-full flex flex-col justify-center items-center h-full gap-16">
          <ScrollArea className="h-72 md:h-96">
            {words.length > 0 ? (
              words.map((word, index) => (
                <span key={index} className={`word-${index}`}>
                  <AiResponseWord word={word} context={text} />
                </span>
              ))
            ) : (
              <>
                <Skeleton className="w-96 h-10" />
              </>
            )}
          </ScrollArea>

          <RecordingButton />
        </div>
        {!isReturningUser && <GuidedTour />}
        {!!words.length && <AiResponseGuidedTour />}
      </>
    );
  },
  { ssr: false },
);

export default RecordingSection;
