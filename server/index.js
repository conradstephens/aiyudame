const http = require("http");
const { Server } = require("socket.io");
const speech = require("@google-cloud/speech");

const httpServer = http.createServer();

const client = new speech.SpeechClient();

const origin = process.env.NODE_ENV === "production" ? "https://aiyudame.vercel.app" : "http://localhost:3000";

const io = new Server(httpServer, {
  cors: {
    origin, // Replace with your frontend URL
    methods: ["POST", "GET"],
    credentials: true,
  },
});

const encoding = "LINEAR16";
const sampleRateHertz = 16000;
const languageCode = "es-MX";

io.on("connection", (socket) => {
  console.log("recording started => ", socket.id);
  // Create a recognize stream
  const recognizeStream = client
    .streamingRecognize({
      config: {
        encoding,
        sampleRateHertz,
        languageCode,
      },
      // interimResults: true, // If you want interim results, set this to true
    })
    .on("error", console.error)
    .on("data", (data) => {
      const result = data.results[0];
      const isFinal = result?.isFinal;
      if (result && isFinal && result.alternatives[0]) {
        socket.emit("transcription", result.alternatives[0].transcript);

        if (!socket.disconnected) {
          socket.disconnect();
        }
      }
    });

  // audio from client microphone
  socket.on("send_audio", (audioData) => {
    recognizeStream.write(audioData, undefined, (e) => {
      if (e) {
        console.log("error", e);
      }
    });
  });

  // when client stops recording
  socket.on("end_audio", () => {
    console.log("recording ended =>", socket.id);
    recognizeStream.end();
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log("enviroment", process.env.NODE_ENV)
  console.log(`Socket.io server is running on port ${PORT}`);
});
