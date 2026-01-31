import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";

export default {
  input: "src/plugin.ts",
  output: {
    file: "com.homeassistant.streamdeck.sdPlugin/bin/plugin.js",
    format: "esm",
    sourcemap: true,
  },
  plugins: [
    resolve({
      preferBuiltins: true,
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: "./tsconfig.json",
      outputToFilesystem: true,
    }),
  ],
  external: [
    // Node.js built-in modules
    "fs",
    "path",
    "os",
    "url",
    "util",
    "events",
    "stream",
    "http",
    "https",
    "crypto",
    "buffer",
    "child_process",
    "net",
    "tls",
    "zlib",
    "assert",
    "querystring",
    "string_decoder",
    // Node.js modules with node: prefix
    "node:fs",
    "node:path",
    "node:os",
    "node:url",
    "node:util",
    "node:events",
    "node:stream",
    "node:http",
    "node:https",
    "node:crypto",
    "node:buffer",
    "node:child_process",
    "node:net",
    "node:tls",
    "node:zlib",
    "node:assert",
    "node:querystring",
    "node:string_decoder",
  ],
};
