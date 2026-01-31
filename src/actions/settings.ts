import streamDeck, {
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
  SendToPluginEvent,
  JsonValue,
  JsonObject,
  KeyAction,
} from "@elgato/streamdeck";
import { haConnection } from "../homeassistant/connection.js";
import { ConnectionState } from "../homeassistant/types.js";
import { renderIcon } from "../icons/index.js";

const logger = streamDeck.logger.createScope("SettingsAction");

// Settings for the Settings action (minimal - just for display)
interface SettingsActionSettings {
  [key: string]: JsonValue; // Required for JsonObject compatibility
}

// Map to track connection subscriptions per action context
const connectionSubscriptions = new Map<string, () => void>();

// Map to track active actions for state updates
const activeActions = new Map<string, KeyAction<SettingsActionSettings>>();

/**
 * Action that displays connection status and provides access to plugin settings
 */
export class SettingsAction extends SingletonAction<SettingsActionSettings> {
  /**
   * The UUID from the manifest that identifies this action
   */
  override readonly manifestId = "com.deckassistant.settings";

  /**
   * Called when the action appears on the Stream Deck
   */
  override async onWillAppear(ev: WillAppearEvent<SettingsActionSettings>): Promise<void> {
    const context = ev.action.id;
    const action = ev.action as KeyAction<SettingsActionSettings>;

    logger.debug(`Settings button appeared: ${context}`);

    // Store the action for updates
    activeActions.set(context, action);

    // Update button to show current connection state
    await this.updateButtonAppearance(action, haConnection.isConnected());

    // Subscribe to connection state changes
    const connectionUnsubscribe = haConnection.subscribeToConnection(async (state: ConnectionState) => {
      await this.updateButtonAppearance(action, state.connected);
    });
    connectionSubscriptions.set(context, connectionUnsubscribe);
  }

  /**
   * Called when the action disappears from the Stream Deck
   */
  override async onWillDisappear(ev: WillDisappearEvent<SettingsActionSettings>): Promise<void> {
    const context = ev.action.id;

    logger.debug(`Settings button disappeared: ${context}`);

    // Unsubscribe from connection updates
    const connectionUnsubscribe = connectionSubscriptions.get(context);
    if (connectionUnsubscribe) {
      connectionUnsubscribe();
      connectionSubscriptions.delete(context);
    }

    // Remove from active actions
    activeActions.delete(context);
  }

  /**
   * Called when the key is pressed - opens the Property Inspector
   */
  override async onKeyDown(ev: KeyDownEvent<SettingsActionSettings>): Promise<void> {
    logger.debug("Settings button pressed");
    // The key press doesn't need to do anything - the PI opens when configuring
    // Just show OK to indicate the button works
    await ev.action.showOk();
  }

  /**
   * Called when the Property Inspector sends a message to the plugin
   */
  override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, SettingsActionSettings>): Promise<void> {
    const payload = ev.payload as JsonObject;
    const event = payload?.event as string | undefined;

    logger.debug(`Received message from Settings PI: ${event}`);

    if (event === "getStatus") {
      // Send current connection status
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "connectionStatus",
        connected: haConnection.isConnected(),
      });
    } else if (event === "connect") {
      // Property Inspector is requesting connection status after saving credentials
      logger.debug("Settings PI requested connect status");

      // Wait for connection with timeout
      const maxWaitTime = 10000;
      const checkInterval = 500;
      let waited = 0;

      while (waited < maxWaitTime) {
        if (haConnection.isConnected()) {
          logger.debug("Connection established!");
          await streamDeck.ui.current?.sendToPropertyInspector({
            event: "connectionStatus",
            connected: true,
          });
          return;
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }

      // Timeout
      logger.debug("Connection timeout");
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "connectionStatus",
        connected: false,
        error: "Connection timeout - check URL and token",
      });
    } else if (event === "disconnect") {
      // Disconnect from Home Assistant
      logger.debug("Settings PI requested disconnect");
      haConnection.disconnect();
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "connectionStatus",
        connected: false,
      });
    }
  }

  /**
   * Update the button appearance based on connection state
   */
  private async updateButtonAppearance(
    action: KeyAction<SettingsActionSettings>,
    isConnected: boolean
  ): Promise<void> {
    try {
      const imageData = await renderIcon(isConnected ? "home-assistant" : "home-off-outline", {
        size: 144,
        iconColor: isConnected ? "#41BDF5" : "#FF4444",
        backgroundColor: "#1C1C1C",
        title: "Home",
        titlePosition: "top",
        state: isConnected ? "Connected" : "Disconnected",
        statePosition: "bottom",
      });

      await action.setImage(imageData);
      await action.setTitle("");
    } catch (error) {
      logger.error(`Failed to render settings icon: ${error}`);
      await action.setTitle(isConnected ? "Connected" : "Disconnected");
    }
  }
}
