import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin (esp. the auth submodule, added in the multi-tenant
  // refactor) loads some of its own files dynamically. Marking it external
  // stops Next from bundling/transforming it, but Vercel's output-file
  // tracer still decides which files get physically copied into each
  // route's deployed function - and it was missing some of firebase-admin's
  // own files, causing "Failed to load external module firebase-admin-..."
  // at runtime (empty 500s) on every route, including ones that don't even
  // use auth, since they all import the same shared module. Confirmed via
  // Vercel's runtime logs - never reproduced locally, since `next start`
  // runs against the full node_modules with no tracing involved.
  serverExternalPackages: ["firebase-admin"],
  // firebase-admin's auth stack pulls in a deep, hard-to-enumerate
  // transitive dependency tree (google-auth-library, jsonwebtoken,
  // jwks-rsa, and everything those depend on) - rather than guess which
  // specific files the tracer misses, include node_modules wholesale for
  // every route that goes through firebase-admin.
  outputFileTracingIncludes: {
    "/*": ["node_modules/**/*"],
  },
};

export default nextConfig;
