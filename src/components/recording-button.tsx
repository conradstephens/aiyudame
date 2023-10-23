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

  // transcribe user input into text
  const handleTransciption = async (reader: FileReader) => {
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

    return data.text;
  };

  // send transcibed text to openai to generate response
  const handleChatCompletion = async (humanResponse: string) => {
    const response = await fetch("/api/chatCompletion", {
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

    if (!response.ok) {
      stopLoading();
      throw new Error("Error generating openai response");
    }

    return response.body;
  };

  // store the conversation in the db
  const storeConversation = async (
    humanResponse: string,
    aiResponse: string,
  ) => {
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

  // establish socket connection with elevenlabs
  const establishSocketConnection = (body: ReadableStream<Uint8Array>) => {
    let modelId = "eleven_monolingual_v1";
    let voiceId = "7arsGG6R4puBzDqYy6xu";

    if (language === "es" || language === "it") {
      modelId = "eleven_multilingual_v2";
      voiceId = "N4Jse6hDfsD4Iqv16pxy";
    }
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${modelId}&optimize_streaming_latency=3`;
    // Initialize the connection
    const socket = new WebSocket(wsUrl);

    // create media source to play audio
    const mediaSource = new MediaSource();
    const audio = new Audio();
    audio.autoplay = true;
    audio.src = URL.createObjectURL(mediaSource);

    let aiResponse = "";
    socket.onopen = async function () {
      console.log("elevenlabs connection established");

      const openAiReader = body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      const bosMessage = {
        text: " ",
        voice_settings: {
          stability: 0.5,
          similarity_boost: true,
        },
        xi_api_key: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY as string, // replace with your API key
      };

      socket.send(JSON.stringify(bosMessage));

      while (!done) {
        const { value, done: doneReading } = await openAiReader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        // 3. Send each chunk of text to the WebSocket
        const textMessage = {
          text: chunkValue,
          try_trigger_generation: true,
        };
        socket.send(JSON.stringify(textMessage));
        aiResponse += chunkValue;

        const words = aiResponse.split(" ");
        setAiTextResponse({ text: aiResponse, words });
      }
      //  store the response in local storage
      await storeResponse(language, aiResponse);

      // 4. Send the EOS message with an empty string
      const eosMessage = {
        text: "",
      };

      socket.send(JSON.stringify(eosMessage));
    };

    // Handle errors
    socket.onerror = function (error) {
      console.error(`WebSocket Error: ${error}`);
    };

    // Handle socket closing
    socket.onclose = function (event) {
      if (event.wasClean) {
        console.info(
          `Connection closed cleanly, code=${event.code}, reason=${event.reason}`,
        );
      } else {
        console.warn("Connection died");
      }
    };

    const audioChunksQueue: ArrayBuffer[] = []; // a queue to hold audio chunks

    mediaSource.addEventListener("sourceopen", () => {
      const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg"); // Adjust mime type accordingly

      sourceBuffer.addEventListener("error", (e) => {
        console.error("Error in source buffer:", e);
      });

      sourceBuffer.addEventListener("updateend", () => {
        stopLoading();
        // Once the previous chunk has been appended, check for more chunks
        const nextChunk = audioChunksQueue.shift(); // take the next chunk from the queue
        if (!nextChunk) return;
        sourceBuffer.appendBuffer(nextChunk); // append it
      });

      // 2. Handling WebSocket Messages
      socket.onmessage = function (event) {
        const response = JSON.parse(event.data);
        if (response.audio) {
          const audioChunk = atob(response.audio); // decode base64
          const uint8Array = new Uint8Array(audioChunk.length);
          for (let i = 0; i < audioChunk.length; i++) {
            uint8Array[i] = audioChunk.charCodeAt(i);
          }
          if (!sourceBuffer.updating) {
            sourceBuffer.appendBuffer(uint8Array.buffer); // append chunk immediately if possible
          } else {
            audioChunksQueue.push(uint8Array.buffer); // otherwise, queue it for later
          }
        } else {
          console.log("No audio data in the response");
        }

        if (response.isFinal) {
          console.log("Generation complete");
        }
      };
    });

    return aiResponse;
  };

  // This useEffect hook sets up the media recorder when the component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && sessionId && !showJoyride) {
      console.log("setting up media recorder");
      let chunks: Blob[] = [];
      const initalizeMediaRecorder = async () => {
        try {
          // load the polyfill if the browser is safari
          const isPolyfillLoaded = await loadPolyfill();

          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });

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
                // transcribe audio
                const humanResponse = await handleTransciption(reader);

                // generate response
                const body = await handleChatCompletion(humanResponse);

                if (!body) {
                  return;
                }

                // establish socket connection
                const aiResponse = establishSocketConnection(body);

                await storeConversation(humanResponse, aiResponse);
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
        } catch (error) {
          console.error(error);
          stopLoading();
          toast({
            description: "Please allow microphone access to continue",
            variant: "destructive",
          });
        }
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
