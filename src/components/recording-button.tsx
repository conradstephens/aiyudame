"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { LazyMotion, ResolvedValues, domAnimation, m } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  aiTextResponseAtom,
  recorderAtom,
  sessionIdAtom,
  showJoyRideAtom,
} from "@/atoms";
import { Button } from "./ui/button";
import { isAppleEnvironment } from "@/lib/utils";
import { storeResponse } from "@/constants/language";

interface ComponentProps {
  language: string;
}

export default function RecordingButton(props: ComponentProps) {
  const { language } = props;
  const sessionId = useAtomValue(sessionIdAtom);
  const showJoyride = useAtomValue(showJoyRideAtom);
  const [playingResponse, setPlayingResponse] = useState(false);
  const [{ isRecording, status, shouldUpdateText }, setRecordingState] =
    useAtom(recorderAtom);
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

  const loadPolyfill = async () => {
    if (isAppleEnvironment()) {
      //? mobile iOS devices and Safari on mac creates a weird file format that is not supported by openai
      //? so we use a polyfill that creates a support file format when recording is
      const AudioRecorder = (await import("audio-recorder-polyfill")).default;
      console.log("loaded polyfill");
      window.MediaRecorder = AudioRecorder;
      return true;
    }
  };

  // This useEffect hook sets up the media recorder when the component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && sessionId && !showJoyride) {
      console.log("setting up media recorder");
      let chunks: Blob[] = [];
      const initalizeMediaRecorder = async () => {
        // load the polyfill if the browser is safari
        const isPolyfillLoaded = await loadPolyfill();

        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            const newMediaRecorder = new MediaRecorder(stream);
            newMediaRecorder.addEventListener("start", () => {
              chunks = [];
            });
            newMediaRecorder.addEventListener("dataavailable", (e) => {
              chunks.push(e.data);
            });

            newMediaRecorder.addEventListener("stop", async () => {
              // if polyfill is loaded, use wav format
              const fileType = isPolyfillLoaded ? "audio/wav" : "audio/webm";
              const audioBlob = new Blob(chunks, { type: fileType });
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              audio.onerror = (err) => {
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

                  if (!response.ok || data.error) {
                    stopLoading();
                    throw new Error(data.error);
                  }

                  const humanResponse = data.text;

                  const opeanAiChatRes = await fetch("/api/chatCompletion", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      content: humanResponse,
                      sessionId,
                      language,
                    }),
                  });

                  if (!opeanAiChatRes.ok) {
                    stopLoading();
                    throw new Error("Error generating openai response");
                  }

                  const body = opeanAiChatRes.body;

                  if (!body) {
                    return;
                  }
                  const openAiReader = body.getReader();
                  const decoder = new TextDecoder();
                  let aiResponse = "";
                  let done = false;

                  while (!done) {
                    const { value, done: doneReading } =
                      await openAiReader.read();
                    done = doneReading;
                    const chunkValue = decoder.decode(value);
                    aiResponse += chunkValue;
                  }

                  const audioContext = new AudioContext();
                  const audioElement = new Audio();
                  audioElement.controls = true;

                  URL.revokeObjectURL(audioElement.src);

                  const storeConversation = async () => {
                    try {
                      // save the chats to db
                      const res = await fetch("/api/storeNewChats", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          data: [
                            {
                              session_id: sessionId,
                              type: "human",
                              content: humanResponse,
                            },
                            {
                              session_id: sessionId,
                              type: "ai",
                              content: aiResponse,
                            },
                          ],
                        }),
                      });

                      if (!res.ok) {
                        console.error("Error storing chats");
                        const data = await res.json();
                        console.error(data);
                      }
                    } catch (e) {
                      console.error("Error storing conversation", e);
                    }
                  };

                  const generateAudio = async () => {
                    try {
                      let modelId = "eleven_monolingual_v1";
                      let voiceId = "7arsGG6R4puBzDqYy6xu";

                      if (language === "es" || language === "it") {
                        modelId = "eleven_multilingual_v2";
                        voiceId = "N4Jse6hDfsD4Iqv16pxy";
                      }
                      // generate audio from openai response
                      const response = await fetch(
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
                            text: aiResponse,
                            model_id: modelId,
                          }),
                        },
                      );
                      return { response, ok: response.ok };
                    } catch (e) {
                      console.error("Error generating audio", e);
                    }
                  };
                  const [elevenLabsRes] = await Promise.all([
                    generateAudio(),
                    storeConversation(),
                  ]);

                  if (!elevenLabsRes || !elevenLabsRes.ok) {
                    const error = await elevenLabsRes?.response.json();
                    console.error("Error generating audio:", error);
                    throw new Error("Error generating audio");
                  }
                  const elevenlabsBody = elevenLabsRes.response.body;

                  if (!elevenlabsBody) {
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
                    await storeResponse(language, aiResponse);
                    // set text
                    const words = aiResponse.split(" ");

                    setAiTextResponse({ text: aiResponse, words });
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
            });
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
      };
      initalizeMediaRecorder();
    }
  }, [sessionId, showJoyride]);

  // Function to start recording
  const startRecording = () => {
    setRecordingState((prev) => {
      return {
        ...prev,
        isRecording: true,
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
        isRecording: false,
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
          status:
            prev.status === "Click to stop recording"
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
          {isRecording ? (
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
                  {status}
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
