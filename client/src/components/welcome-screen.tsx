"use client";

import {
  isReturningUserAtom,
  showAiResponseJoyRideAtom,
  showJoyRideAtom,
} from "@/atoms";
import { Button } from "@/components/ui/button";
import { setMany } from "idb-keyval";
import { useSetAtom } from "jotai";

export default function Welcome() {
  const setShowJoyride = useSetAtom(showJoyRideAtom);
  const setShowAiResponseJoyRide = useSetAtom(showAiResponseJoyRideAtom);
  const setIsReturningUser = useSetAtom(isReturningUserAtom);

  const handleShowJoyride = () => {
    setShowJoyride(true);
    setShowAiResponseJoyRide(true);
  };

  const handleSkipTutorial = async () => {
    await setMany([
      ["isReturningUser", true],
      ["hasFinishedAiResponseJoyride", true],
    ]);
    setIsReturningUser(true);
    setShowJoyride(false);
    setShowAiResponseJoyRide(false);
  };

  return (
    <div className="flex flex-col items-center gap-10 justify-center h-full text-center">
      <div className="flex flex-col gap-5">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r dark:from-white dark:to-gray-500 from-black to-gray-500">
          Welcome to AIyudame!
        </h1>
        <p className="max-w-[600px] md:text-xl mx-auto">
          Practice your conversational Spanish with an AI companion.
        </p>
      </div>
      <div className="flex gap-2 bg-zinc">
        <Button onClick={handleShowJoyride}>Get started!</Button>
        <Button onClick={handleSkipTutorial} variant="ghost">
          Skip tutorial
        </Button>
      </div>
    </div>
  );
}
