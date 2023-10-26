import { showAiResponseJoyRideAtom } from "@/atoms";
import Tooltip from "@/components/guided-tour-tooltip";
import { darkStyles, lightStyles } from "@/constants/guided-tour";
import { set } from "idb-keyval";
import { useAtom } from "jotai";
import { block } from "million/react";
import { useTheme } from "next-themes";
import Joyride, { CallBackProps, Step } from "react-joyride";

const AiResponseGuidedTour = block(
  function AiResponseGuidedTour() {
    const [run, setRun] = useAtom(showAiResponseJoyRideAtom);
    const { resolvedTheme: theme } = useTheme();

    const steps: Step[] = [
      {
        target: ".word-0",
        content: "Click on a word and the AI will explain it to you.",
        disableBeacon: true,
        showSkipButton: false,
      },
    ];

    const callback = async ({ status }: CallBackProps) => {
      if (status === "finished") {
        await set("hasFinishedAiResponseJoyride", true);
        setRun(false);
      }
    };

    return (
      <Joyride
        run={run}
        steps={steps}
        styles={theme === "dark" ? darkStyles : lightStyles}
        continuous
        showProgress
        locale={{
          last: "Close",
        }}
        callback={callback}
        tooltipComponent={Tooltip}
      />
    );
  },
  { ssr: false },
);

export default AiResponseGuidedTour;
