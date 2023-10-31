"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Skeleton } from "@/components/ui/skeleton";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useToast } from "./ui/use-toast";

interface ComponentProps {
  word: string;
  context: string;
  language: string;
}

export default function AiResponseWord(props: ComponentProps) {
  const { word, context, language } = props;
  const [explanation, setExplanation] = useState("");
  const { toast } = useToast();

  const hasExplanation = !!explanation.length;

  const getExplanation = async () => {
    try {
      // if explanation is already present or the language is in english, do not fetch
      if (explanation || !isNotEnglish) {
        return;
      }
      const response = await fetch("api/explainWord", {
        method: "POST",
        body: JSON.stringify({ word, context, language }),
      });

      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error);
      }

      const data = response.body;

      if (!data) {
        throw new Error("Error generating explanation");
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { done: doneStreaming, value } = await reader.read(); // read stream data
        done = doneStreaming;

        if (done) {
          break;
        }
        const chunkValue = decoder.decode(value);

        setExplanation((prev) => prev + chunkValue);
      }
    } catch (error: any) {
      console.error(error);
      toast({
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // reset explanation when context changes
  useEffect(() => {
    setExplanation("");
  }, [context]);

  const isNotEnglish = language !== "en";

  return (
    <Popover>
      <PopoverTrigger
        disabled={!isNotEnglish}
        className={clsx(
          "text-zinc-900 dark:text-zinc-50 p-1 text-xl inline-block",
          isNotEnglish && "underline-offset-4 hover:underline",
        )}
        onClick={getExplanation}
      >
        {word}
      </PopoverTrigger>
      <PopoverContent>
        {hasExplanation ? (
          explanation?.replace("Explanation: ", "")
        ) : (
          <div className="flex flex-col gap-2">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
