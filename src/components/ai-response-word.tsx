"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useToast } from "./ui/use-toast";

interface ComponentProps {
  word: string;
  context: string;
}

export default function AiResponseWord(props: ComponentProps) {
  const { word, context } = props;
  const [explanation, setExplanation] = useState("");
  const { toast } = useToast();

  const hasExplanation = !!explanation.length;

  const getExplanation = async () => {
    try {
      // if explanation is already present, do not fetch
      if (explanation) {
        return;
      }
      const response = await fetch("api/explainWord", {
        method: "POST",
        body: JSON.stringify({ word, context }),
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

  return (
    <Popover>
      <PopoverTrigger
        className="text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50 p-1 text-2xl"
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
