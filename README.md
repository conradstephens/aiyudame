# AIyudame 🗣️

**AIyudame** is a Next.js application that utilizes AI chatbot technology to help people improve their Spanish-speaking skills. Whether you're looking to practice conversational Spanish or learn new phrases, AIyudame is here to assist you. This README provides an overview of the project and instructions for setup and development.

## Technologies Used 💻

- **[Next.js](https://nextjs.org/)**: A popular React framework for building efficient and dynamic web applications.
- **[OpenAI](https://platform.openai.com/overview):** Integrates the power of OpenAI's AI models for text transcription and text generation.
- **[ElevenLabs](https://docs.elevenlabs.io/welcome/introduction):** Generative AI text to speech and voice cloning.
- **[Shadcn/ui](https://ui.shadcn.com/):** Beautifully designed components that you can copy and paste into your apps. Accessible. Customizable. Open Source.
- **[TailwindCSS](https://tailwindcss.com/):** A utility-first CSS framework packed with classes like **flex**, **pt-4**, **text-center** and **rotate-90** that can be composed to build any design, directly in your markup.

## Getting Started 🚀

Follow these steps to get started with **grAIt Recipes**:

1. **Clone the Repository:** Start by cloning the repository to your local machine.

```
git clone https://github.com/conradstephens/aiyudame.git
cd aiyudame
```

2. **Install Dependencies:** Use npm or yarn to install the required dependencies.

```
npm install
# or
yarn install
```

3. **Environment Variables:** Create a `.env.development.local` file in the root directory and add the following environment variables:

```
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id
# see https://elevenlabs.io/voice-lab about generating a voice id
```

4. **Run the App:** Start the development server to run the app locally.

```
npm run dev
# or
yarn dev
```

5. **Access the App:** Open your web browser and navigate to `http://localhost:3000` to access the grAIt Recipes app.

## Environment Variables 🔑

- **OPENAI_API_KEY:** Obtain your OpenAI API key by signing up on the [OpenAI website](https://platform.openai.com/overview) and create a new API key in your account dashboard.
- **ELEVENLABS_VOICE_ID:** Obtain the voice ID by signing up on the [Eleven Labs website](https://elevenlabs.io/) and creating an account.
- **ELEVENLABS_API_KEY:** Get the API key from your Eleven Labs account dashboard.
