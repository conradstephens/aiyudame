"use client";

import { isReturningUserAtom, showJoyRideAtom } from "@/atoms";
import LanguageSelect from "@/components/language-select";
import ThemeToggle from "@/components/theme-toggle";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { block } from "million/react";
import { FormProvider, useForm } from "react-hook-form";

const Toolbar = block(
  function Toolbar() {
    const showJoyride = useAtomValue(showJoyRideAtom);
    const isReturningUser = useAtomValue(isReturningUserAtom);

    const isNewUser = !isReturningUser && !showJoyride;

    const methods = useForm({
      defaultValues: {
        language: "es",
      },
    });

    return (
      <div
        className={clsx(
          "flex justify-between flex-row",
          isNewUser && "flex-row-reverse",
        )}
      >
        {(isReturningUser || showJoyride) && (
          <FormProvider {...methods}>
            <LanguageSelect />
          </FormProvider>
        )}
        <ThemeToggle />
      </div>
    );
  },
  { ssr: false },
);

export default Toolbar;
