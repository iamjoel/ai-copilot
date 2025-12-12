import { extractParkText } from "./park-info";
import { transformParkTextToJson } from "./park-info-to-json";

const extractFromWiki = async (parkName: string, wikiUrl: string) => {
  const {
    text,
    textUsage,
    textDurationSec,
  } = await extractParkText(parkName, wikiUrl);

  const {
    jsonResult,
    jsonUsage,
    jsonDurationSec
  } = await transformParkTextToJson(text, wikiUrl);

  return {
    text,
    usagePage: {
      inputTokens: (textUsage?.inputTokens ?? 0) + (jsonUsage?.inputTokens ?? 0),
      outputTokens: (textUsage?.outputTokens ?? 0) + (jsonUsage?.outputTokens ?? 0),
      totalTokens: (textUsage?.totalTokens ?? 0) + (jsonUsage?.totalTokens ?? 0),
      urlTokens: (textUsage?.urlTokens ?? 0) + (jsonUsage?.urlTokens ?? 0),
    },
    durationSec: textDurationSec + jsonDurationSec,
    jsonResult,
  }
}

export default extractFromWiki;
