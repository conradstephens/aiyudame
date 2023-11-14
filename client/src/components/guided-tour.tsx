import { isReturningUserAtom, showJoyRideAtom } from "@/atoms";
import Tooltip from "@/components/guided-tour-tooltip";
import { darkStyles, lightStyles } from "@/constants/guided-tour";
import { set } from "idb-keyval";
import { useAtom, useSetAtom } from "jotai";
import { useTheme } from "next-themes";
import Joyride, { CallBackProps, Step } from "react-joyride";

export default function GuidedTour() {
  const [run, setRun] = useAtom(showJoyRideAtom);
  const setIsReturningUser = useSetAtom(isReturningUserAtom);
  const { resolvedTheme: theme } = useTheme();

  const steps: Step[] = [
    {
      target: ".app-container",
      title: "Welcome to AIyudame!",
      content: "Let's get started with a quick tour! 🚀",
      placement: "center",
      disableBeacon: true,
      showSkipButton: true,
    },
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
    // {
    //   target: ".language-select",
    //   content:
    //     "Selecting English will allow the AI to act as a regular chat bot. ",
    //   disableBeacon: true,
    //   showSkipButton: false,
    // },
    {
      target: ".scenario-select",
      content: "Select the scenario you want the AI to act in.",
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
      target: ".suggest-response-button",
      content: "Click this button to suggest a response to the AI.",
      disableBeacon: true,
      showSkipButton: false,
    },
    {
      target: ".recording-button",
      content:
        "Be creative when talking to the AI! Ask it questions, tell it a story, or just say hello.\n\n Have fun! 😃",
      disableBeacon: true,
      showSkipButton: false,
    },
  ];

  const callback = async ({ status }: CallBackProps) => {
    if (status === "finished" || status === "skipped") {
      await set("isReturningUser", true);
      setRun(false);
      setIsReturningUser(true);
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
        last: "Finish",
      }}
      callback={callback}
      tooltipComponent={Tooltip}
    />
  );
}
