"use client";

import ThemeToggle from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { set, get } from "idb-keyval";
import { useToast } from "@/components/ui/use-toast";
import { FormProvider, useForm } from "react-hook-form";
import LanguageSelect from "@/components/language-select";
import { ToastAction } from "@/components/ui/toast";

export default function Home() {
  const [playingResponse, setPlayingResponse] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const methods = useForm({
    defaultValues: {
      language: "en",
    },
  });

  const { toast } = useToast();

  const startLoading = () => {
    setLoading(true);
  };

  const stopLoading = () => {
    setPlayingResponse(false);
    setLoading(false);
  };

  const createSession = () => {
    const now = new Date();
    const id = now.getTime().toString();
    set(
      "session",
      JSON.stringify({ sessionId: id, createdAt: now.toLocaleString() }),
    ).then(() => setSessionId(id));
  };

  useEffect(() => {
    const retrieveSession = async () => {
      // get the conversation session id
      const session = await get("session");
      // if session id is not present, create a new session id
      if (!session) {
        createSession();
        return;
      }

      // if session id is present, check if it is expired, check if the session created time is a new day
      const {
        sessionId: id,
        createdAt,
      }: { sessionId: string; createdAt: string } = JSON.parse(session);
      const now = new Date();
      const createdDate = new Date(createdAt);
      const isSameDay = createdDate.getDate() === now.getDate();
      if (!isSameDay) {
        createSession();
        return;
      }
      // if session id is present and not expired, use the session id
      setSessionId(id);
    };
    retrieveSession();
  }, []);

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
            try {
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = async function () {
                if (typeof reader.result !== "string") {
                  stopLoading();
                  throw new Error("Unexpected result type");
                }
                const language = methods.getValues("language");
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
                  throw new Error("Error generating text");
                }
                const text = data.openaiResponse;

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

                    sourceBuffer.addEventListener("updateend", function (e) {
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
              };
            } catch (error: any) {
              console.error(error);
              stopLoading();
              toast({
                description: error.message,
                variant: "destructive",
              });
            }
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
    if (mediaRecorder) {
      mediaRecorder.start();
      setRecording(true);
    }
  };
  // Function to stop recording
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      startLoading();
    }
  };

  return (
    <div className="flex justify-center h-screen">
      <div className="flex flex-col gap-5 p-5 sm:max-w-4xl w-full">
        <div className="flex justify-between">
          <FormProvider {...methods}>
            <LanguageSelect />
          </FormProvider>
          <ThemeToggle />
        </div>
        <div className="w-full flex justify-center items-center h-full">
          <Button
            onClick={recording ? stopRecording : startRecording}
            disabled={loading || playingResponse}
          >
            {!loading &&
              !playingResponse &&
              (recording ? "Stop Recording" : "Start Recording")}
            {loading && !playingResponse && (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait...
              </>
            )}
            {playingResponse && "Playing response..."}
          </Button>
          <audio />
        </div>
      </div>
    </div>
  );
}
