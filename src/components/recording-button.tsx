"use client";

import {
  aiTextResponseAtom,
  languageAtom,
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
import { block } from "million/react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

function round(value: number, precision: number) {
  var multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}

const webSocketUri =
  process.env.NODE_ENV === "production"
    ? "https://aiyudame-server-u4cwegvzla-uc.a.run.app"
    : "http://localhost:3001";

const RecordingButton = block(
  function RecordingButton() {
    const sessionId = useAtomValue(sessionIdAtom);
    const showJoyride = useAtomValue(showJoyRideAtom);
    const [{ isRecording, status }, setRecordingState] = useAtom(recorderAtom);
    const language = useAtomValue(languageAtom);
    const [playingResponse, setPlayingResponse] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
      null,
    );
    const [loading, setLoading] = useState(false);

    const [audioInput, setAudioInput] =
      useState<MediaStreamAudioSourceNode | null>(null);
    const [audioProcessor, setAudioProcessor] =
      useState<AudioWorkletNode | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    const { toast } = useToast();

    const setAiTextResponse = useSetAtom(aiTextResponseAtom);

    const startLoading = () => {
      setLoading(true);
    };

    const stopLoading = () => {
      setPlayingResponse(false);
      setLoading(false);
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

      audio.addEventListener("playing", () => {
        setPlayingResponse(true);
      });

      audio.addEventListener("ended", () => {
        console.log("audio ended");
        stopLoading();
      });

      let aiResponse = "";
      socket.onopen = async function () {
        console.log("elevenlabs connection established");

        const bosMessage = {
          text: " ",
          voice_settings: {
            stability: 0.5,
            similarity_boost: true,
          },
          xi_api_key: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY as string, // replace with your API key
        };

        socket.send(JSON.stringify(bosMessage));

        // play audio
        audio.play();

        const openAiReader = body.getReader();
        const decoder = new TextDecoder();
        let done = false;

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
            // console.log("Generation complete");
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
          const AudioRecorder = (await import("audio-recorder-polyfill"))
            .default;

          const mpegEncoder = // @ts-ignore
            (await import("audio-recorder-polyfill/mpeg-encoder")).default;
          AudioRecorder.encoder = mpegEncoder;

          // user mpeg encoder for better compression
          AudioRecorder.prototype.mimeType = "audio/mpeg";
          window.MediaRecorder = AudioRecorder;
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
        const socket = io(webSocketUri);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            sampleSize: 16,
            channelCount: 1,
            deviceId: "default",
          },
          video: false,
        });

        const newMediaRecorder = new MediaRecorder(stream);
        const audioContext = new AudioContext();
        await audioContext.audioWorklet.addModule(
          "/worklets/recorderWorkletProcessor.js",
        );
        const newAudioInput = audioContext.createMediaStreamSource(stream);
        const newAudioProcessor = new AudioWorkletNode(
          audioContext,
          "recorder.worklet",
        );
        setAudioContext(audioContext);
        setAudioInput(newAudioInput);
        setAudioProcessor(audioProcessor);
        newAudioProcessor.connect(audioContext.destination);
        newAudioInput.connect(newAudioProcessor);

        newAudioProcessor.port.onmessage = (event) => {
          socket.emit("send_audio", event.data);
        };

        socket.on("transcription", async (data) => {
          console.log("transcription", data);
          try {
            startLoading();
            // generate response
            const body = await handleChatCompletion(data);

            if (!body) {
              return;
            }

            // establish socket connection
            const aiResponse = establishSocketConnection(body);

            await storeConversation(data, aiResponse);
          } catch (error: any) {
            console.error(error);
            stopLoading();
            toast({
              description: error.message,
              variant: "destructive",
            });
          }
        });

        newMediaRecorder.addEventListener("stop", async () => {
          newAudioInput.disconnect();
          newAudioProcessor.disconnect();
          audioContext.close();
          socket.emit("end_audio");
        });

        newMediaRecorder.addEventListener("error", (err) => {
          console.error("Error recording audio:", err);
          stopLoading();
          toast({
            description: "Error recording audio",
            variant: "destructive",
          });
        });
        newMediaRecorder.start();
        setRecordingState((prevState) => {
          return {
            ...prevState,
            isRecording: true,
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

    const startRecording = () => {
      if (mediaRecorder && audioContext && audioProcessor) {
        // connect audio processor
        audioProcessor.connect(audioContext.destination);
        audioInput?.connect(audioProcessor);
        mediaRecorder.start();
        setRecordingState((prevState) => {
          return {
            ...prevState,
            isRecording: true,
          };
        });
        return;
      }
      // if media recorder is not initialized, initialize it
      initalizeMediaRecorder();
    };

    const stopRecording = () => {
      mediaRecorder?.stop();
      setRecordingState((prevState) => {
        return {
          ...prevState,
          isRecording: false,
        };
      });
    };

    const onUpdateFrame = (latest: ResolvedValues) => {
      const value = round(latest.opacity as number, 2);
      if (value < 0.01) {
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

      const isMobile = window.matchMedia("(max-width: 768px)").matches;

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
        const baseRadius =
          Math.min(canvas.width, canvas.height) / (isMobile ? 35 : 60);
        const multiplier = isRecording ? (isMobile ? 0.75 : 0.4) : 0; // Adjust multiplier to achieve desired effect
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
    }, [isRecording]);

    return (
      <div className="w-full flex flex-col gap-10 text-center justify-center items-center">
        {playingResponse || loading ? (
          <div className="flex flex-col gap-1 items-center font-semibold">
            <Loader2 className="h-9 w-9 animate-spin" />
            <div className="text-sm">
              {playingResponse ? "Playing response..." : "Please wait..."}
            </div>
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
                  "no-select",
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
  },
  { ssr: false },
);

export default RecordingButton;
