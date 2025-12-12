import pino, { StreamEntry } from "pino";

const streams: StreamEntry[] = [
  { stream: process.stdout },
  { stream: pino.destination({ dest: "./logs/app.log", mkdir: true }) },
];

export const logger = pino(
  { level: process.env.LOG_LEVEL ?? "info" },
  pino.multistream(streams),
);
