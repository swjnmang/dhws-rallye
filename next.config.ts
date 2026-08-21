import type { NextConfig } from "next";

// firebase-admin's auth stack (added in the multi-tenant refactor) loads
// some of its own files dynamically. Marking it external stops Next from
// bundling/transforming it, but Vercel's output-file tracer still decides
// what actually gets copied into each route's deployed function - and it
// was missing files firebase-admin's dependency tree needs at runtime,
// causing "Failed to load external module firebase-admin-..." (empty 500s)
// on every route in production, confirmed via Vercel's runtime logs. Never
// reproduced locally since `next start` runs against the full node_modules
// with no tracing involved.
//
// This is firebase-admin's complete transitive dependency closure (~25MB),
// resolved once via a script walking node_modules/*/package.json - a
// blanket `node_modules/**/*` include also fixes it but bloats every
// function with the full ~600MB node_modules folder, which blew Vercel's
// function size limit and failed the build outright.
const FIREBASE_ADMIN_DEPS = [
  "@fastify/busboy",
  "@firebase/app-check-interop-types",
  "@firebase/app-types",
  "@firebase/auth-interop-types",
  "@firebase/component",
  "@firebase/database",
  "@firebase/database-compat",
  "@firebase/database-types",
  "@firebase/logger",
  "@firebase/util",
  "@types/jsonwebtoken",
  "@types/ms",
  "@types/node",
  "agent-base",
  "base64-js",
  "bignumber.js",
  "buffer-equal-constant-time",
  "debug",
  "ecdsa-sig-formatter",
  "extend",
  "fast-deep-equal",
  "faye-websocket",
  "firebase-admin",
  "gaxios",
  "gcp-metadata",
  "google-auth-library",
  "google-logging-utils",
  "http-parser-js",
  "https-proxy-agent",
  "is-stream",
  "jose",
  "json-bigint",
  "jsonwebtoken",
  "jwa",
  "jwks-rsa",
  "jws",
  "limiter",
  "lodash.clonedeep",
  "lodash.includes",
  "lodash.isboolean",
  "lodash.isinteger",
  "lodash.isnumber",
  "lodash.isplainobject",
  "lodash.isstring",
  "lodash.once",
  "lru-cache",
  "lru-memoizer",
  "ms",
  "node-fetch",
  "safe-buffer",
  "semver",
  "tr46",
  "tslib",
  "undici-types",
  "uuid",
  "webidl-conversions",
  "websocket-driver",
  "websocket-extensions",
  "whatwg-url",
  "yallist",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  outputFileTracingIncludes: {
    "/*": FIREBASE_ADMIN_DEPS.map((pkg) => `node_modules/${pkg}/**/*`),
  },
};

export default nextConfig;
