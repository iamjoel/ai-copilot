import { codeInspectorPlugin } from 'code-inspector-plugin'
import { withWorkflow } from "workflow/next"

import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    rules: codeInspectorPlugin({
      bundler: 'turbopack'
    })
  },
};

export default withWorkflow(nextConfig);
