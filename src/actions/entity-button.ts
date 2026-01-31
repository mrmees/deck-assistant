import streamDeck, {
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
  DidReceiveSettingsEvent,
  SendToPluginEvent,
  JsonValue,
  JsonObject,
  KeyAction,
} from "@elgato/streamdeck";
import { haConnection } from "../homeassistant/connection.js";
import { HAEntity, ConnectionState } from "../homeassistant/types.js";
import { EntityButtonSettings, defaultEntityButtonSettings } from "./types.js";
import { renderIcon, getDefaultIconForDomain, isStateOn } from "../icons/index.js";

const logger = streamDeck.logger.createScope("EntityButtonAction");

// Map to track entity subscriptions per action context
const contextSubscriptions = new Map<string, () => void>();

// Map to track connection subscriptions per action context
const connectionSubscriptions = new Map<string, () => void>();

// Map to track active actions for reconnection updates
const activeActions = new Map<string, { action: KeyAction<EntityButtonSettings>; settings: EntityButtonSettings }>();

/**
 * Action that controls Home Assistant entities from Stream Deck buttons
 */
export class EntityButtonAction extends SingletonAction<EntityButtonSettings> {
  /**
   * The UUID from the manifest that identifies this action
   */
  override readonly manifestId = "com.homeassistant.streamdeck.entity-button";

  /**
   * Called when the action appears on the Stream Deck
   */
  override async onWillAppear(ev: WillAppearEvent<EntityButtonSettings>): Promise<void> {
    const settings = { ...defaultEntityButtonSettings, ...ev.payload.settings } as EntityButtonSettings;
    const context = ev.action.id;
    const action = ev.action as KeyAction<EntityButtonSettings>;

    logger.debug(`Entity button appeared: ${context}, entityId: ${settings.entityId}`);

    // Store the action for reconnection updates
    activeActions.set(context, { action, settings });

    // Check if connected, show disconnected state if not
    if (!haConnection.isConnected()) {
      await this.showDisconnectedState(action);
    }

    // Subscribe to connection state changes
    const connectionUnsubscribe = haConnection.subscribeToConnection(async (state: ConnectionState) => {
      if (!state.connected) {
        await this.showDisconnectedState(action);
      } else {
        // Reconnected - refresh button appearance
        if (settings.entityId) {
          const entity = haConnection.getEntity(settings.entityId);
          if (entity) {
            await this.updateButtonAppearance(action, entity, settings);
          }
        }
      }
    });
    connectionSubscriptions.set(context, connectionUnsubscribe);

    // Subscribe to entity updates
    if (settings.entityId) {
      const unsubscribe = haConnection.subscribeToEntities((entities) => {
        const entity = entities[settings.entityId];
        if (entity) {
          this.updateButtonAppearance(action, entity, settings);
        }
      });

      contextSubscriptions.set(context, unsubscribe);

      // Initial update if entity is already available
      const entity = haConnection.getEntity(settings.entityId);
      if (entity) {
        this.updateButtonAppearance(action, entity, settings);
      }
    }
  }

  /**
   * Called when the action disappears from the Stream Deck
   */
  override async onWillDisappear(ev: WillDisappearEvent<EntityButtonSettings>): Promise<void> {
    const context = ev.action.id;

    logger.debug(`Entity button disappeared: ${context}`);

    // Unsubscribe from entity updates
    const entityUnsubscribe = contextSubscriptions.get(context);
    if (entityUnsubscribe) {
      entityUnsubscribe();
      contextSubscriptions.delete(context);
    }

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
   * Called when the key is pressed
   */
  override async onKeyDown(ev: KeyDownEvent<EntityButtonSettings>): Promise<void> {
    const settings = { ...defaultEntityButtonSettings, ...ev.payload.settings } as EntityButtonSettings;

    logger.debug(`Key pressed for entity: ${settings.entityId}, action: ${settings.action}`);

    if (!settings.entityId && settings.action !== "call_service") {
      logger.warn("No entity configured for this button");
      await ev.action.showAlert();
      return;
    }

    if (!haConnection.isConnected()) {
      logger.warn("Not connected to Home Assistant");
      await ev.action.showAlert();
      return;
    }

    try {
      await this.executeAction(settings);
      await ev.action.showOk();
    } catch (error) {
      logger.error(`Failed to execute action: ${error}`);
      await ev.action.showAlert();
    }
  }

  /**
   * Called when settings are updated from the Property Inspector
   */
  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<EntityButtonSettings>): Promise<void> {
    const settings = { ...defaultEntityButtonSettings, ...ev.payload.settings } as EntityButtonSettings;
    const context = ev.action.id;
    const action = ev.action as KeyAction<EntityButtonSettings>;

    logger.debug(`Settings updated for: ${context}, entityId: ${settings.entityId}`);

    // Update stored settings for reconnection updates
    activeActions.set(context, { action, settings });

    // Unsubscribe from previous entity
    const oldUnsubscribe = contextSubscriptions.get(context);
    if (oldUnsubscribe) {
      oldUnsubscribe();
      contextSubscriptions.delete(context);
    }

    // Check if connected, show disconnected state if not
    if (!haConnection.isConnected()) {
      await this.showDisconnectedState(action);
      return;
    }

    // Subscribe to new entity
    if (settings.entityId) {
      const unsubscribe = haConnection.subscribeToEntities((entities) => {
        const entity = entities[settings.entityId];
        if (entity) {
          this.updateButtonAppearance(action, entity, settings);
        }
      });

      contextSubscriptions.set(context, unsubscribe);

      // Initial update
      const entity = haConnection.getEntity(settings.entityId);
      if (entity) {
        this.updateButtonAppearance(action, entity, settings);
      }
    }
  }

  /**
   * Called when the Property Inspector sends a message to the plugin
   */
  override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, EntityButtonSettings>): Promise<void> {
    const payload = ev.payload as JsonObject;
    const event = payload?.event as string | undefined;

    logger.debug(`Received message from PI: ${event}`);

    if (event === "connect") {
      // Property Inspector is requesting connection - wait for connection to complete
      logger.debug("PI requested connect, checking connection status...");

      // If already connected, send status immediately
      if (haConnection.isConnected()) {
        logger.debug("Already connected, sending entities");
        await streamDeck.ui.current?.sendToPropertyInspector({
          event: "connectionStatus",
          connected: true,
        });
        await this.sendEntitiesToPropertyInspector();
        return;
      }

      // Not connected yet - wait for connection (with timeout)
      // The global settings handler in plugin.ts should trigger the connection
      logger.debug("Not connected yet, waiting for connection...");

      const maxWaitTime = 10000; // 10 seconds
      const checkInterval = 500; // Check every 500ms
      let waited = 0;

      const waitForConnection = async (): Promise<void> => {
        while (waited < maxWaitTime) {
          if (haConnection.isConnected()) {
            logger.debug("Connection established!");
            await streamDeck.ui.current?.sendToPropertyInspector({
              event: "connectionStatus",
              connected: true,
            });
            await this.sendEntitiesToPropertyInspector();
            return;
          }
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waited += checkInterval;
        }

        // Timeout - send failure
        logger.debug("Connection timeout");
        await streamDeck.ui.current?.sendToPropertyInspector({
          event: "connectionStatus",
          connected: false,
          error: "Connection timeout - check URL and token",
        });
      };

      await waitForConnection();

    } else if (event === "getEntities") {
      // Property Inspector is requesting entity list
      if (haConnection.isConnected()) {
        await this.sendEntitiesToPropertyInspector();
      }
    }
  }

  /**
   * Update the button appearance based on entity state
   */
  private async updateButtonAppearance(
    action: KeyAction<EntityButtonSettings>,
    entity: HAEntity,
    settings: EntityButtonSettings
  ): Promise<void> {
    const { appearance } = settings;

    // Determine if the entity is "on"
    const domain = entity.entity_id.split(".")[0];
    const isOn = isStateOn(entity.state, domain);

    // Determine which icon to use
    let iconName: string;
    if (appearance.iconSource === "mdi" && appearance.mdiIcon) {
      iconName = appearance.mdiIcon;
    } else if (appearance.iconSource === "auto" && entity.attributes.icon) {
      // Use entity's icon attribute (e.g., "mdi:lightbulb")
      iconName = entity.attributes.icon as string;
    } else {
      // Use default icon for domain
      iconName = getDefaultIconForDomain(domain);
    }

    // Determine colors based on state
    const iconColor = isOn ? appearance.iconColorOn : appearance.iconColorOff;
    const backgroundColor = isOn
      ? (appearance.backgroundColorOn || appearance.backgroundColor)
      : (appearance.backgroundColorOff || appearance.backgroundColor);

    // Build title and state text for rendering
    const titleText = appearance.showTitle
      ? (appearance.titleOverride || entity.attributes.friendly_name || entity.entity_id)
      : undefined;

    const stateText = appearance.showState ? this.formatState(entity) : undefined;

    // Render the icon
    try {
      const imageData = await renderIcon(iconName, {
        size: 144, // Stream Deck XL uses 144x144, standard uses 72x72
        iconColor,
        backgroundColor,
        title: titleText,
        titlePosition: appearance.titlePosition,
        state: stateText,
        statePosition: appearance.statePosition,
      });

      // Set the image on the button
      await action.setImage(imageData);

      // Clear the title since it's rendered in the image
      await action.setTitle("");
    } catch (error) {
      logger.error(`Failed to render icon: ${error}`);

      // Fallback to text-only display
      let title = "";
      if (appearance.showState) {
        const formattedState = this.formatState(entity);
        if (appearance.statePosition === "top") {
          title = formattedState;
        }
      }

      if (appearance.showTitle) {
        const displayTitle = appearance.titleOverride || entity.attributes.friendly_name || entity.entity_id;
        if (appearance.titlePosition === "bottom") {
          if (title) {
            title += "\n" + displayTitle;
          } else {
            title = displayTitle;
          }
        } else {
          if (title) {
            title = displayTitle + "\n" + title;
          } else {
            title = displayTitle;
          }
        }
      }

      if (appearance.showState && appearance.statePosition === "bottom") {
        const formattedState = this.formatState(entity);
        if (title) {
          title += "\n" + formattedState;
        } else {
          title = formattedState;
        }
      }

      await action.setTitle(title);
    }
  }

  /**
   * Show disconnected state on a button
   */
  private async showDisconnectedState(action: KeyAction<EntityButtonSettings>): Promise<void> {
    try {
      // Render a disconnected icon
      const imageData = await renderIcon("wifi-off", {
        size: 144,
        iconColor: "#FF4444",
        backgroundColor: "#333333",
        title: "Not",
        titlePosition: "top",
        state: "Connected",
        statePosition: "bottom",
      });

      await action.setImage(imageData);
      await action.setTitle("");
    } catch (error) {
      logger.error(`Failed to render disconnected state: ${error}`);
      // Fallback to text-only
      await action.setTitle("Not\nConnected");
    }
  }

  /**
   * Execute the configured action
   */
  private async executeAction(settings: EntityButtonSettings): Promise<void> {
    const { entityId, action, serviceData } = settings;

    if (action === "none") {
      return;
    }

    if (action === "call_service" && serviceData) {
      // Custom service call
      await haConnection.callService(
        serviceData.domain,
        serviceData.service,
        serviceData.data as Record<string, unknown>,
        entityId ? { entity_id: entityId } : undefined
      );
      return;
    }

    // Get the domain from the entity ID
    const domain = entityId.split(".")[0];

    // Determine the service to call based on domain and action
    let serviceDomain = domain;
    let service: string = action;

    // Handle special domains
    switch (domain) {
      case "light":
      case "switch":
      case "fan":
      case "input_boolean":
      case "automation":
      case "script":
      case "humidifier":
      case "water_heater":
        // These domains support toggle, turn_on, turn_off directly
        if (domain === "script" && action === "toggle") {
          // Scripts don't have toggle, use turn_on
          service = "turn_on";
        }
        break;

      case "cover":
        // Covers use open_cover, close_cover, toggle
        if (action === "turn_on") {
          service = "open_cover";
        } else if (action === "turn_off") {
          service = "close_cover";
        } else if (action === "toggle") {
          service = "toggle";
        }
        break;

      case "lock":
        // Locks use lock, unlock
        if (action === "turn_on") {
          service = "lock";
        } else if (action === "turn_off") {
          service = "unlock";
        } else if (action === "toggle") {
          // Toggle based on current state
          const entity = haConnection.getEntity(entityId);
          if (entity) {
            service = entity.state === "locked" ? "unlock" : "lock";
          } else {
            service = "lock";
          }
        }
        break;

      case "media_player":
        // Media players have various services
        if (action === "toggle") {
          service = "toggle";
        } else if (action === "turn_on") {
          service = "turn_on";
        } else if (action === "turn_off") {
          service = "turn_off";
        }
        break;

      case "climate":
        // Climate entities use set_hvac_mode or turn_on/turn_off
        if (action === "turn_on") {
          service = "turn_on";
        } else if (action === "turn_off") {
          service = "turn_off";
        } else if (action === "toggle") {
          // Toggle based on current state
          const entity = haConnection.getEntity(entityId);
          if (entity) {
            service = entity.state === "off" ? "turn_on" : "turn_off";
          } else {
            service = "turn_on";
          }
        }
        break;

      case "scene":
        // Scenes only support turn_on
        service = "turn_on";
        break;

      case "vacuum":
        // Vacuums use start, stop, return_to_base
        if (action === "turn_on") {
          service = "start";
        } else if (action === "turn_off") {
          service = "return_to_base";
        } else if (action === "toggle") {
          const entity = haConnection.getEntity(entityId);
          if (entity) {
            service = entity.state === "cleaning" ? "return_to_base" : "start";
          } else {
            service = "start";
          }
        }
        break;

      default:
        // For other domains, use homeassistant domain
        serviceDomain = "homeassistant";
        break;
    }

    await haConnection.callService(serviceDomain, service, undefined, { entity_id: entityId });
  }

  /**
   * Format the entity state for display
   */
  private formatState(entity: HAEntity): string {
    const { state, attributes } = entity;

    // Add unit of measurement if available
    if (attributes.unit_of_measurement) {
      return `${state}${attributes.unit_of_measurement}`;
    }

    // Capitalize on/off states
    if (state === "on" || state === "off") {
      return state.charAt(0).toUpperCase() + state.slice(1);
    }

    // Capitalize other common states
    const capitalizedStates = ["unavailable", "unknown", "idle", "playing", "paused"];
    if (capitalizedStates.includes(state.toLowerCase())) {
      return state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
    }

    return state;
  }

  /**
   * Send entities and areas to the Property Inspector
   */
  private async sendEntitiesToPropertyInspector(): Promise<void> {
    const entities = haConnection.getAllEntities();
    const areas = haConnection.getAreas();
    const entityRegistry = haConnection.getEntityRegistry();

    // Build entity list with area information
    const entityList = Object.values(entities).map((entity) => {
      const registryEntry = entityRegistry.find((e) => e.entity_id === entity.entity_id);
      const area = registryEntry?.area_id
        ? areas.find((a) => a.area_id === registryEntry.area_id)
        : undefined;

      return {
        entity_id: entity.entity_id,
        friendly_name: entity.attributes.friendly_name || entity.entity_id,
        state: entity.state,
        domain: entity.entity_id.split(".")[0],
        area_id: registryEntry?.area_id,
        area_name: area?.name,
      };
    });

    // Sort entities by friendly name
    entityList.sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));

    await streamDeck.ui.current?.sendToPropertyInspector({
      event: "entities",
      entities: entityList,
      areas: areas.map((a) => ({ area_id: a.area_id, name: a.name })),
    });
  }
}
