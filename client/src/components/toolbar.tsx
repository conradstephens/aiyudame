"use client";

import { isReturningUserAtom, showJoyRideAtom } from "@/atoms";
import LanguageSelect from "@/components/language-select";
import ScenarioSelect from "@/components/scenario-select";
import ThemeToggle from "@/components/theme-toggle";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { FormProvider, UseFormReturn } from "react-hook-form";

interface ComponentProps {
  methods: UseFormReturn<
    {
      language: string;
      scenario: string;
    },
    any,
    undefined
  >;
}

export default function Toolbar(props: ComponentProps) {
  const { methods } = props;
  const showJoyride = useAtomValue(showJoyRideAtom);
  const isReturningUser = useAtomValue(isReturningUserAtom);

  const isNewUser = !isReturningUser && !showJoyride;

  return (
    <div
      className={clsx(
        "flex justify-between flex-row items-center",
        isNewUser && "flex-row-reverse",
      )}
    >
      {(isReturningUser || showJoyride) && (
        <div className="flex gap-2">
          <FormProvider {...methods}>
            <LanguageSelect />
            <ScenarioSelect />
          </FormProvider>
        </div>
      )}
      <ThemeToggle />
    </div>
  );
}
