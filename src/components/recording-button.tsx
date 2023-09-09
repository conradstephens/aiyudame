"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { LazyMotion, domAnimation, m } from "framer-motion";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { useSetAtom } from "jotai";
import { aiTextResponseAtom } from "@/atoms";

interface ComponentProps {
  sessionId: string | null;
  language: string;
}

export default function RecordingButton(props: ComponentProps) {
  const { sessionId, language } = props;
  const [playingResponse, setPlayingResponse] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const setAitTextResponse = useSetAtom(aiTextResponseAtom);

  const startLoading = () => {
    setLoading(true);
  };

  const stopLoading = () => {
    setPlayingResponse(false);
    setLoading(false);
  };

  // This useEffect hook sets up the media recorder when the component mounts
  useEffect(() => {
    if (typeof window !== "undefined" || !sessionId) {
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

                const audioElement = document.querySelector("audio");
                if (window.MediaSource && audioElement) {
                  const mediaSource = new MediaSource();
                  audioElement.src = URL.createObjectURL(mediaSource);
                  mediaSource.addEventListener("sourceopen", sourceOpen);
                  mediaSource.addEventListener("sourceended", () =>
                    stopLoading(),
                  );
                } else {
                  console.log(
                    "The Media Source Extensions API is not supported.",
                  );
                  throw new Error("Error generating audio");
                }

                async function sourceOpen(e: Event) {
                  try {
                    const mediaSource = e.target as MediaSource | null;
                    if (!audioElement || !mediaSource) return;
                    URL.revokeObjectURL(audioElement.src);
                    const mime = `audio/mpeg`;

                    const sourceBuffer = mediaSource.addSourceBuffer(mime);

                    let modelId = "eleven_multilingual_v2";
                    let voiceId = "N4Jse6hDfsD4Iqv16pxy";

                    if (language === "en") {
                      modelId = "eleven_monolingual_v1";
                      voiceId = "7arsGG6R4puBzDqYy6xu";
                    }
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

                    const arrayOfBuffers: any[] = [];
                    const dataReader = elevenlabsBody.getReader();

                    let done = false;
                    while (!done) {
                      const { done: doneStreaming, value } =
                        await dataReader.read(); // read stream data
                      done = doneStreaming;

                      if (done) {
                        // if done, begin appending the data
                        sourceBuffer.appendBuffer(arrayOfBuffers.shift());
                        setPlayingResponse(true);
                        break;
                      }
                      // append the data to the buffer
                      if (value) {
                        arrayOfBuffers.push(value.buffer);
                      }
                    }

                    sourceBuffer.addEventListener("updateend", function () {
                      if (
                        // make sure the source buffer is not updating and the media source is open
                        !sourceBuffer.updating &&
                        mediaSource?.readyState === "open"
                      ) {
                        if (arrayOfBuffers.length) {
                          // if there is more data to append, append it
                          sourceBuffer.appendBuffer(arrayOfBuffers.shift());
                        } else {
                          // if there is no more data to append, end the stream and play the audio
                          mediaSource.endOfStream();

                          // set text
                          const words = text.split(" ");

                          setAitTextResponse({ text, words });
                          audioElement.play();
                        }
                      }
                    });
                  } catch (error: any) {
                    console.error(error);
                    stopLoading();
                    toast({
                      description: error.message,
                      variant: "destructive",
                    });
                  }
                }
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
  }, [sessionId]);

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
            className={clsx("bg-red-500 border-2 border-red-500 h-14 w-14")}
            initial={{ scale: 1, borderRadius: "100%" }}
            transition={{
              scale: {
                repeat: recording ? Infinity : 0,
                duration: recording ? 2 : 0.1,
                delay: 0.1,
              },
              borderRadius: { duration: 0.3 },
            }}
            animate={
              recording ? { scale: [null, 1.2, 1], borderRadius: "30%" } : {}
            }
          />
        </LazyMotion>
      )}
      <div className="text-md w-full relative">
        <div className="absolute top-2/4 left-2/4 translate-x-[-50%] translate-y-[-50%] w-full">
          {recording
            ? "Recording... Press the button again to stop recording"
            : playingResponse
            ? "Playing response..."
            : loading
            ? "Please wait..."
            : "Click the button to start recording"}
        </div>
      </div>
      <audio />
    </div>
  );
}
