import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { EntityButtonAction } from "./actions/entity-button.js";
import { SettingsAction } from "./actions/settings.js";
import { haConnection } from "./homeassistant/connection.js";

// Set logger level to DEBUG
streamDeck.logger.setLevel(LogLevel.DEBUG);

const logger = streamDeck.logger.createScope("Plugin");

// Track connection attempts
let connectionAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// Store current connection config for retries
let currentConfig: { url: string; token: string } | null = null;

/**
 * Connect to Home Assistant with retry logic
 */
async function connectToHA(url: string, token: string): Promise<void> {
  try {
    await haConnection.connect({ url, token });
    connectionAttempts = 0;
    logger.info("Connected to Home Assistant");
  } catch (error) {
    connectionAttempts++;
    logger.error(`Connection failed (attempt ${connectionAttempts}):`, error);

    if (connectionAttempts < MAX_RETRIES) {
      logger.info(`Retrying in ${RETRY_DELAY / 1000}s...`);
      setTimeout(() => connectToHA(url, token), RETRY_DELAY);
    } else {
      logger.error(`Max retries (${MAX_RETRIES}) reached. Giving up.`);
    }
  }
}

// Subscribe to connection state changes
haConnection.subscribeToConnection((state) => {
  if (state.connected) {
    logger.info("Connection state: Connected");
  } else {
    logger.info(`Connection state: Disconnected${state.error ? ` - ${state.error}` : ""}`);

    // Attempt to reconnect if we have config and haven't exhausted retries
    if (currentConfig && connectionAttempts < MAX_RETRIES && connectionAttempts > 0) {
      logger.info(`Attempting reconnection...`);
      setTimeout(() => {
        if (currentConfig) {
          connectToHA(currentConfig.url, currentConfig.token);
        }
      }, RETRY_DELAY);
    }
  }
});

// Register actions
streamDeck.actions.registerAction(new EntityButtonAction());
streamDeck.actions.registerAction(new SettingsAction());

// Listen for global settings and connect to HA
streamDeck.settings.onDidReceiveGlobalSettings<{
  haUrl?: string;
  haToken?: string;
}>((ev) => {
  const { haUrl, haToken } = ev.settings;

  logger.info(`Received global settings, haUrl: ${haUrl ? "set" : "not set"}, haToken: ${haToken ? "set" : "not set"}`);

  if (haUrl && haToken) {
    // Disconnect if already connected
    if (haConnection.isConnected()) {
      logger.info("Disconnecting from previous Home Assistant connection");
      haConnection.disconnect();
    }

    // Reset connection attempts when settings change
    connectionAttempts = 0;
    currentConfig = { url: haUrl, token: haToken };

    // Connect to Home Assistant with retry logic
    logger.info(`Connecting to Home Assistant at ${haUrl}`);
    connectToHA(haUrl, haToken);
  }
});

// Request global settings on startup
streamDeck.settings.getGlobalSettings();

// Connect to Stream Deck
streamDeck.connect();
