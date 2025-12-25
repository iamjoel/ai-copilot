import { generateText } from "ai";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { z } from 'zod/v3';
import checkInput from "@/app/api/utils/check-input";
import { get } from "http";
import { getModel } from "@/lib/model-factory";
import { image } from "@markdoc/markdoc/dist/src/schema";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  prompt: z.string().trim().min(1, "prompt is required"),
  aspectRatio: z.enum(["1:1", "3:4", "4:3", "9:16", "16:9"]).optional(),
});

type Params = z.infer<typeof ParamsSchema>;

const model = getModel("google", "models/gemini-2.5-flash-image");

export async function POST(req: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = await req.json();
    const { isValid, response, data } = checkInput(body, ParamsSchema);
    if (!isValid) {
      return response;
    }

    const { prompt, aspectRatio } = data as Params;

    const { files } = await generateText({
      model,
      prompt: `${prompt}`,
      // prompt: `${prompt}. Aspect ratio: ${aspectRatio || "1:1"}.`,
      providerOptions: {
        google: { // aspectRatio not worked currently, always generates 1:1
          imageGeneration: {
            aspectRatio: aspectRatio || "1:1",
          },
        },
      }
    });
    const file = files.at(0)

    if (!file?.base64) {
      throw new Error('Failed to generate image');
    }
    // Format as a data URI with the proper media type for use in img src
    const mediaType = file.mediaType || 'image/png';

    return Response.json({
      image: `data:${mediaType};base64,${file.base64}`,
      mediaType,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return Response.json(
      { error: "Unable to generate image right now." },
      { status: 500 },
    );
  }
}
