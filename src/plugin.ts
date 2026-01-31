import streamDeck, { LogLevel } from "@elgato/streamdeck";

// Enable logging for debugging
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register actions
// Actions will be added in subsequent tasks

// Connect to Stream Deck
streamDeck.connect();
