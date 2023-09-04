"use client";

import ThemeToggle from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { base64StringToBlob } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const [playingResponse, setPlayingResponse] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startLoading = () => {
    setLoading(true);
  };

  const stopLoading = () => {
    setPlayingResponse(false);
    setLoading(false);
  };

  const createSessionId = () => {
    const now = new Date();
    const id = now.getTime().toString();
    localStorage.setItem(
      "sessionId",
      JSON.stringify({ sessionId: id, createdAt: now.toLocaleString() }),
    );
    setSessionId(id);
  };

  useEffect(() => {
    // get the conversation session id
    const sessionId = localStorage.getItem("sessionId");
    // if session id is not present, create a new session id
    if (!sessionId) {
      createSessionId();
      return;
    }

    // if session id is present, check if it is expired, check if the session created time is a new day
    const {
      sessionId: id,
      createdAt,
    }: { sessionId: string; createdAt: string } = JSON.parse(sessionId);
    const now = new Date();
    const createdDate = new Date(createdAt);
    const isSameDay = createdDate.getDate() === now.getDate();
    if (!isSameDay) {
      createSessionId();
      return;
    }
    // if session id is present and not expired, use the session id
    setSessionId(id);
  }, []);

  // This useEffect hook sets up the media recorder when the component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
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
                const base64Audio = reader.result.split(",")[1]; // Remove the data URL prefix
                const response = await fetch("/api/speechToText", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ audio: base64Audio, sessionId }),
                });
                const data = await response.json();
                if (!response.ok) {
                  stopLoading();
                  throw (
                    data.error ||
                    new Error(`Request failed with status ${response.status}`)
                  );
                }
                const base64Blob = data.result;
                if (base64Blob) {
                  // Usage example
                  const contentType = "audio/mpeg"; // Replace with the actual content type
                  const blob = base64StringToBlob(base64Blob, contentType);

                  // get audio from blob and play audio through audio player
                  const audio = new Audio(URL.createObjectURL(blob));

                  audio.addEventListener("playing", () => {
                    setPlayingResponse(true);
                  });
                  audio.addEventListener("ended", () => {
                    stopLoading();
                  });

                  audio.play();
                }
              };
            } catch (error: any) {
              console.error(error);
              stopLoading();
              alert(error.message);
            }
          };
          setMediaRecorder(newMediaRecorder);
        })
        .catch((err) => {
          console.error("Error accessing microphone:", err);
          stopLoading();
        });
    }
  }, []);

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
        </div>
      </div>
    </div>
  );
}
