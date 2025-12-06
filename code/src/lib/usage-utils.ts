export type UsageDetail = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  urlTokens?: number;
  raw?: unknown;
};

export type CurrencyCost = {
  input: number;
  output: number;
  url: number;
  total: number;
};

export type CostDetail = {
  usd: CurrencyCost;
  cny: CurrencyCost;
  rates: {
    usdPerToken: {
      input: number;
      output: number;
      url: number;
    };
    usdToCny: number;
  };
};

export const GEMINI_FLASH_LITE_RATES = {
  inputPerToken: 0.1 / 1_000_000, // USD per input token
  outputPerToken: 0.4 / 1_000_000, // USD per output token
  usdToCny: 7.2,
};

export function computeUsageDetail(rawUsage: unknown): UsageDetail | undefined {
  if (!rawUsage) return undefined;

  const usage = rawUsage as {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    urlTokens?: number;
  };

  const inputTokens = usage.promptTokens ?? usage.inputTokens;
  const outputTokens = usage.completionTokens ?? usage.outputTokens;
  const totalTokens = usage.totalTokens;
  const urlTokens =
    usage.urlTokens ??
    (totalTokens !== undefined && (inputTokens !== undefined || outputTokens !== undefined)
      ? totalTokens - ((inputTokens ?? 0) + (outputTokens ?? 0))
      : undefined);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    urlTokens,
    raw: usage,
  };
}

export function computeGeminiFlashLiteCost(
  usage: UsageDetail | undefined,
  rates = GEMINI_FLASH_LITE_RATES,
): CostDetail | undefined {
  if (!usage) return undefined;

  const input = (usage.inputTokens ?? 0) * rates.inputPerToken;
  const output = (usage.outputTokens ?? 0) * rates.outputPerToken;
  const url = (usage.urlTokens ?? 0) * rates.inputPerToken;

  const usd: CurrencyCost = {
    input,
    output,
    url,
    total: input + output + url,
  };

  const cny: CurrencyCost = {
    input: usd.input * rates.usdToCny,
    output: usd.output * rates.usdToCny,
    url: usd.url * rates.usdToCny,
    total: usd.total * rates.usdToCny,
  };

  return {
    usd,
    cny,
    rates: {
      usdPerToken: {
        input: rates.inputPerToken,
        output: rates.outputPerToken,
        url: rates.inputPerToken,
      },
      usdToCny: rates.usdToCny,
    },
  };
}
