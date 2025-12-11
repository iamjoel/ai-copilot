// https://www.prisma.io/docs/getting-started/prisma-postgres/quickstart/prisma-orm
// 迁移 npx prisma migrate dev --name xxx
// npx prisma generate
import 'dotenv/config'
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
