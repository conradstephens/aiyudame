import { isReturningUserAtom, showJoyRideAtom } from "@/atoms";
import { set } from "idb-keyval";
import { useAtom, useSetAtom } from "jotai";
import { useTheme } from "next-themes";
import Joyride, { Step, Styles } from "react-joyride";

export default function GuidedTour() {
  const [run, setRun] = useAtom(showJoyRideAtom);
  const setIsReturningUser = useSetAtom(isReturningUserAtom);
  const { resolvedTheme: theme } = useTheme();

  const steps: Step[] = [
    {
      target: ".language-select",
      content: "You can select the language you want the AI to speak in.",
      disableBeacon: true,
      showSkipButton: false,
    },
    {
      target: ".language-select",
      content:
        "Selecting Spanish will instruct the AI to help you with your Spanish.",
      disableBeacon: true,
      showSkipButton: false,
    },
    {
      target: ".language-select",
      content:
        "Selecting English will allow the AI to act as a regular chat bot. ",
      disableBeacon: true,
      showSkipButton: false,
    },
    {
      target: ".recording-button",
      content: "Click the record button to start recording your voice.",
      disableBeacon: true,
      showSkipButton: false,
    },
    {
      target: ".recording-button",
      content:
        "When you are finished recording, click the button again to stop recording your voice. Once you stop recording, the AI will respond to you.",
      disableBeacon: true,
      showSkipButton: false,
    },
    {
      target: ".recording-button",
      content:
        "Talk to the AI as if you were talking to a friend. The AI will respond to you in the language you selected.",
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
          await set("isReturningUser", true);
          await set("hasFinishedJoyride", true);
          setRun(false);
          setIsReturningUser(true);
        }
      }}
    />
  );
}
