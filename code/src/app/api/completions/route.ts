import { createGoogleGenerativeAI } from "@ai-sdk/google";
// import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
// import '@/lib/add-proxy';
// export const runtime = "edge";

import { ProxyAgent, setGlobalDispatcher } from 'undici';

type Provider = "google" | "openai";

const MODEL_MAP: Record<
  string,
  { provider: Provider; model: string }
> = {
  "gemini-2.5-flash": {
    provider: "google",
    model: "models/gemini-2.0-flash-exp",
  },
  "gemini-2.5-pro": {
    provider: "google",
    model: "models/gemini-2.0-pro-exp-02-05",
  },
  "gemini-3": {
    provider: "google",
    model: "models/gemini-1.5-pro",
  },
  "gpt-4o-mini": { provider: "openai", model: "gpt-4o-mini" },
};

export async function POST(req: Request) {
  // const res = await fetch('https://ifconfig.me/ip');
  // console.log(await res.text());

  const proxy = new ProxyAgent('http://127.0.0.1:7890')
  setGlobalDispatcher(proxy);
  try {
    const { prompt, model } = (await req.json()) as {
      prompt?: string;
      model?: string;
    };

    if (!prompt || !model) {
      return new Response(
        JSON.stringify({
          error: "Missing prompt or model selection.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const target = MODEL_MAP[model];
    if (!target) {
      return new Response(
        JSON.stringify({ error: "Unsupported model choice." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (target.provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Missing GOOGLE_GENERATIVE_AI_API_KEY. Add it to your environment to call Gemini models.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (target.provider === "openai" && !process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Missing OPENAI_API_KEY. Add it to your environment to call OpenAI models.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // const modelClient =
    //   target.provider === "google"
    //     ? createGoogleGenerativeAI({
    //       apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    //     })
    //     : createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const modelClient = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    })

    const result = await generateText({
      model: modelClient(target.model),
      prompt,
    });
    console.log("Completion result:", result);

    return new Response(
      JSON.stringify({ text: result.text }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Completion error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to generate text right now." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
