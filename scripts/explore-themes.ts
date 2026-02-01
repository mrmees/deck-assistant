/**
 * Script to explore theme information available from Home Assistant
 */

import WebSocket from "ws";
import {
  createConnection,
  createLongLivedTokenAuth,
} from "home-assistant-js-websocket";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: resolve(__dirname, "../.env") });

// Polyfill WebSocket
(global as any).WebSocket = WebSocket;

async function exploreThemes() {
  const url = process.env.HA_URL?.replace(/\/$/, "") || "";
  const token = process.env.HA_TOKEN || "";

  if (!url || !token) {
    console.error("Missing HA_URL or HA_TOKEN in .env");
    process.exit(1);
  }

  console.log("Connecting to Home Assistant at:", url);

  const auth = createLongLivedTokenAuth(url, token);
  const connection = await createConnection({ auth });

  console.log("Connected!\n");

  // 1. Try to get frontend config (where themes are defined)
  console.log("=== Frontend Config ===");
  try {
    const frontendConfig = await connection.sendMessagePromise<any>({
      type: "frontend/get_themes",
    });
    console.log("Themes:", JSON.stringify(frontendConfig, null, 2));
  } catch (e: any) {
    console.log("frontend/get_themes error:", e.message);
  }

  // 2. Try to get user data (active theme preference)
  console.log("\n=== Current User Data ===");
  try {
    const userData = await connection.sendMessagePromise<any>({
      type: "frontend/get_user_data",
      key: "core",
    });
    console.log("User Core Data:", JSON.stringify(userData, null, 2));
  } catch (e: any) {
    console.log("frontend/get_user_data error:", e.message);
  }

  // 3. Try auth/current_user
  console.log("\n=== Current User ===");
  try {
    const currentUser = await connection.sendMessagePromise<any>({
      type: "auth/current_user",
    });
    console.log("Current User:", JSON.stringify(currentUser, null, 2));
  } catch (e: any) {
    console.log("auth/current_user error:", e.message);
  }

  // 4. Try to get HA config
  console.log("\n=== HA Config ===");
  try {
    const haConfig = await connection.sendMessagePromise<any>({
      type: "get_config",
    });
    // Filter to interesting fields
    const filtered = {
      location_name: haConfig.location_name,
      unit_system: haConfig.unit_system,
      version: haConfig.version,
      config_source: haConfig.config_source,
    };
    console.log("Config (filtered):", JSON.stringify(filtered, null, 2));
  } catch (e: any) {
    console.log("get_config error:", e.message);
  }

  // 5. Try to get panels (lovelace info)
  console.log("\n=== Panels ===");
  try {
    const panels = await connection.sendMessagePromise<any>({
      type: "get_panels",
    });
    // Just show panel names
    console.log("Available panels:", Object.keys(panels));
  } catch (e: any) {
    console.log("get_panels error:", e.message);
  }

  // 6. List available WebSocket message types that might be theme-related
  console.log("\n=== Exploring frontend/* messages ===");

  const messagesToTry = [
    "frontend/get_panels",
    "frontend/get_translations",
    "lovelace/config",
    "lovelace/dashboards/list",
  ];

  for (const msgType of messagesToTry) {
    try {
      const result = await connection.sendMessagePromise<any>({ type: msgType });
      if (msgType === "lovelace/dashboards/list") {
        console.log(`${msgType}:`, JSON.stringify(result, null, 2));
      } else {
        console.log(`${msgType}: OK (${typeof result === 'object' ? Object.keys(result).length + ' keys' : typeof result})`);
      }
    } catch (e: any) {
      console.log(`${msgType}: ${e.message}`);
    }
  }

  connection.close();
  console.log("\nDone!");
}

exploreThemes().catch(console.error);
