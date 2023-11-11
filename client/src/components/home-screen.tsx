"use client";

import { aiTextResponseAtom, isReturningUserAtom } from "@/atoms";
import AiResponseGuidedTour from "@/components/ai-response-guided-tour";
import AiResponseWord from "@/components/ai-response-word";
import GuidedTour from "@/components/guided-tour";
import RecordingButton from "@/components/recording-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAtomValue } from "jotai";

interface ComponentProps {
  language: string;
}

export default function HomeScreen(props: ComponentProps) {
  const { language } = props;
  const { text: aiResponseText, words: aiResponseWords } =
    useAtomValue(aiTextResponseAtom);
  const isReturningUser = useAtomValue(isReturningUserAtom);

  return (
    <>
      <div className="w-full flex flex-col justify-center items-center h-full gap-16">
        <ScrollArea className="h-72 md:h-96">
          {aiResponseWords.length > 0 ? (
            aiResponseWords.map((word, index) => (
              <span key={index} className={`word-${index}`}>
                <AiResponseWord
                  word={word}
                  context={aiResponseText}
                  language={language}
                />
              </span>
            ))
          ) : (
            <>
              <Skeleton className="w-96 h-10" />
            </>
          )}
        </ScrollArea>

        <RecordingButton language={language} />
      </div>
      {!isReturningUser && <GuidedTour />}
      {!!aiResponseWords.length && <AiResponseGuidedTour />}
    </>
  );
}
