import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin dynamically loads Node-specific code; bundling it can
  // cause issues, so it's excluded and required normally from node_modules
  // at runtime instead (Next.js's own recommended default for this
  // package). See package.json's "overrides" for the actual production
  // crash fix - jose 6 (pulled in transitively via jwks-rsa) is ESM-only
  // and broke `require('jose')` at runtime on Vercel with ERR_REQUIRE_ESM.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
