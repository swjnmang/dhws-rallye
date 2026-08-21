import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin (esp. the auth submodule) dynamically loads files that
  // Vercel's serverless output-file-tracing can miss, which silently broke
  // every API route in production (empty 500s) without ever reproducing
  // locally, since `next start` runs against the full node_modules folder
  // with no tracing/pruning involved. Marking it external skips bundling
  // it and just requires it normally from node_modules at runtime instead.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
