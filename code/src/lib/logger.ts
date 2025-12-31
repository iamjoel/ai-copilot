import pino, { StreamEntry } from "pino";
import pretty from "pino-pretty";

const prettyStream = pretty({
  colorize: true,
  customColors: "info:green,warn:yellow,error:red",
  useOnlyCustomProps: false,
  levelFirst: true,
  translateTime: "SYS:HH:MM:ss",
  ignore: "pid,hostname",
  customPrettifiers: {
    level: (_value, _key, _log, { labelColorized }) => labelColorized,
  },
});

const streams: StreamEntry[] = [
  { stream: prettyStream },
  // {
  //   level: "info",
  //   stream: pino.destination({ dest: "./logs/app.log", mkdir: true }),
  // },
  {
    level: "error",
    stream: pino.destination({ dest: "./logs/error.log", mkdir: true }),
  },
];

export const logger = pino(
  { level: process.env.LOG_LEVEL ?? "info" },
  pino.multistream(streams),
);
