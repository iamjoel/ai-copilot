/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from 'ai';
import { z } from 'zod';
import { logger } from '../logger';

const InputSchema = z.object({
  url: z.string().url(),
  // maxChars: z.number().int().positive().max(500_000).default(200_000),
  // timeoutMs: z.number().int().positive().max(30_000).default(15_000),
});

export const jinaUrlContext = tool({
  description:
    'Fetch a URL via Jina Reader (r.jina.ai) and return LLM-friendly text/markdown.',
  inputSchema: InputSchema,
  execute: async ({ url }: z.infer<typeof InputSchema>) => {
    const controller = new AbortController();
    const readerUrl = `https://r.jina.ai/${url}`;

    const res = await fetch(readerUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ai-sdk-jina-tool/1.0',
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`JinaReaderError: ${res.status} ${res.statusText} ${body?.slice(0, 500)}`);
    }

    const text = await res.text();
    logger.info(`Jina Reader fetched content from ${url}, text: ${text.slice(0, 100)}`);
    return text;
  },
} as any);
