# AIyudame 🗣️

**AIyudame** is a Next.js application that utilizes AI chatbot technology to help people improve their Spanish-speaking skills. Whether you're looking to practice conversational Spanish or learn new phrases, AIyudame is here to assist you. This README provides an overview of the project and instructions for setup and development. Users can switch the language to English for just a regular chat bot.

## Technologies Used 💻

- **[Next.js](https://nextjs.org/)**: A popular React framework for building efficient and dynamic web applications.
- **[OpenAI](https://platform.openai.com/overview):** Integrates the power of OpenAI's AI models for text transcription and text generation.
- **[ElevenLabs](https://docs.elevenlabs.io/welcome/introduction):** Generative AI text to speech and voice cloning.
- **[Shadcn/ui](https://ui.shadcn.com/):** Beautifully designed components that you can copy and paste into your apps. Accessible. Customizable. Open Source.
- **[TailwindCSS](https://tailwindcss.com/):** A utility-first CSS framework packed with classes like **flex**, **pt-4**, **text-center** and **rotate-90** that can be composed to build any design, directly in your markup.
- **[Planetscale](https://planetscale.com):** A cloud-native database platform designed to help organizations manage and scale their databases easily and efficiently.
- **[Prisma](https://www.prisma.io/):** A Node.js and TypeScript ORM.
- **[Langchain](https://langchain.com):** A framework for developing applications powered by language models.
- **[Jotai](https://jotai.org/):** Primitive and flexible state management for React.

## Getting Started 🚀

Follow these steps to get started with **AIyudame**:

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
PLANETSCALE_DB_HOST=your_planetscale_hostname
PLANETSCALE_DB_USERNAME=your_planetscale_username
PLANETSCALE_DB_PASSWORD=your_planetscale_password
CRON_SECRET=your_random_generated_secret
# see https://elevenlabs.io/voice-lab about generating a voice id
```

4. **Set Up Planetscale:**

- Go to [planetscale](https://planetscale.com).
- Create an account.
- Create a database.
- Create a branch.
- Create a password for that branch.
- Connect with **Node.js** and copy the `DATABASE_URL` for later
- Switch to connect with **@planetscale/database** copy and paste those values into your `.env.development.local`.

5. **Set Up Prisma:** Create a `.env` file in the prisma folder and paste the `DATABASE_URL` you copied in the previous step like below.

```
DATABASE_URL=your_planetscale_url
```

- If you lost the DATABASE_URL, you have everything you need to create the string. It is structured like this `DATABASE_URL: mysql://USERNAME:PASSWORD@HOSTNAME/DATABASE_NAME?ssl={"rejectUnauthorized":true}&sslcert=location_of_your_ssl_cert`. You just need to set the location of your ssl cert. See your file path [here](https://planetscale.com/docs/concepts/secure-connections#ca-root-configuration).

6. **Generate Typings and Push Table:**

- Run the following command to generate the prisma typings.

```
npm run postinstall
# or
yarn postinstall
```

- Run the following command to push the pre-defined table to the database.

```
npm run prisma:push
# or
yarn prisma:push
```

7. **Run the App:** Start the development server to run the app locally.

```
npm run dev
# or
yarn dev
```

8. **Access the App:** Open your web browser and navigate to `http://localhost:3000` to access AIyudame.

## Environment Variables 🔑

- **OPENAI:** Follow this [guide](https://platform.openai.com/docs/api-reference/authentication) to obtain your openai api key.
- **ELEVENLABS_API_KEY:** Follow this [guide](https://docs.elevenlabs.io/api-reference/quick-start/authentication) to obtain your elevenlabs api key.
- **ELEVENLABS_VOICE_ID:** Query this [endpoint](https://docs.elevenlabs.io/api-reference/voices) to obtain the specific voice id you want.
- **PLANETSCALE:** Follow this [guide](https://planetscale.com/docs/concepts/connection-strings) to obtain your planetscale keys.
- **CRON_SECRET:** Generate a secret to authenticate requests to your cron job api route.

## Deployment 😎

- If deploying to vercel, see this [guide](https://planetscale.com/docs/tutorials/deploy-to-vercel)
