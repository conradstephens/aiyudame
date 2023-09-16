import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
// import { X } from "lucide-react";
import { TooltipRenderProps } from "react-joyride";
import { Progress } from "./ui/progress";
import { useMemo } from "react";

export default function Tooltip(props: TooltipRenderProps) {
  const {
    continuous,
    index,
    step,
    backProps,
    // closeProps,
    primaryProps,
    tooltipProps,
    size,
    isLastStep,
  } = props;

  // Calculate progress
  const progress = useMemo(
    () => Math.round(((index + 1) / size) * 100),
    [index, size],
  );

  return (
    <Card {...tooltipProps} className="max-w-[350px]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex flex-col w-full text-center gap-1">
          <Progress className="h-1" value={progress} />
          <p className="text-xs">{progress}%</p>
        </div>
        {/* <Button {...closeProps} id="close" variant="outline" size="icon">
          <X className="h-4 w-4" />
        </Button> */}
      </CardHeader>
      <CardContent>{step.content}</CardContent>
      <CardFooter className="flex flex-row justify-end gap-2">
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
}
