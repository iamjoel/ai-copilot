import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

let googleClient: GoogleGenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getGoogleClient() {
  if (googleClient) {
    return googleClient;
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return null;
  }

  googleClient = new GoogleGenAI({ apiKey });
  return googleClient;
}

function getAnthropicClient() {
  if (anthropicClient) {
    return anthropicClient;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

export async function countGoogleTokens(model: string, text: string) {
  const client = getGoogleClient();
  if (!client) {
    return null;
  }

  const response = await client.models.countTokens({
    model,
    contents: text,
  });

  return response.totalTokens ?? null;
}

export async function countAnthropicTokens(
  model: string,
  text: string,
  systemPrompt: string,
) {
  const client = getAnthropicClient();
  if (!client) {
    return null;
  }

  try {
    const response = await client.messages.countTokens({
      model,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    });

    return response.input_tokens ?? null;
  } catch (error) {
    console.error("Error counting Anthropic tokens:", error);
    return null;
  }
}

export async function countInputTokens({
  provider,
  model,
  text,
  systemPrompt,
}: {
  provider: "google" | "anthropic";
  model: string;
  text: string;
  systemPrompt: string;
}) {
  if (provider === "google") {
    return countGoogleTokens(model, text);
  }

  return countAnthropicTokens(model, text, systemPrompt);
}
