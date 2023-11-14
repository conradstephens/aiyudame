"use client";

import { aiTextResponseAtom, isReturningUserAtom } from "@/atoms";
import AiResponseGuidedTour from "@/components/ai-response-guided-tour";
import AiResponseWord from "@/components/ai-response-word";
import GuidedTour from "@/components/guided-tour";
import RecordingButton from "@/components/recording-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { scenarioPrompts, scenarioTitle } from "@/constants/prompts";
import { useAtomValue } from "jotai";

interface ComponentProps {
  language: string;
  scenario: string;
}

export default function HomeScreen(props: ComponentProps) {
  const { language, scenario } = props;
  const { text: aiResponseText, words: aiResponseWords } =
    useAtomValue(aiTextResponseAtom);
  const isReturningUser = useAtomValue(isReturningUserAtom);

  const title = scenarioTitle[scenario];
  const prompt = scenarioPrompts[scenario];

  return (
    <>
      <div className="w-full flex flex-col justify-center items-center h-full gap-16">
        <div className="flex flex-col gap-5 items-center w-full">
          <h1 className="text-xl text-center font-bold tracking-tighter xl:text-3xl bg-clip-text text-transparent bg-gradient-to-r dark:from-white dark:to-gray-500 from-black to-gray-500">
            {title}
          </h1>
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
              <div className="flex flex-col gap-2">
                <Skeleton className="w-full h-7" />
                <Skeleton className="w-full h-7" />
                <Skeleton className="w-full h-7" />
              </div>
            )}
          </ScrollArea>
        </div>

        <RecordingButton language={language} prompt={prompt} />
      </div>
      {!isReturningUser && <GuidedTour />}
      {!!aiResponseWords.length && <AiResponseGuidedTour />}
    </>
  );
}
