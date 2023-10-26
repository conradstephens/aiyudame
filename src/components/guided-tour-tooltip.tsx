import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// import { X } from "lucide-react";
import { block } from "million/react";
import { useMemo } from "react";
import { TooltipRenderProps } from "react-joyride";
import { Progress } from "./ui/progress";

const Tooltip = block(
  function Tooltip(props: TooltipRenderProps) {
    const {
      continuous,
      index,
      step,
      backProps,
      // closeProps,
      primaryProps,
      tooltipProps,
      size,
      skipProps,
      isLastStep,
    } = props;

    // Calculate progress
    const progress = useMemo(
      () => Math.round(((index + 1) / size) * 100),
      [index, size],
    );

    return (
      <Card {...tooltipProps} className="max-w-[350px]">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            {index > 0 && (
              <div className="flex flex-col w-full text-center gap-1">
                <Progress className="h-1" value={progress} />
                <p className="text-xs">{progress}%</p>
              </div>
            )}
            {/* <Button {...closeProps} id="close" variant="outline" size="icon">
          <X className="h-4 w-4" />
        </Button> */}
          </div>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription className="whitespace-pre-line">
            {step.content}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-row justify-end gap-2">
          {index === 0 && (
            <Button {...skipProps} variant="ghost" id="skip">
              Skip
            </Button>
          )}
          {index > 0 && (
            <Button variant="ghost" {...backProps}>
              Back
            </Button>
          )}
          {continuous && !isLastStep && (
            <Button {...primaryProps} id="next">
              Next
            </Button>
          )}
          {isLastStep && (
            <Button {...primaryProps} id="finish">
              Finish
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  },
  { ssr: false },
);

export default Tooltip;
