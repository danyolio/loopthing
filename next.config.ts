import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@hocuspocus/server",
    "@hocuspocus/extension-redis",
    "ioredis",
    "ws",
    "yjs",
  ],
};

export default withWorkflow(nextConfig);
