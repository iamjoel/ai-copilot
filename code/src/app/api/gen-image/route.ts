import { experimental_generateImage as generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from 'zod/v3';
import checkInput from "@/app/api/utils/check-input";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  prompt: z.string().trim().min(1, "prompt is required"),
  aspectRatio: z.enum(["1:1", "3:4", "4:3", "9:16", "16:9"]).optional(),
});

type Params = z.infer<typeof ParamsSchema>;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = await req.json();
    const { isValid, response, data } = checkInput(body, ParamsSchema);
    if (!isValid) {
      return response;
    }

    const { prompt, aspectRatio } = data as Params;

    const { image } = await generateImage({
      model: google.image("gemini-2.5-flash-image"), // have some problems
      prompt,
      aspectRatio: aspectRatio ?? "1:1",
      providerOptions: {
        google: {
          personGeneration: "dont_allow",
        },
      },
    });

    return Response.json({
      image: `data:${image.mediaType};base64,${image.base64}`,
      mediaType: image.mediaType,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return Response.json(
      { error: "Unable to generate image right now." },
      { status: 500 },
    );
  }
}
