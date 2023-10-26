# aiyudame-server

## Setup 🔧

To install dependencies:

```bash
bun install
```

Setup google speech to text [here](https://cloud.google.com/speech-to-text/v2/docs/transcribe-client-libraries#before_you_begin)

To run:

```bash
bun run index.js
```

This project was created using `bun init` in bun v1.0.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Deployment 🚀

- Local

```shell
docker build -t aiyudame-server .
docker run -p 3000:3000 aiyudame-server
```

- Dev

```shell
gcloud builds submit --tag gcr.io/aiyudame/server/dev --project aiyudame
gcloud run deploy aiyudame-server-dev --image gcr.io/aiyudame/server/dev --project aiyudame --platform managed --region us-central1
```

- Production

```shell
gcloud builds submit --tag gcr.io/aiyudame/server/prod --project aiyudame
gcloud run deploy aiyudame-server --image gcr.io/aiyudame/server/prod --project aiyudame --platform managed --min-instances 1  --region us-central1
```
