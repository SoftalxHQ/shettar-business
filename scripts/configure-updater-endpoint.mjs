#!/usr/bin/env node
/**
 * Rewrites plugins.updater.endpoints in src-tauri/tauri.conf.json based on
 * NEXT_PUBLIC_APP_ENV (staging → api.stg, otherwise production → api-v1).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const confPath = resolve(__dirname, "../src-tauri/tauri.conf.json");
const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || process.env.APP_ENV || "production").toLowerCase();
const isStaging = appEnv === "staging";

const apiBase = isStaging
  ? "https://api.stg.shettar.com"
  : process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "https://api-v1.shettar.com";
const channel = isStaging ? "staging" : "production";

const endpoint = `${apiBase}/api/v1/updates/{{target}}/{{arch}}/{{current_version}}?channel=${channel}`;

const conf = JSON.parse(readFileSync(confPath, "utf8"));
conf.plugins = conf.plugins || {};
conf.plugins.updater = conf.plugins.updater || {};
conf.plugins.updater.endpoints = [endpoint];

writeFileSync(confPath, `${JSON.stringify(conf, null, 2)}\n`);
console.log(`[configure-updater] endpoints → ${endpoint}`);
