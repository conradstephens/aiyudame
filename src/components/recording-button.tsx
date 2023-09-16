"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { LazyMotion, domAnimation, m } from "framer-motion";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { aiTextResponseAtom, sessionIdAtom, showJoyRideAtom } from "@/atoms";
import { set } from "idb-keyval";

interface ComponentProps {
  language: string;
}

export default function RecordingButton(props: ComponentProps) {
  const { language } = props;
  const sessionId = useAtomValue(sessionIdAtom);
  const showJoyride = useAtomValue(showJoyRideAtom);
  const [playingResponse, setPlayingResponse] = useState(false);
  const [recording, setRecording] = useState(false);
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
    setRecording(true);
    if (mediaRecorder) {
      mediaRecorder.start();
      setRecording(true);
    }
  };
  // Function to stop recording
  const stopRecording = () => {
    setRecording(false);
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      startLoading();
    }
  };

  return (
    <div className="w-full flex flex-col gap-10 text-center justify-center items-center">
      {playingResponse || loading ? (
        <Loader2 className="h-14 w-14 animate-spin" />
      ) : (
        <LazyMotion features={domAnimation}>
          <m.button
            disabled={loading || playingResponse}
            onClick={recording ? stopRecording : startRecording}
            className={clsx(
              "bg-red-500 border-2 border-red-500 h-12 w-12",
              "recording-button",
            )}
            initial={{ borderRadius: "100%" }}
            animate={recording ? { borderRadius: "20%" } : {}}
          />
        </LazyMotion>
      )}
      <div className="text-md w-full relative">
        <div className="absolute top-2/4 left-2/4 translate-x-[-50%] translate-y-[-50%] w-full">
          {recording
            ? "Recording in progress... Press the button again to stop recording"
            : playingResponse
            ? "Playing response..."
            : loading
            ? "Please wait..."
            : "Click the button to start recording"}
        </div>
      </div>
    </div>
  );
}
