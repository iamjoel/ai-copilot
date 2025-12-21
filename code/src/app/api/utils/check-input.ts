/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
const checkInput = (obj: Record<string, any>, schema: z.ZodObject<any>) => {
  const result = schema.safeParse(obj);
  if (!result.success) {
    return {
      isValid: false,
      response: new Response(
        JSON.stringify({
          error: "Invalid request parameters.",
          issues: result.error.issues,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    };
  }
  return {
    isValid: true,
    data: result.data,
  }
}

export default checkInput
