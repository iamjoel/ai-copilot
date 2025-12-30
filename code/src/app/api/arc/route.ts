import { buildArcRecord, readArcCsv, type ArcDatasetType } from "@/lib/arc-dataset";

const PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_MAX = 50;
const DATASET_TYPES: ArcDatasetType[] = ["ARC-Challenge", "ARC-Easy"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type")?.trim();
  const onlyWrong = searchParams.get("onlyWrong") === "true";
  const pageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSizeParam = Number.parseInt(searchParams.get("pageSize") ?? `${PAGE_SIZE_DEFAULT}`, 10);

  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const pageSize = Number.isNaN(pageSizeParam)
    ? PAGE_SIZE_DEFAULT
    : Math.min(Math.max(pageSizeParam, 1), PAGE_SIZE_MAX);

  const datasetType = DATASET_TYPES.includes(typeParam as ArcDatasetType)
    ? (typeParam as ArcDatasetType)
    : null;

  const all = datasetType
    ? loadDataset(datasetType)
    : [...loadDataset("ARC-Challenge"), ...loadDataset("ARC-Easy")];
  const filtered = onlyWrong ? all.filter(isWrongResult) : all;

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return new Response(JSON.stringify({ items, total, page, pageSize }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function loadDataset(datasetType: ArcDatasetType) {
  const { rows } = readArcCsv(datasetType);
  return rows.map(row => buildArcRecord(row, datasetType));
}

function isWrongResult(item: ReturnType<typeof buildArcRecord>) {
  const results = [
    item.qwenFlashResult,
    item.qwenPlusResult,
    item.qwen3MaxResult,
  ];
  return results.some(result => isWrongValue(result));
}

function isWrongValue(value: string | undefined) {
  if (!value) {
    return false;
  }
  return value.toLowerCase().includes("answer: wrong");
}
