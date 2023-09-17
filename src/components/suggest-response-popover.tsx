"use client";

// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";

import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import clsx from "clsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import React from "react";

interface ComponentProps {
  context: string;
}

export default function SuggestResponsePopover(props: ComponentProps) {
  const { context } = props;
  const [suggestion, setSuggestion] = useState("");
  const { toast } = useToast();
  const [openSheet, setOpenSheet] = useState(false);

  // create media query to detect if the user is on a mobile device
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    setIsMobile(mediaQuery.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    mediaQuery.addEventListener("change", onChange);

    return () => {
      mediaQuery.removeEventListener("change", onChange);
    };
  }, []);

  const handleOpenSheet = () => {
    setOpenSheet(true);
  };

  const onOpenSheetChange = (open: boolean) => {
    setOpenSheet(open);
  };

  const hasSuggestion = !!suggestion.length;

  const getSuggestion = async () => {
    try {
      handleOpenSheet();
      if (suggestion.length) {
        return;
      }
      const response = await fetch("api/suggestResponse", {
        method: "POST",
        body: JSON.stringify({ context }),
      });

      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error);
      }

      const data = response.body;

      if (!data) {
        throw new Error("Error generating suggestion");
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

        setSuggestion((prev) => prev + chunkValue);
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
    setSuggestion("");
  }, [context]);

  const ComponentButton = React.forwardRef(function ComponentButton(
    props: React.ComponentPropsWithoutRef<"button">,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) {
    const { className, ...other } = props;
    return (
      <Button
        {...other}
        ref={ref}
        variant="ghost"
        className={clsx(
          "animate-pulse w-56 italic text-xs",
          suggestion.length && "animate-none",
          className,
        )}
      >
        Suggest response
      </Button>
    );
  });

  const ComponentSkeletons = () => (
    <>
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-full h-4" />
    </>
  );

  return (
    <>
      {/* <Popover>
        <PopoverTrigger asChild onClick={getSuggestion}>
          <ComponentButton className="sm:inline-block hidden" />
        </PopoverTrigger>
        <PopoverContent className="sm:flex hidden flex-col gap-1">
          {hasSuggestion ? suggestion : <ComponentSkeletons />}
        </PopoverContent>
      </Popover> */}
      <Sheet open={openSheet} onOpenChange={onOpenSheetChange}>
        <ComponentButton onClick={getSuggestion} />
        <SheetContent side={isMobile ? "bottom" : "right"}>
          <SheetHeader>
            <SheetTitle>Suggestion</SheetTitle>
            <div className="flex flex-col gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              {hasSuggestion ? suggestion : <ComponentSkeletons />}
            </div>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  );
}
