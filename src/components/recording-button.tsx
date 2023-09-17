"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { LazyMotion, ResolvedValues, domAnimation, m } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  aiTextResponseAtom,
  recordingAtom,
  sessionIdAtom,
  showJoyRideAtom,
} from "@/atoms";
import { set } from "idb-keyval";
import { Button } from "./ui/button";

interface ComponentProps {
  language: string;
}

export default function RecordingButton(props: ComponentProps) {
  const { language } = props;
  const sessionId = useAtomValue(sessionIdAtom);
  const showJoyride = useAtomValue(showJoyRideAtom);
  const [playingResponse, setPlayingResponse] = useState(false);
  const [{ recording, recordingText, shouldUpdateText }, setRecordingState] =
    useAtom(recordingAtom);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const setAiTextResponse = useSetAtom(aiTextResponseAtom);

  const startLoading = () => {
    setLoading(true);
  };

  const stopLoading = () => {
    setPlayingResponse(false);
    setLoading(false);
  };

  // This useEffect hook sets up the media recorder when the component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && sessionId && !showJoyride) {
      console.log("setting up media recorder");
      let chunks: Blob[] = [];
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const newMediaRecorder = new MediaRecorder(stream);
          newMediaRecorder.onstart = () => {
            chunks = [];
          };
          newMediaRecorder.ondataavailable = (e) => {
            chunks.push(e.data);
          };

          newMediaRecorder.onstop = async () => {
            const audioBlob = new Blob(chunks, { type: "audio/webm" });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.onerror = function (err) {
              console.error("Error playing audio:", err);
              stopLoading();
            };
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async function () {
              try {
                if (typeof reader.result !== "string") {
                  stopLoading();
                  throw new Error("Unexpected result type");
                }
                // transcribe audio and begin conversation with openai
                const base64Audio = reader.result.split(",")[1]; // Remove the data URL prefix
                const response = await fetch("/api/speechToText", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    audio: base64Audio,
                    sessionId,
                    language,
                  }),
                });

                const data = await response.json();
                if (!response.ok) {
                  stopLoading();
                  throw new Error(data.error);
                }
                const text: string = data.openaiResponse;

                const audioContext = new AudioContext();
                const audioElement = new Audio();
                audioElement.controls = true;

                URL.revokeObjectURL(audioElement.src);

                let modelId = "eleven_monolingual_v1";
                let voiceId = "7arsGG6R4puBzDqYy6xu";

                if (language === "es") {
                  modelId = "eleven_multilingual_v2";
                  voiceId = "N4Jse6hDfsD4Iqv16pxy";
                }
                // generate audio from openai response
                const elevenLabsRes = await fetch(
                  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
                  {
                    method: "POST",
                    headers: {
                      accept: "audio/mpeg",
                      "Content-Type": "application/json",
                      "xi-api-key": process.env
                        .NEXT_PUBLIC_ELEVENLABS_API_KEY as string,
                    },
                    body: JSON.stringify({
                      text,
                      model_id: modelId,
                    }),
                  },
                );

                const elevenlabsBody = elevenLabsRes.body;

                if (!elevenLabsRes.ok || !elevenlabsBody) {
                  const error = await elevenLabsRes.json();
                  console.error("Error generating audio:", error);
                  throw new Error("Error generating audio");
                }

                // stream the response
                const audioBuffer = await new Response(
                  elevenlabsBody,
                ).arrayBuffer();

                const audioSource = audioContext.createBufferSource();

                audioContext.decodeAudioData(audioBuffer, async (buffer) => {
                  audioSource.buffer = buffer;
                  audioSource.connect(audioContext.destination);
                  //  store the response in local storage
                  await set("previousResponse", text);
                  // set text
                  const words = text.split(" ");

                  setAiTextResponse({ text, words });
                  audioSource.onended = () => stopLoading();
                  audioSource.start();
                  setPlayingResponse(true);
                });
              } catch (error: any) {
                console.error(error);
                stopLoading();
                toast({
                  description: error.message,
                  variant: "destructive",
                });
              }
            };
          };
          setMediaRecorder(newMediaRecorder);
        })
        .catch((error: any) => {
          console.error(error);
          stopLoading();
          toast({
            description: "Please allow microphone access to continue",
            variant: "destructive",
          });
        });
    }
  }, [sessionId, showJoyride]);

  // Function to start recording
  const startRecording = () => {
    setRecordingState((prev) => {
      return {
        ...prev,
        recording: true,
      };
    });
    if (mediaRecorder) {
      mediaRecorder.start();
    }
  };
  // Function to stop recording
  const stopRecording = () => {
    setRecordingState((prev) => {
      return {
        ...prev,
        recording: false,
      };
    });
    if (mediaRecorder) {
      mediaRecorder.stop();
      startLoading();
    }
  };

  function round(value: number, precision: number) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  }

  // This useEffect hook updates the recording text
  useEffect(() => {
    if (shouldUpdateText) {
      setRecordingState((prev) => {
        return {
          ...prev,
          recordingText:
            prev.recordingText === "Click to stop recording"
              ? "Recording in progress..."
              : "Click to stop recording",
        };
      });
    }
  }, [shouldUpdateText]);

  const onUpdateFrame = (latest: ResolvedValues) => {
    const value = round(latest.opacity as number, 2);
    if (value < 0.01) {
      setRecordingState((prev) => {
        return {
          ...prev,
          shouldUpdateText: true,
        };
      });
    }
    if (value > 0.01) {
      setRecordingState((prev) => {
        return {
          ...prev,
          shouldUpdateText: false,
        };
      });
    }
  };

  return (
    <div className="w-full flex flex-col gap-10 text-center justify-center items-center">
      {playingResponse || loading ? (
        <div className="flex flex-col gap-1 items-center">
          <Loader2 className="h-14 w-14 animate-spin" />
          {playingResponse ? "Playing response..." : "Please wait..."}
        </div>
      ) : (
        <div className="text-md w-full relative">
          {/* <div className="relative mr-4">
            <div className="h-4 w-4 rounded-[4px] bg-zinc-950" />
            <div className="absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%]">
            <Loader2 className="h-10 w-10 animate-spin text-zinc-950" />
            </div>
          </div> */}
          {recording ? (
            <Button onClick={stopRecording} className="w-56">
              <LazyMotion features={domAnimation}>
                <m.div
                  key="recording"
                  initial={{ opacity: 1 }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    repeatType: "reverse",
                  }}
                  animate={{ opacity: 0 }}
                  onUpdate={onUpdateFrame}
                >
                  {recordingText}
                </m.div>
              </LazyMotion>
            </Button>
          ) : (
            <Button onClick={startRecording} className="w-56 recording-button">
              Start recording
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
