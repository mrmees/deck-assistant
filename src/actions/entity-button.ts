import streamDeck, {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
  DidReceiveSettingsEvent,
  SendToPluginEvent,
} from "@elgato/streamdeck";
import { haConnection } from "../homeassistant/connection.js";
import { HAEntity } from "../homeassistant/types.js";
import { EntityButtonSettings, defaultEntityButtonSettings } from "./types.js";

const logger = streamDeck.logger.createScope("EntityButtonAction");

// Map to track entity subscriptions per action context
const contextSubscriptions = new Map<string, () => void>();

@action({ UUID: "com.homeassistant.streamdeck.entity-button" })
export class EntityButtonAction extends SingletonAction<EntityButtonSettings> {
  /**
   * Called when the action appears on the Stream Deck
   */
  override async onWillAppear(ev: WillAppearEvent<EntityButtonSettings>): Promise<void> {
    const settings = { ...defaultEntityButtonSettings, ...ev.payload.settings };
    const context = ev.action.id;

    logger.debug(`Entity button appeared: ${context}, entityId: ${settings.entityId}`);

    // Subscribe to entity updates
    if (settings.entityId) {
      const unsubscribe = haConnection.subscribeToEntities((entities) => {
        const entity = entities[settings.entityId];
        if (entity) {
          this.updateButtonAppearance(ev, entity, settings);
        }
      });

      contextSubscriptions.set(context, unsubscribe);

      // Initial update if entity is already available
      const entity = haConnection.getEntity(settings.entityId);
      if (entity) {
        this.updateButtonAppearance(ev, entity, settings);
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
    const unsubscribe = contextSubscriptions.get(context);
    if (unsubscribe) {
      unsubscribe();
      contextSubscriptions.delete(context);
    }
  }

  /**
   * Called when the key is pressed
   */
  override async onKeyDown(ev: KeyDownEvent<EntityButtonSettings>): Promise<void> {
    const settings = { ...defaultEntityButtonSettings, ...ev.payload.settings };

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
    const settings = { ...defaultEntityButtonSettings, ...ev.payload.settings };
    const context = ev.action.id;

    logger.debug(`Settings updated for: ${context}, entityId: ${settings.entityId}`);

    // Unsubscribe from previous entity
    const oldUnsubscribe = contextSubscriptions.get(context);
    if (oldUnsubscribe) {
      oldUnsubscribe();
      contextSubscriptions.delete(context);
    }

    // Subscribe to new entity
    if (settings.entityId) {
      const unsubscribe = haConnection.subscribeToEntities((entities) => {
        const entity = entities[settings.entityId];
        if (entity) {
          this.updateButtonAppearance(ev, entity, settings);
        }
      });

      contextSubscriptions.set(context, unsubscribe);

      // Initial update
      const entity = haConnection.getEntity(settings.entityId);
      if (entity) {
        this.updateButtonAppearance(ev, entity, settings);
      }
    }
  }

  /**
   * Called when the Property Inspector sends a message to the plugin
   */
  override async onSendToPlugin(ev: SendToPluginEvent<Record<string, unknown>, EntityButtonSettings>): Promise<void> {
    const { event } = ev.payload;

    logger.debug(`Received message from PI: ${event}`);

    if (event === "connect") {
      // Property Inspector is requesting connection status
      const isConnected = haConnection.isConnected();
      await ev.action.sendToPropertyInspector({
        event: "connectionStatus",
        connected: isConnected,
      });

      if (isConnected) {
        await this.sendEntitiesToPropertyInspector(ev);
      }
    } else if (event === "getEntities") {
      // Property Inspector is requesting entity list
      if (haConnection.isConnected()) {
        await this.sendEntitiesToPropertyInspector(ev);
      }
    }
  }

  /**
   * Update the button appearance based on entity state
   */
  private async updateButtonAppearance(
    ev: WillAppearEvent<EntityButtonSettings> | DidReceiveSettingsEvent<EntityButtonSettings>,
    entity: HAEntity,
    settings: EntityButtonSettings
  ): Promise<void> {
    const { appearance } = settings;
    const isOn = this.isEntityOn(entity);

    // Build title based on settings
    let title = "";

    if (appearance.showState) {
      const stateText = this.formatState(entity);
      if (appearance.statePosition === "top") {
        title = stateText;
      }
    }

    if (appearance.showTitle) {
      const titleText = appearance.titleOverride || entity.attributes.friendly_name || entity.entity_id;
      if (appearance.titlePosition === "bottom") {
        if (title) {
          title += "\n" + titleText;
        } else {
          title = titleText;
        }
      } else {
        if (title) {
          title = titleText + "\n" + title;
        } else {
          title = titleText;
        }
      }
    }

    if (appearance.showState && appearance.statePosition === "bottom") {
      const stateText = this.formatState(entity);
      if (title) {
        title += "\n" + stateText;
      } else {
        title = stateText;
      }
    }

    // Set the title
    await ev.action.setTitle(title);

    // Set background color based on state if configured
    if (appearance.backgroundColorOn && appearance.backgroundColorOff) {
      // Note: Stream Deck SDK doesn't directly support background color
      // This would require generating a custom image
      // For now, we'll just use the title color as an indicator
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
    let service = action;

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
   * Check if the entity is in an "on" state
   */
  private isEntityOn(entity: HAEntity): boolean {
    const { state } = entity;
    const onStates = ["on", "open", "unlocked", "playing", "cleaning", "home", "heat", "cool", "auto"];
    return onStates.includes(state.toLowerCase());
  }

  /**
   * Send entities and areas to the Property Inspector
   */
  private async sendEntitiesToPropertyInspector(
    ev: SendToPluginEvent<Record<string, unknown>, EntityButtonSettings>
  ): Promise<void> {
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

    await ev.action.sendToPropertyInspector({
      event: "entities",
      entities: entityList,
      areas: areas.map((a) => ({ area_id: a.area_id, name: a.name })),
    });
  }
}
