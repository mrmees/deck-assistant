import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { EntityButtonAction } from "./actions/entity-button.js";
import { haConnection } from "./homeassistant/connection.js";

// Set logger level to DEBUG
streamDeck.logger.setLevel(LogLevel.DEBUG);

const logger = streamDeck.logger.createScope("Plugin");

// Register actions
streamDeck.actions.registerAction(new EntityButtonAction());

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

    // Connect to Home Assistant
    logger.info(`Connecting to Home Assistant at ${haUrl}`);
    haConnection.connect({ url: haUrl, token: haToken })
      .then(() => {
        logger.info("Successfully connected to Home Assistant");
      })
      .catch((error) => {
        logger.error(`Failed to connect to Home Assistant: ${error}`);
      });
  }
});

// Request global settings on startup
streamDeck.settings.getGlobalSettings();

// Connect to Stream Deck
streamDeck.connect();
