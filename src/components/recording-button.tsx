"use client";

import {
  aiTextResponseAtom,
  recorderAtom,
  sessionIdAtom,
  showJoyRideAtom,
} from "@/atoms";
import { useToast } from "@/components/ui/use-toast";
import { storeResponse } from "@/constants/language";
import { isAppleEnvironment } from "@/lib/utils";
import clsx from "clsx";
import { LazyMotion, ResolvedValues, domAnimation, m } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [isPolyfillLoaded, setIsPolyfillLoaded] = useState(false);

  const { toast } = useToast();

  const setAiTextResponse = useSetAtom(aiTextResponseAtom);

  const startLoading = () => {
    setLoading(true);
  };

  const stopLoading = () => {
    setPlayingResponse(false);
    setLoading(false);
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
    audio.controls = true;
    audio.src = URL.createObjectURL(mediaSource);
    audio.play();

    audio.addEventListener("playing", () => {
      setPlayingResponse(true);
    });

    audio.addEventListener("waiting", () => {
      console.log("waiting for audio to load");
    });

    audio.addEventListener("ended", () => {
      console.log("audio ended");
      stopLoading();
    });

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
          stopLoading();
        }
      };
    });

    return aiResponse;
  };

  // load polyfill for safari and iOS devices
  useEffect(() => {
    const loadPolyfill = async () => {
      if (isAppleEnvironment()) {
        //? mobile iOS devices and Safari on mac creates a weird file format that is not supported by openai
        //? so we use a polyfill that creates a support file format when recording is
        const AudioRecorder = (await import("audio-recorder-polyfill")).default;

        const mpegEncoder = // @ts-ignore
          (await import("audio-recorder-polyfill/mpeg-encoder")).default;
        AudioRecorder.encoder = mpegEncoder;

        // user mpeg encoder for better compression
        AudioRecorder.prototype.mimeType = "audio/mpeg";
        window.MediaRecorder = AudioRecorder;
        setIsPolyfillLoaded(true);
        console.log("loaded polyfill");
      }
    };
    loadPolyfill();
  }, []);

  const initalizeMediaRecorder = async () => {
    if (!sessionId || showJoyride) {
      return;
    }
    try {
      console.log("setting up media recorder");
      let chunks: Blob[] = [];
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
        startLoading();
        // if polyfill is loaded, use wav format
        const fileType = isPolyfillLoaded ? "audio/mpeg" : "audio/webm";
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

      newMediaRecorder.addEventListener("error", (err) => {
        console.error("Error recording audio:", err);
        stopLoading();
        toast({
          description: "Error recording audio",
          variant: "destructive",
        });
      });
      setMediaRecorder(newMediaRecorder);
      newMediaRecorder.start();
      setRecordingState((prevState) => {
        return {
          ...prevState,
          isRecording: true,
        };
      });
    } catch (error) {
      console.error(error);
      stopLoading();
      toast({
        description: "Please allow microphone access to continue",
        variant: "destructive",
      });
    }
  };

  const startRecording = () => {
    if (mediaRecorder) {
      setRecordingState((prevState) => {
        return {
          ...prevState,
          isRecording: true,
        };
      });
      mediaRecorder.start();
      return;
    }
    // if media recorder is not initialized, initialize it
    initalizeMediaRecorder();
  };

  const stopRecording = () => {
    setRecordingState((prevState) => {
      return {
        ...prevState,
        isRecording: false,
      };
    });
    mediaRecorder?.stop();
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

  // visualize audio
  useEffect(() => {
    if (!mediaRecorder) {
      return;
    }
    const canvas = document.getElementById(
      "mic-visualizer",
    ) as HTMLCanvasElement;
    const audioContext = new AudioContext();
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    // Create an analyser node.
    const analyser = audioContext.createAnalyser();

    const source = audioContext.createMediaStreamSource(mediaRecorder.stream);

    source.connect(analyser);

    // Create an array to store the frequency data.
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    // Create a function to draw the frequency data.
    function draw() {
      if (!ctx) {
        return;
      }
      // Get the frequency data.
      analyser.getByteFrequencyData(frequencyData);

      // Clear the canvas.
      ctx.clearRect(0, 0, canvas.width as number, canvas.height as number);

      const sum = frequencyData.reduce((a, b) => a + b, 0);
      const avg = sum / frequencyData.length;
      const baseRadius = Math.min(canvas.width, canvas.height) / 56;
      const multiplier = isRecording ? 0.5 : 0; // Adjust multiplier to achieve desired effect
      const radius = baseRadius + avg * multiplier;

      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(173,0,0,0.3)";
      ctx.fill();

      // Request the next animation frame.
      window.requestAnimationFrame(draw);
    }

    // Start the animation.

    draw();
  }, [isRecording, mediaRecorder]);

  return (
    <div className="w-full flex flex-col gap-10 text-center justify-center items-center">
      {playingResponse || loading ? (
        <div className="flex flex-col gap-1 items-center">
          <Loader2 className="h-14 w-14 animate-spin" />
          {playingResponse ? "Playing response..." : "Please wait..."}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-8">
          <div className="relative">
            <canvas
              id="mic-visualizer"
              className="absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]"
            />
            <div
              id="recording-button"
              onClick={isRecording ? stopRecording : startRecording}
              className={clsx(
                "recording-button",
                "absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] z-10",
                isRecording
                  ? "bg-red-500 hover:bg-red-400"
                  : "bg-red-900 hover:bg-red-800",
              )}
            />
          </div>
          <div className="text-sm font-semibold">
            {isRecording ? (
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
            ) : (
              "Click the button to start recording"
            )}
          </div>
        </div>
      )}
    </div>
  );
}
