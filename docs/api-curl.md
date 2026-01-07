```md
# cURL recipes for the API

This page collects reusable `curl` commands for talking directly to the project APIs while the Next.js server (`pnpm dev`) is running on `http://localhost:3000`.

## Prerequisites
1. Start the app with `pnpm dev` from `/code`.
2. Confirm you are hitting the same port in the examples below (`localhost:3000` is the default; change it if you override `PORT`).

## Completions endpoint (`POST /api/completions`)
1. All requests must include `prompt`, `model`, `config`, and `tools`.
2. Valid model keys are defined in [`code/src/lib/model-presets.ts`](code/src/lib/model-presets.ts) as `MODEL_GROUPS`. Pick one of the `value` entries (for example `gemini-2.5-flash`, `claude-sonnet-4-5`, or `gpt-5.1`).

```bash
curl http://localhost:3000/api/completions \
  --header "Content-Type: application/json" \
  --data '{
    "prompt": "Summarize the benefits of pair programming.",
    "model": "gpt-5.1",
    "config": {
      "applyOutputRules": true,
      "language": "English"
    },
    "tools": {
      "browseWeb": false,
      "googleSearch": false
    }
  }' \
  --no-buffer
```

- `applyOutputRules` adds the shared output-rule boilerplate; omit it or set it to `false` for a plain prompt.
- `tools` controls optional Gemini helpers (`browseWeb`/`googleSearch`). Leave them `false` unless you plan to stream external tool use.
- The server streams `UIMessage` chunks, so `curl` may hang while data flows. Use `--no-buffer` to see chunks as they arrive, or pipe through `jq .` once the stream finishes.

## Chat endpoint (`POST /api/chat`)
1. Send a `messages` array with the same shape the frontend uses (`UIMessage` objects containing `id`, `role`, and `content` entries).

```bash
curl http://localhost:3000/api/chat \
  --header "Content-Type: application/json" \
  --data '{
    "messages": [
      {
        "id": "1",
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Give me three quick tips for debugging React hooks."
          }
        ]
      }
    ]
  }' \
  --no-buffer
```

- The chat route wraps the `list_directory` tool. Mentioning files or directories in the prompt triggers a repository inspection response.
- Responses stream back via `UIMessage` chunks just like completions.

## Batch image generation (`POST /api/image/batch`)
1. Requires `GOOGLE_GENERATIVE_AI_API_KEY` in your `.env.local`.
2. Reads prompts from `src/data/image-batch/requests.csv` (create directories with `mkdir -p src/data/image-batch outputs/image-batch` if needed).
3. CSV must include at least the header columns `input`, `output`, `status`, and `error`; every row should set `input` to the prompt and leave the rest blank.

```bash
curl http://localhost:3000/api/image/batch \
  --header "Content-Type: application/json" \
  --data '{
    "inputFile": "requests.csv",
    "n": 3
  }'
```

- `inputFile` is the CSV file name under `src/data/image-batch/`; omit to default to `requests.csv`.
- `n` limits how many rows to process in one request; leave it out to run all pending rows.
- Generated PNGs land in `outputs/image-batch/`; the response lists `processed`, `skipped`, `total`, and the CSV path that was used.

## Batch video generation (`POST /api/video/batch`)
1. Also needs `GOOGLE_GENERATIVE_AI_API_KEY`.
2. Uses `src/data/video-batch/requests.csv` with the same header columns (`input`, `output`, `status`, `error`).
3. Outputs `mp4` files to `outputs/video-batch/` and writes the relative paths back into the CSV.

```bash
curl http://localhost:3000/api/video/batch \
  --header "Content-Type: application/json" \
  --data '{
    "n": 2
  }'
```

batch all:
```
curl http://localhost:3000/api/video/batch \
  --header "Content-Type: application/json" \
  --data '{
  }'
```

- Video generation may take longer because the route polls the operation status every 10 seconds; expect minutes per item depending on latency.
- Each row is updated with `status=done`/`error` and `output` pointing to the saved file; rerun the endpoint to skip already-processed rows.

## Tips
- If you need to test other models, refer to `MODEL_PRESETS`/`MODEL_GROUPS` in `code/src/lib/model-presets.ts` before sending `model`.
- Use a local `curl` script or `sh` function to avoid retyping headers on every request, especially when experimenting with `tools` flags.
