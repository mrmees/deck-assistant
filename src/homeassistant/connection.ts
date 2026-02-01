import WebSocket from "ws";
import {
  createConnection,
  createLongLivedTokenAuth,
  Connection,
  HassEntities,
  subscribeEntities,
  HassEntity,
  UnsubscribeFunc,
  callService as haCallService,
} from "home-assistant-js-websocket";
import {
  HAConfig,
  HAEntity,
  HAFloor,
  HAArea,
  HADevice,
  HAEntityRegistryEntry,
  HALabel,
  ConnectionState,
} from "./types.js";

// Polyfill WebSocket for Node.js environment
(global as any).WebSocket = WebSocket;

export type EntityCallback = (entities: Record<string, HAEntity>) => void;
export type ConnectionCallback = (state: ConnectionState) => void;

export class HomeAssistantConnection {
  private connection: Connection | null = null;
  private entities: Record<string, HAEntity> = {};
  private floors: HAFloor[] = [];
  private areas: HAArea[] = [];
  private devices: HADevice[] = [];
  private entityRegistry: HAEntityRegistryEntry[] = [];
  private labels: HALabel[] = [];
  private entitySubscribers: Set<EntityCallback> = new Set();
  private connectionSubscribers: Set<ConnectionCallback> = new Set();
  private entitiesUnsubscribe: UnsubscribeFunc | null = null;
  private connectionState: ConnectionState = { connected: false };

  /**
   * Connect to Home Assistant using long-lived access token
   */
  async connect(config: HAConfig): Promise<void> {
    try {
      // Normalize URL - remove trailing slash if present
      const url = config.url.replace(/\/$/, "");

      const auth = createLongLivedTokenAuth(url, config.token);

      this.connection = await createConnection({ auth });

      // Set up connection close handler
      this.connection.addEventListener("disconnected", () => {
        this.updateConnectionState({ connected: false, error: "Disconnected from Home Assistant" });
      });

      this.connection.addEventListener("ready", () => {
        this.updateConnectionState({ connected: true });
      });

      // Subscribe to entity state changes
      this.entitiesUnsubscribe = subscribeEntities(this.connection, (entities: HassEntities) => {
        this.handleEntitiesUpdate(entities);
      });

      // Fetch floors, areas, devices, entity registry, and labels
      await Promise.all([
        this.fetchFloors(),
        this.fetchAreas(),
        this.fetchDevices(),
        this.fetchEntityRegistry(),
        this.fetchLabels(),
      ]);

      this.updateConnectionState({ connected: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.updateConnectionState({ connected: false, error: errorMessage });
      throw error;
    }
  }

  /**
   * Disconnect from Home Assistant
   */
  disconnect(): void {
    if (this.entitiesUnsubscribe) {
      this.entitiesUnsubscribe();
      this.entitiesUnsubscribe = null;
    }

    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    this.entities = {};
    this.floors = [];
    this.areas = [];
    this.devices = [];
    this.entityRegistry = [];
    this.labels = [];
    this.updateConnectionState({ connected: false });
  }

  /**
   * Call a Home Assistant service
   */
  async callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: { entity_id?: string | string[]; device_id?: string | string[]; area_id?: string | string[] }
  ): Promise<void> {
    if (!this.connection) {
      throw new Error("Not connected to Home Assistant");
    }

    await haCallService(this.connection, domain, service, data, target);
  }

  /**
   * Get a specific entity by ID
   */
  getEntity(entityId: string): HAEntity | undefined {
    return this.entities[entityId];
  }

  /**
   * Get all entities
   */
  getAllEntities(): Record<string, HAEntity> {
    return { ...this.entities };
  }

  /**
   * Get all floors
   */
  getFloors(): HAFloor[] {
    return [...this.floors];
  }

  /**
   * Get all areas
   */
  getAreas(): HAArea[] {
    return [...this.areas];
  }

  /**
   * Get entity registry entries
   */
  getEntityRegistry(): HAEntityRegistryEntry[] {
    return [...this.entityRegistry];
  }

  /**
   * Get device registry entries
   */
  getDeviceRegistry(): HADevice[] {
    return [...this.devices];
  }

  /**
   * Get all labels
   */
  getLabels(): HALabel[] {
    return [...this.labels];
  }

  /**
   * Subscribe to entity state changes
   */
  subscribeToEntities(callback: EntityCallback): () => void {
    this.entitySubscribers.add(callback);

    // Immediately call with current entities if we have any
    if (Object.keys(this.entities).length > 0) {
      callback(this.getAllEntities());
    }

    // Return unsubscribe function
    return () => {
      this.entitySubscribers.delete(callback);
    };
  }

  /**
   * Subscribe to connection state changes
   */
  subscribeToConnection(callback: ConnectionCallback): () => void {
    this.connectionSubscribers.add(callback);

    // Immediately call with current state
    callback(this.connectionState);

    // Return unsubscribe function
    return () => {
      this.connectionSubscribers.delete(callback);
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState.connected;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Fetch floors from Home Assistant
   */
  private async fetchFloors(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      const floors = await this.connection.sendMessagePromise<HAFloor[]>({
        type: "config/floor_registry/list",
      });
      this.floors = floors || [];
    } catch (error) {
      // Floors are a newer HA feature, may not exist in older versions
      console.error("Failed to fetch floors:", error);
      this.floors = [];
    }
  }

  /**
   * Fetch areas from Home Assistant
   */
  private async fetchAreas(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      const areas = await this.connection.sendMessagePromise<HAArea[]>({
        type: "config/area_registry/list",
      });
      this.areas = areas || [];
    } catch (error) {
      console.error("Failed to fetch areas:", error);
      this.areas = [];
    }
  }

  /**
   * Fetch device registry from Home Assistant
   */
  private async fetchDevices(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      const devices = await this.connection.sendMessagePromise<HADevice[]>({
        type: "config/device_registry/list",
      });
      this.devices = devices || [];
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      this.devices = [];
    }
  }

  /**
   * Fetch entity registry from Home Assistant
   */
  private async fetchEntityRegistry(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      const registry = await this.connection.sendMessagePromise<HAEntityRegistryEntry[]>({
        type: "config/entity_registry/list",
      });
      this.entityRegistry = registry || [];
    } catch (error) {
      console.error("Failed to fetch entity registry:", error);
      this.entityRegistry = [];
    }
  }

  /**
   * Fetch labels from Home Assistant
   */
  private async fetchLabels(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      const labels = await this.connection.sendMessagePromise<HALabel[]>({
        type: "config/label_registry/list",
      });
      this.labels = labels || [];
    } catch (error) {
      console.error("Failed to fetch labels:", error);
      this.labels = [];
    }
  }

  /**
   * Create a new label in Home Assistant (or return existing one)
   */
  async createLabel(labelId: string, name: string): Promise<HALabel | null> {
    if (!this.connection) {
      throw new Error("Not connected to Home Assistant");
    }

    // Check if label already exists
    const existingLabel = this.labels.find(l => l.name === name);
    if (existingLabel) {
      return existingLabel;
    }

    try {
      const result = await this.connection.sendMessagePromise<HALabel>({
        type: "config/label_registry/create",
        name: name,
      });

      // Refresh labels cache
      await this.fetchLabels();

      return result;
    } catch (error) {
      // If label already exists (race condition), try to find and return it
      await this.fetchLabels();
      const label = this.labels.find(l => l.name === name);
      if (label) {
        return label;
      }
      console.error("Failed to create label:", error);
      throw error;
    }
  }

  /**
   * Assign labels to an entity
   */
  async assignLabelsToEntity(entityId: string, labelIds: string[]): Promise<void> {
    if (!this.connection) {
      throw new Error("Not connected to Home Assistant");
    }

    try {
      await this.connection.sendMessagePromise({
        type: "config/entity_registry/update",
        entity_id: entityId,
        labels: labelIds,
      });

      // Refresh entity registry cache
      await this.fetchEntityRegistry();
    } catch (error) {
      console.error(`Failed to assign labels to ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Get entities used in Lovelace dashboards (flat list for filtering)
   */
  async getDashboardEntities(): Promise<string[]> {
    const dashboardsWithEntities = await this.getDashboardsWithEntities();
    const allEntityIds = new Set<string>();
    for (const dashboard of dashboardsWithEntities) {
      for (const entityId of dashboard.entities) {
        allEntityIds.add(entityId);
      }
    }
    return Array.from(allEntityIds);
  }

  /**
   * Get dashboards with their associated entities (for grouping by dashboard)
   */
  async getDashboardsWithEntities(): Promise<Array<{ id: string; name: string; entities: string[] }>> {
    if (!this.connection) {
      return [];
    }

    const result: Array<{ id: string; name: string; entities: string[] }> = [];

    try {
      // Get list of dashboards
      const dashboards = await this.connection.sendMessagePromise<Array<{ url_path: string | null; title?: string }>>({
        type: "lovelace/dashboards/list",
      });

      // Fetch default dashboard (Overview)
      try {
        const defaultConfig = await this.connection.sendMessagePromise<any>({
          type: "lovelace/config",
        });
        const entityIds = new Set<string>();
        this.extractEntitiesFromConfig(defaultConfig, entityIds);
        result.push({
          id: '__default__',
          name: defaultConfig.title || 'Overview',
          entities: Array.from(entityIds)
        });
      } catch (e) {
        // Default dashboard might not exist or use strategy mode
      }

      // Fetch each custom/user dashboard
      for (const dashboard of dashboards || []) {
        if (dashboard.url_path) {
          try {
            const config = await this.connection.sendMessagePromise<any>({
              type: "lovelace/config",
              url_path: dashboard.url_path,
            });
            const entityIds = new Set<string>();
            this.extractEntitiesFromConfig(config, entityIds);
            result.push({
              id: dashboard.url_path,
              name: config.title || dashboard.title || dashboard.url_path,
              entities: Array.from(entityIds)
            });
          } catch (e) {
            // Dashboard might use strategy mode or fail to load
            // Still add it with 0 entities so user sees it
            result.push({
              id: dashboard.url_path,
              name: dashboard.title || dashboard.url_path,
              entities: []
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboards with entities:", error);
    }

    return result;
  }

  /**
   * Recursively extract entity IDs from a Lovelace config
   */
  private extractEntitiesFromConfig(config: any, entityIds: Set<string>): void {
    if (!config || typeof config !== "object") return;

    // Check for entity field
    if (typeof config.entity === "string" && config.entity.includes(".")) {
      entityIds.add(config.entity);
    }

    // Check for entities array
    if (Array.isArray(config.entities)) {
      for (const item of config.entities) {
        if (typeof item === "string" && item.includes(".")) {
          entityIds.add(item);
        } else if (typeof item === "object" && item.entity) {
          entityIds.add(item.entity);
        }
      }
    }

    // Check for cards array (views, stacks, etc.)
    if (Array.isArray(config.cards)) {
      for (const card of config.cards) {
        this.extractEntitiesFromConfig(card, entityIds);
      }
    }

    // Check for views array
    if (Array.isArray(config.views)) {
      for (const view of config.views) {
        this.extractEntitiesFromConfig(view, entityIds);
      }
    }

    // Check for card field (some wrapper cards)
    if (config.card) {
      this.extractEntitiesFromConfig(config.card, entityIds);
    }
  }

  /**
   * Get entities that have deck-assistant labels
   */
  getEntitiesWithDeckAssistantLabels(): Array<{
    entity_id: string;
    labels: string[];
    hierarchy: string[][];
  }> {
    const results: Array<{
      entity_id: string;
      labels: string[];
      hierarchy: string[][];
    }> = [];

    for (const entry of this.entityRegistry) {
      if (!entry.labels || entry.labels.length === 0) continue;

      const daLabels = entry.labels.filter(l => l.startsWith("deck-assistant:"));
      if (daLabels.length === 0) continue;

      const hierarchy = daLabels.map(label => {
        const parts = label.split(":");
        return parts.slice(1); // Remove "deck-assistant" prefix
      });

      results.push({
        entity_id: entry.entity_id,
        labels: daLabels,
        hierarchy,
      });
    }

    return results;
  }

  /**
   * Handle entity updates from Home Assistant
   */
  private handleEntitiesUpdate(hassEntities: HassEntities): void {
    // Convert HassEntities to our HAEntity format
    const entities: Record<string, HAEntity> = {};

    for (const [entityId, hassEntity] of Object.entries(hassEntities)) {
      entities[entityId] = this.convertHassEntity(hassEntity);
    }

    this.entities = entities;

    // Notify all subscribers
    for (const callback of this.entitySubscribers) {
      try {
        callback(this.getAllEntities());
      } catch (error) {
        console.error("Error in entity subscriber callback:", error);
      }
    }
  }

  /**
   * Convert HassEntity to HAEntity
   */
  private convertHassEntity(hassEntity: HassEntity): HAEntity {
    return {
      entity_id: hassEntity.entity_id,
      state: hassEntity.state,
      attributes: {
        friendly_name: hassEntity.attributes.friendly_name as string | undefined,
        icon: hassEntity.attributes.icon as string | undefined,
        device_class: hassEntity.attributes.device_class as string | undefined,
        unit_of_measurement: hassEntity.attributes.unit_of_measurement as string | undefined,
        ...hassEntity.attributes,
      },
      last_changed: hassEntity.last_changed,
      last_updated: hassEntity.last_updated,
    };
  }

  /**
   * Update connection state and notify subscribers
   */
  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;

    for (const callback of this.connectionSubscribers) {
      try {
        callback(state);
      } catch (error) {
        console.error("Error in connection subscriber callback:", error);
      }
    }
  }
}

// Export singleton instance
export const haConnection = new HomeAssistantConnection();
