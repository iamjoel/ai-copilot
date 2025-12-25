import { z } from 'zod/v3';
import outputRules from "@/prompts/output-rule";

export const promptConfigSchema = z
  .object({
    applyOutputRules: z.boolean().optional(),
    language: z.string().optional(),
  })
  .default({});

type PromptConfig = z.infer<typeof promptConfigSchema>;

export const buildPrompt = (rawPrompt: string, config?: PromptConfig) => {
  const { language, applyOutputRules } = config || {};
  const prompt = rawPrompt.trim();
  if (!applyOutputRules) {
    if (language) {
      return `${prompt}\n## Output Rules (STRICT)
### Language
- Output **${language} only**.`.trim();
    }
    return prompt;
  }
  return `${prompt}\n${outputRules.replace("{language}", language || "English")}`;
}
