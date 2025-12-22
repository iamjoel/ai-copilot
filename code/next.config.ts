const { codeInspectorPlugin } = require('code-inspector-plugin')

import type { NextConfig } from "next";

const allowedDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    rules: codeInspectorPlugin({
      bundler: 'turbopack'
    })
  },
  // experimental: {
  //   ...(allowedDevOrigins?.length ? { allowedDevOrigins } : {}),
  // },
};

export default nextConfig;
