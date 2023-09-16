import { showAiResponseJoyRideAtom } from "@/atoms";
import { set } from "idb-keyval";
import { useAtom } from "jotai";
import { useTheme } from "next-themes";
import Joyride, { Step, Styles } from "react-joyride";

export default function AiResponseGuidedTour() {
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

  const lightStyles: Styles = {
    options: {
      backgroundColor: "#FFF",
      arrowColor: "#FFF",
      primaryColor: "rgb(9, 9, 11)",
      textColor: "rgb(9, 9, 11)",
      zIndex: 1000,
    },
    tooltip: {
      borderWidth: "1px",
      borderColor: "rgb(228 228 231)",
    },
    buttonNext: {
      color: "#FFF",
    },
    buttonClose: {
      color: "#FFF",
    },
  };

  const darkStyles: Styles = {
    options: {
      backgroundColor: "rgb(9, 9, 11)",
      arrowColor: "rgb(9, 9, 11)",
      primaryColor: "#FFF",
      textColor: "#FFF",
      zIndex: 1000,
    },
    tooltip: {
      borderWidth: "1px",
      borderColor: "rgb(39 39 42)",
    },
    buttonNext: {
      color: "rgb(9, 9, 11)",
    },
    buttonClose: {
      color: "rgb(9, 9, 11)",
    },
  };

  return (
    <Joyride
      run={run}
      steps={steps}
      styles={theme === "dark" ? darkStyles : lightStyles}
      continuous
      showProgress
      showSkipButton
      locale={{
        last: "Finish",
      }}
      callback={async ({ status }) => {
        if (status === "finished") {
          await set("hasFinishedAiResponseJoyride", true);
          setRun(false);
        }
      }}
    />
  );
}
