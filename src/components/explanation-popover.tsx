"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface ComponentProps {
  label: string;
  context: string;
}

export default function ExplanationPopover(props: ComponentProps) {
  const { label, context } = props;

  const [explanation, setExplanation] = useState<string | null>(null);

  const getExplanation = async () => {
    try {
      // if explanation is already present, do not fetch again
      if (explanation) {
        return;
      }
      const response = await fetch("api/explainWord", {
        method: "POST",
        body: JSON.stringify({ word: label, context }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setExplanation(data.explanation);
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="link"
          className="p-1 text-2xl"
          onClick={getExplanation}
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        {explanation?.replace("Explanation: ", "") ?? (
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
