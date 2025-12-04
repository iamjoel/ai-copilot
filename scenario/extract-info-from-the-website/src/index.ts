import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, type LanguageModel } from 'ai';

const WIKI_URL = 'https://en.wikipedia.org/wiki/Hawf_National_Reserve';
const RUNS_PER_MODEL = 2;

type Provider = 'google' | 'openai';

type ModelConfig = {
  name: string;
  provider: Provider;
  modelId: string;
};

type PreparedModel = {
  name: string;
  model: LanguageModel;
};

const MODEL_CONFIGS: ModelConfig[] = [
  { name: 'Gemini 2.0 Flash', provider: 'google', modelId: 'gemini-2.0-flash' },
  { name: 'Gemini 2.0 Flash-Lite', provider: 'google', modelId: 'gemini-2.0-flash-lite' },
  { name: 'Gemini 1.5 Flash', provider: 'google', modelId: 'gemini-1.5-flash-latest' },
  { name: 'Gemini 1.5 Pro', provider: 'google', modelId: 'gemini-1.5-pro-latest' },
  { name: 'GPT-5.1', provider: 'openai', modelId: 'gpt-5.1' },
  { name: 'GPT-5.1 Mini', provider: 'openai', modelId: 'gpt-5.1-mini' },
  { name: 'GPT-4o', provider: 'openai', modelId: 'gpt-4o' },
  { name: 'GPT-4o Mini', provider: 'openai', modelId: 'gpt-4o-mini' },
];

const OUTPUT_FILE = path.resolve(process.cwd(), 'result.csv');

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function trimContext(input: string, maxLength = 9000): string {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, maxLength)}...`;
}

async function fetchPageContext(): Promise<string> {
  const response = await fetch(WIKI_URL, {
    headers: {
      'User-Agent': 'ai-copilot-extractor/1.0 (+https://github.com/)',
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const infoboxLines: string[] = [];
  $('.infobox tr').each((_index: number, element: Element) => {
    const header = normalizeWhitespace($(element).find('th').text());
    const value = normalizeWhitespace($(element).find('td').text());
    if (header && value) {
      infoboxLines.push(`${header}: ${value}`);
    }
  });

  const bodyText = normalizeWhitespace($('#mw-content-text').text());

  return [
    'Infobox:',
    infoboxLines.join('\n'),
    '\nPage Body:',
    trimContext(bodyText),
  ]
    .filter(Boolean)
    .join('\n');
}

function prepareModels(): PreparedModel[] {
  const googleApiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const google = googleApiKey ? createGoogleGenerativeAI({ apiKey: googleApiKey }) : null;
  const openai = openaiApiKey ? createOpenAI({ apiKey: openaiApiKey }) : null;

  const availableModels: PreparedModel[] = [];

  for (const config of MODEL_CONFIGS) {
    if (config.provider === 'google') {
      if (!google) {
        console.warn(`Skipping ${config.name} because GOOGLE_API_KEY or GEMINI_API_KEY is missing.`);
        continue;
      }
      availableModels.push({ name: config.name, model: google(config.modelId) });
    } else {
      if (!openai) {
        console.warn(`Skipping ${config.name} because OPENAI_API_KEY is missing.`);
        continue;
      }
      availableModels.push({ name: config.name, model: openai(config.modelId) });
    }
  }

  if (availableModels.length === 0) {
    throw new Error('No models are available. Please set the required API keys.');
  }

  return availableModels;
}

async function runSingleExtraction(model: LanguageModel, prompt: string): Promise<string> {
  const { text } = await generateText({
    model,
    prompt,
    maxRetries: 1,
  });

  return text.trim();
}

async function writeCsv(rows: string[][]): Promise<void> {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [['Model Name', 'Run 1 Result', 'Run 2 Result', 'Run 3 Result'], ...rows].map(
    (row) => row.map(escape).join(','),
  );

  await fs.writeFile(OUTPUT_FILE, lines.join('\n'), 'utf8');
}

async function main(): Promise<void> {
  console.log('Fetching Wikipedia page content...');
  // const context = await fetchPageContext();

  const prompt = [
    '你是一个高精度的数据提取助手。从以下页面内容中提取 Hawf 国家保护区（Hawf National Reserve）的成立时间（Established）。',
    `页面来源：${WIKI_URL}`,
    // '页面内容（供参考）：',
    // context,
    '请仅返回成立时间的年份，例如 "1990"。如果页面上没有找到相关信息，请回答 "未找到成立时间"。',
  ].join('\n\n');

  const models = prepareModels();
  const results: string[][] = [];

  for (const { name, model } of models) {
    console.log(`\nRunning ${name} (${RUNS_PER_MODEL}x)...`);
    const runs: string[] = [];

    for (let i = 0; i < RUNS_PER_MODEL; i += 1) {
      try {
        const result = await runSingleExtraction(model, prompt);
        runs.push(result);
        console.log(`  Run ${i + 1}: ${result}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        runs.push(`ERROR: ${message}`);
        console.error(`  Run ${i + 1} failed: ${message}`);
      }
    }

    results.push([name, ...runs]);
  }

  await writeCsv(results);
  console.log(`\nDone. Results written to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
