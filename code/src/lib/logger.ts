import pino from 'pino'

export const logger = pino(
  { level: process.env.LOG_LEVEL ?? 'info' },
  pino.transport({
    targets: [
      { target: 'pino/file', options: { destination: 1 } }, // stdout
      { target: 'pino/file', options: { destination: './logs/app.log', mkdir: true, append: true } },
    ],
  }),
)
