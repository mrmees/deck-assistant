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
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { haConnection } from "../homeassistant/connection.js";
import { ConnectionState, HALabel } from "../homeassistant/types.js";
import { renderIcon } from "../icons/index.js";
import { getFirstConnectedDevice, getAllConnectedDevices } from "../layout/device-info.js";
import { generateProfile } from "../layout/profile-generator.js";

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
    } else if (event === "updateWindowSize") {
      // Update the manifest with new window size
      const width = payload?.width as number;
      const height = payload?.height as number;

      if (width && height) {
        await this.updateManifestWindowSize(width, height);
      }
    } else if (event === "getDeviceInfo") {
      // Style Editor requesting device info
      await this.handleGetDeviceInfo();
    } else if (event === "getEntities") {
      // Style Editor requesting entities
      await this.handleGetEntities();
    } else if (event === "getAreas") {
      // Style Editor requesting areas
      await this.handleGetAreas();
    } else if (event === "generateProfile") {
      // Style Editor requesting profile generation
      logger.info("generateProfile event received from PI");
      const config = payload?.config as JsonObject;
      if (config) {
        await this.handleGenerateProfile(config);
      } else {
        logger.error("generateProfile called but no config provided");
      }
    } else if (event === "getLabels") {
      // Style Editor requesting labels
      await this.handleGetLabels();
    } else if (event === "createLabel") {
      const name = payload?.name as string;
      if (name) {
        await this.handleCreateLabel(name);
      }
    } else if (event === "assignLabels") {
      const entityId = payload?.entityId as string;
      const labelIds = payload?.labelIds as string[];
      if (entityId && labelIds) {
        await this.handleAssignLabels(entityId, labelIds);
      }
    } else if (event === "getDashboardEntities") {
      await this.handleGetDashboardEntities();
    } else if (event === "getDashboards") {
      await this.handleGetDashboards();
    } else if (event === "getFloors") {
      await this.handleGetFloors();
    } else if (event === "getFullRegistry") {
      await this.handleGetFullRegistry();
    } else if (event === "getThemes") {
      await this.handleGetThemes();
    } else if (event === "exportConfig") {
      const config = payload?.config as JsonObject;
      if (config) {
        await this.handleExportConfig(config);
      }
    }
  }

  /**
   * Handle getDeviceInfo request from Style Editor
   */
  private async handleGetDeviceInfo(): Promise<void> {
    const allDevices = getAllConnectedDevices();
    const firstDevice = getFirstConnectedDevice();

    logger.debug(`Found ${allDevices.length} devices, first: ${firstDevice?.name}`);

    await streamDeck.ui.current?.sendToPropertyInspector({
      event: "deviceInfo",
      // First/default device info (for backwards compatibility)
      name: firstDevice?.name || "Stream Deck",
      model: firstDevice?.model || "StreamDeck",
      cols: firstDevice?.cols || 5,
      rows: firstDevice?.rows || 3,
      // All connected devices
      devices: allDevices.length > 0 ? allDevices : [
        { id: "default", name: "Stream Deck", model: "StreamDeck", cols: 5, rows: 3, type: 0 }
      ]
    });
  }

  /**
   * Handle getEntities request from Style Editor
   */
  private async handleGetEntities(): Promise<void> {
    if (!haConnection.isConnected()) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "error",
        message: "Not connected to Home Assistant",
      });
      return;
    }

    try {
      // Get all entities from Home Assistant
      const entities = haConnection.getAllEntities();
      const entityRegistry = haConnection.getEntityRegistry();
      const devices = haConnection.getDeviceRegistry();

      // Build a map of device_id -> area_id from device registry
      const deviceAreaMap: Record<string, string | null> = {};
      for (const device of devices) {
        deviceAreaMap[device.id] = device.area_id || null;
      }

      // Build a map of entity_id -> { area_id, device_id } from entity registry
      const entityRegistryMap: Record<string, { area_id: string | null; device_id: string | null }> = {};
      for (const entry of entityRegistry) {
        entityRegistryMap[entry.entity_id] = {
          area_id: entry.area_id || null,
          device_id: entry.device_id || null,
        };
      }

      // Transform to simpler format for the editor
      // Entity area is: direct area_id on entity, OR inherited from device
      const entityList = Object.values(entities).map(entity => {
        const registryEntry = entityRegistryMap[entity.entity_id];
        let area_id: string | null = null;

        if (registryEntry) {
          // First check if entity has direct area assignment
          if (registryEntry.area_id) {
            area_id = registryEntry.area_id;
          }
          // Otherwise, inherit area from device
          else if (registryEntry.device_id) {
            area_id = deviceAreaMap[registryEntry.device_id] || null;
          }
        }

        return {
          entity_id: entity.entity_id,
          domain: entity.entity_id.split('.')[0],
          friendly_name: entity.attributes?.friendly_name || entity.entity_id,
          area_id: area_id,
          state: entity.state,
          device_class: entity.attributes?.device_class || null,
          icon: entity.attributes?.icon || null,
        };
      });

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "entitiesData",
        entities: entityList,
      });
    } catch (error) {
      logger.error(`Failed to get entities: ${error}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "error",
        message: "Failed to load entities from Home Assistant",
      });
    }
  }

  /**
   * Handle getAreas request from Style Editor
   */
  private async handleGetAreas(): Promise<void> {
    if (!haConnection.isConnected()) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "areasData",
        areas: [],
      });
      return;
    }

    try {
      const areas = haConnection.getAreas();

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "areasData",
        areas: areas.map(area => ({
          area_id: area.area_id,
          name: area.name,
          floor_id: area.floor_id,
        })),
      });
    } catch (error) {
      logger.error(`Failed to get areas: ${error}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "areasData",
        areas: [],
      });
    }
  }

  /**
   * Handle generateProfile request from Style Editor
   */
  private async handleGenerateProfile(config: JsonObject): Promise<void> {
    logger.info("handleGenerateProfile called");

    try {
      // Generate the profile (now async due to ZIP creation)
      const result = await generateProfile(config as any);

      // Save to Downloads folder
      let filePath: string | null = null;
      try {
        const downloadsPath = join(homedir(), "Downloads");
        filePath = join(downloadsPath, result.filename);
        const buffer = Buffer.from(result.data, "base64");
        await writeFile(filePath, buffer);
        logger.info(`Profile saved to: ${filePath}`);
      } catch (saveError) {
        logger.warn(`Could not save to Downloads: ${saveError}`);
        filePath = null;
      }

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "profileGenerated",
        filePath: filePath,
        filename: result.filename,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to generate profile: ${errorMessage}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "error",
        message: `Failed to generate profile: ${errorMessage}`,
      });
    }
  }

  /**
   * Handle getLabels request from Style Editor
   */
  private async handleGetLabels(): Promise<void> {
    if (!haConnection.isConnected()) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "labelsData",
        labels: [],
        entitiesWithLabels: [],
      });
      return;
    }

    try {
      const labels = haConnection.getLabels();
      const entitiesWithLabels = haConnection.getEntitiesWithDeckAssistantLabels();

      // Filter to only deck-assistant labels
      const daLabels = labels.filter(l => l.name.startsWith("deck-assistant:"));

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "labelsData",
        labels: daLabels as unknown as JsonValue,
        entitiesWithLabels: entitiesWithLabels as unknown as JsonValue,
      } as JsonObject);
    } catch (error) {
      logger.error(`Failed to get labels: ${error}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "labelsData",
        labels: [],
        entitiesWithLabels: [],
      });
    }
  }

  /**
   * Handle createLabel request from Style Editor
   */
  private async handleCreateLabel(name: string): Promise<void> {
    if (!haConnection.isConnected()) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "error",
        message: "Not connected to Home Assistant",
      });
      return;
    }

    try {
      const label = await haConnection.createLabel(name, name);

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "labelCreated",
        label: label as unknown as JsonValue,
      } as JsonObject);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to create label: ${errorMessage}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "error",
        message: `Failed to create label: ${errorMessage}`,
      });
    }
  }

  /**
   * Handle assignLabels request from Style Editor
   */
  private async handleAssignLabels(entityId: string, labelIds: string[]): Promise<void> {
    if (!haConnection.isConnected()) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "error",
        message: "Not connected to Home Assistant",
      });
      return;
    }

    try {
      await haConnection.assignLabelsToEntity(entityId, labelIds);

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "labelsAssigned",
        entityId: entityId,
        labelIds: labelIds,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to assign labels: ${errorMessage}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "error",
        message: `Failed to assign labels: ${errorMessage}`,
      });
    }
  }

  /**
   * Handle getDashboardEntities request from Style Editor
   */
  private async handleGetDashboardEntities(): Promise<void> {
    if (!haConnection.isConnected()) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "dashboardEntitiesData",
        entities: [],
      });
      return;
    }

    try {
      const entities = await haConnection.getDashboardEntities();

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "dashboardEntitiesData",
        entities: entities,
      });
    } catch (error) {
      logger.error(`Failed to get dashboard entities: ${error}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "dashboardEntitiesData",
        entities: [],
      });
    }
  }

  /**
   * Handle getDashboards request from Style Editor (dashboards with their entities)
   */
  private async handleGetDashboards(): Promise<void> {
    if (!haConnection.isConnected()) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "dashboardsData",
        dashboards: [],
      });
      return;
    }

    try {
      const dashboards = await haConnection.getDashboardsWithEntities();

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "dashboardsData",
        dashboards: dashboards,
      });
    } catch (error) {
      logger.error(`Failed to get dashboards: ${error}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "dashboardsData",
        dashboards: [],
      });
    }
  }

  /**
   * Handle getFloors request from Style Editor
   */
  private async handleGetFloors(): Promise<void> {
    if (!haConnection.isConnected()) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "floorsData",
        floors: [],
      });
      return;
    }

    try {
      const floors = haConnection.getFloors();

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "floorsData",
        floors: floors.map(floor => ({
          floor_id: floor.floor_id,
          name: floor.name,
          level: floor.level,
        })),
      });
    } catch (error) {
      logger.error(`Failed to get floors: ${error}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "floorsData",
        floors: [],
      });
    }
  }

  /**
   * Handle getFullRegistry request - returns all registry data for advanced grouping
   */
  private async handleGetFullRegistry(): Promise<void> {
    if (!haConnection.isConnected()) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "fullRegistryData",
        entityRegistry: [],
        devices: [],
        labels: [],
      });
      return;
    }

    try {
      const entityRegistry = haConnection.getEntityRegistry();
      const devices = haConnection.getDeviceRegistry();
      const labels = haConnection.getLabels();

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "fullRegistryData",
        entityRegistry: entityRegistry.map(entry => ({
          entity_id: entry.entity_id,
          device_id: entry.device_id,
          area_id: entry.area_id,
          platform: entry.platform,
          labels: entry.labels || [],
          disabled_by: entry.disabled_by,
          hidden_by: entry.hidden_by,
          entity_category: entry.entity_category,
        })),
        devices: devices.map(device => ({
          id: device.id,
          name: device.name_by_user || device.name,
          area_id: device.area_id,
          manufacturer: device.manufacturer,
          model: device.model,
          labels: device.labels || [],
        })),
        labels: labels.map(label => ({
          label_id: label.label_id,
          name: label.name,
          color: label.color,
          icon: label.icon,
        })),
      } as JsonObject);
    } catch (error) {
      logger.error(`Failed to get full registry: ${error}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "fullRegistryData",
        entityRegistry: [],
        devices: [],
        labels: [],
      });
    }
  }

  /**
   * Handle getThemes request - returns HA frontend themes
   */
  private async handleGetThemes(): Promise<void> {
    if (!haConnection.isConnected()) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "themes",
        themes: null,
        error: "Not connected to Home Assistant",
      });
      return;
    }

    try {
      const themes = await haConnection.getThemes();

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "themes",
        themes: themes,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to get themes: ${errorMessage}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "themes",
        themes: null,
        error: errorMessage,
      });
    }
  }

  /**
   * Handle exportConfig request from Style Editor
   */
  private async handleExportConfig(config: JsonObject): Promise<void> {
    try {
      const filename = `deck-assistant-config-${new Date().toISOString().slice(0, 10)}.json`;
      const downloadsPath = join(homedir(), "Downloads");
      const filePath = join(downloadsPath, filename);

      // Write the config as formatted JSON
      await writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
      logger.info(`Configuration exported to: ${filePath}`);

      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "configExported",
        filePath: filePath,
        filename: filename,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to export config: ${errorMessage}`);
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: "error",
        message: `Failed to export configuration: ${errorMessage}`,
      });
    }
  }

  /**
   * Update the DefaultWindowSize in manifest.json
   */
  private async updateManifestWindowSize(width: number, height: number): Promise<void> {
    try {
      // Get the path to the manifest.json in the plugin directory
      // The compiled plugin runs from com.deckassistant.sdPlugin/bin/plugin.js
      // So we need to go up one level to find manifest.json
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const manifestPath = join(currentDir, "..", "manifest.json");

      logger.debug(`Updating manifest at: ${manifestPath}`);

      // Read the current manifest
      const manifestContent = await readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent);

      // Update the DefaultWindowSize
      manifest.DefaultWindowSize = [width, height];

      // Write the updated manifest
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

      logger.info(`Updated DefaultWindowSize to [${width}, ${height}]`);
    } catch (error) {
      logger.error(`Failed to update manifest: ${error}`);
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
