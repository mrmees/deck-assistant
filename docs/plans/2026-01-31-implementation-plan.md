# Home Assistant Stream Deck Plugin - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Stream Deck plugin that displays and controls Home Assistant entities with real-time state updates and a powerful entity picker UI.

**Architecture:** Node.js plugin using Elgato's Stream Deck SDK communicates with Home Assistant via WebSocket for real-time state updates and REST API for service calls. Property Inspector provides entity discovery with search, area, and domain filtering.

**Tech Stack:** TypeScript, @elgato/streamdeck SDK, home-assistant-js-websocket, sharp (image processing), sdpi-components (Property Inspector UI)

---

## Phase 1: Plugin Scaffold & Basic Connection

### Task 1: Initialize Stream Deck Plugin Project

**Files:**
- Create: `com.homeassistant.streamdeck.sdPlugin/manifest.json`
- Create: `src/plugin.ts`
- Create: `src/actions/entity-button.ts`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `rollup.config.mjs`

**Step 1: Install Stream Deck CLI globally**

Run:
```bash
npm install -g @elgato/cli
```

**Step 2: Create plugin scaffold**

Run from `E:/claude/personal/github/homeassistant-streamdeck`:
```bash
streamdeck create
```

When prompted:
- Name: `Home Assistant`
- UUID: `com.homeassistant.streamdeck`
- Author: `Your Name`
- Description: `Control Home Assistant entities from Stream Deck`

**Step 3: Verify scaffold created**

Run:
```bash
ls -la com.homeassistant.streamdeck.sdPlugin/
```

Expected: `manifest.json`, `bin/`, `imgs/`, `ui/` directories exist

**Step 4: Commit scaffold**

```bash
git add -A
git commit -m "feat: initialize Stream Deck plugin scaffold"
```

---

### Task 2: Add Home Assistant WebSocket Client Dependency

**Files:**
- Modify: `package.json`

**Step 1: Install dependencies**

Run:
```bash
npm install home-assistant-js-websocket
npm install sharp
npm install -D @types/node
```

**Step 2: Verify package.json updated**

Run:
```bash
cat package.json | grep -A 5 "dependencies"
```

Expected: `home-assistant-js-websocket` and `sharp` listed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add home-assistant-js-websocket and sharp dependencies"
```

---

### Task 3: Create Home Assistant Connection Module

**Files:**
- Create: `src/homeassistant/connection.ts`
- Create: `src/homeassistant/types.ts`

**Step 1: Create types file**

Create `src/homeassistant/types.ts`:
```typescript
export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    icon?: string;
    device_class?: string;
    unit_of_measurement?: string;
    [key: string]: unknown;
  };
  last_changed: string;
  last_updated: string;
}

export interface HAArea {
  area_id: string;
  name: string;
  picture?: string;
}

export interface HADevice {
  id: string;
  name: string;
  area_id?: string;
}

export interface HAEntityRegistryEntry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  name?: string;
  icon?: string;
  platform: string;
}

export interface HAConfig {
  url: string;
  token: string;
}

export interface ConnectionState {
  connected: boolean;
  error?: string;
}
```

**Step 2: Create connection module**

Create `src/homeassistant/connection.ts`:
```typescript
import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  Connection,
  HassEntities,
} from "home-assistant-js-websocket";
import { HAConfig, HAEntity, HAArea, HAEntityRegistryEntry, ConnectionState } from "./types";

// WebSocket polyfill for Node.js
import WebSocket from "ws";
(global as any).WebSocket = WebSocket;

export class HomeAssistantConnection {
  private connection: Connection | null = null;
  private entities: Map<string, HAEntity> = new Map();
  private areas: HAArea[] = [];
  private entityRegistry: HAEntityRegistryEntry[] = [];
  private entitySubscribers: Set<(entities: Map<string, HAEntity>) => void> = new Set();
  private connectionSubscribers: Set<(state: ConnectionState) => void> = new Set();

  async connect(config: HAConfig): Promise<void> {
    try {
      const auth = createLongLivedTokenAuth(config.url, config.token);

      this.connection = await createConnection({ auth });

      this.connection.addEventListener("ready", () => {
        this.notifyConnectionSubscribers({ connected: true });
      });

      this.connection.addEventListener("disconnected", () => {
        this.notifyConnectionSubscribers({ connected: false, error: "Disconnected" });
      });

      // Subscribe to entity state changes
      subscribeEntities(this.connection, (entities: HassEntities) => {
        this.updateEntities(entities);
      });

      // Fetch areas and entity registry
      await this.fetchAreas();
      await this.fetchEntityRegistry();

      this.notifyConnectionSubscribers({ connected: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      this.notifyConnectionSubscribers({ connected: false, error: message });
      throw error;
    }
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.entities.clear();
    this.notifyConnectionSubscribers({ connected: false });
  }

  private updateEntities(hassEntities: HassEntities): void {
    for (const [entityId, entity] of Object.entries(hassEntities)) {
      this.entities.set(entityId, entity as HAEntity);
    }
    this.notifyEntitySubscribers();
  }

  private async fetchAreas(): Promise<void> {
    if (!this.connection) return;

    try {
      const result = await this.connection.sendMessagePromise<{ result: HAArea[] }>({
        type: "config/area_registry/list",
      });
      this.areas = result.result || [];
    } catch (error) {
      console.error("Failed to fetch areas:", error);
      this.areas = [];
    }
  }

  private async fetchEntityRegistry(): Promise<void> {
    if (!this.connection) return;

    try {
      const result = await this.connection.sendMessagePromise<{ result: HAEntityRegistryEntry[] }>({
        type: "config/entity_registry/list",
      });
      this.entityRegistry = result.result || [];
    } catch (error) {
      console.error("Failed to fetch entity registry:", error);
      this.entityRegistry = [];
    }
  }

  async callService(domain: string, service: string, data?: object, target?: { entity_id: string }): Promise<void> {
    if (!this.connection) {
      throw new Error("Not connected to Home Assistant");
    }

    await this.connection.sendMessagePromise({
      type: "call_service",
      domain,
      service,
      service_data: data,
      target,
    });
  }

  getEntity(entityId: string): HAEntity | undefined {
    return this.entities.get(entityId);
  }

  getAllEntities(): HAEntity[] {
    return Array.from(this.entities.values());
  }

  getAreas(): HAArea[] {
    return this.areas;
  }

  getEntityRegistry(): HAEntityRegistryEntry[] {
    return this.entityRegistry;
  }

  getAreaForEntity(entityId: string): HAArea | undefined {
    const registryEntry = this.entityRegistry.find(e => e.entity_id === entityId);
    if (registryEntry?.area_id) {
      return this.areas.find(a => a.area_id === registryEntry.area_id);
    }
    return undefined;
  }

  subscribeToEntities(callback: (entities: Map<string, HAEntity>) => void): () => void {
    this.entitySubscribers.add(callback);
    // Immediately call with current entities
    callback(this.entities);
    return () => this.entitySubscribers.delete(callback);
  }

  subscribeToConnection(callback: (state: ConnectionState) => void): () => void {
    this.connectionSubscribers.add(callback);
    return () => this.connectionSubscribers.delete(callback);
  }

  private notifyEntitySubscribers(): void {
    for (const callback of this.entitySubscribers) {
      callback(this.entities);
    }
  }

  private notifyConnectionSubscribers(state: ConnectionState): void {
    for (const callback of this.connectionSubscribers) {
      callback(state);
    }
  }

  isConnected(): boolean {
    return this.connection !== null;
  }
}

// Singleton instance
export const haConnection = new HomeAssistantConnection();
```

**Step 3: Add ws dependency for Node.js WebSocket**

Run:
```bash
npm install ws
npm install -D @types/ws
```

**Step 4: Commit**

```bash
git add src/homeassistant/ package.json package-lock.json
git commit -m "feat: add Home Assistant connection module with WebSocket support"
```

---

### Task 4: Create Entity Button Action

**Files:**
- Modify: `src/plugin.ts`
- Create: `src/actions/entity-button.ts`
- Create: `src/actions/types.ts`

**Step 1: Create action types**

Create `src/actions/types.ts`:
```typescript
export interface EntityButtonSettings {
  entityId: string;
  action: "toggle" | "turn_on" | "turn_off" | "call_service" | "none";
  serviceData?: {
    domain: string;
    service: string;
    data?: object;
  };
  appearance: {
    showTitle: boolean;
    titleOverride?: string;
    titlePosition: "top" | "bottom";
    showState: boolean;
    statePosition: "top" | "bottom";
    iconSource: "auto" | "mdi" | "custom";
    mdiIcon?: string;
    customIconPath?: string;
    iconColorOn: string;
    iconColorOff: string;
    backgroundColor: string;
    backgroundColorOn?: string;
    backgroundColorOff?: string;
  };
}

export const defaultEntityButtonSettings: EntityButtonSettings = {
  entityId: "",
  action: "toggle",
  appearance: {
    showTitle: true,
    titlePosition: "bottom",
    showState: true,
    statePosition: "top",
    iconSource: "auto",
    iconColorOn: "#FFD700",
    iconColorOff: "#808080",
    backgroundColor: "#1a1a1a",
  },
};
```

**Step 2: Create Entity Button action**

Create `src/actions/entity-button.ts`:
```typescript
import {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
  DidReceiveSettingsEvent,
} from "@elgato/streamdeck";
import { haConnection } from "../homeassistant/connection";
import { HAEntity } from "../homeassistant/types";
import { EntityButtonSettings, defaultEntityButtonSettings } from "./types";

@action({ UUID: "com.homeassistant.streamdeck.entity-button" })
export class EntityButtonAction extends SingletonAction<EntityButtonSettings> {
  private unsubscribers: Map<string, () => void> = new Map();

  override async onWillAppear(ev: WillAppearEvent<EntityButtonSettings>): Promise<void> {
    const settings = { ...defaultEntityButtonSettings, ...ev.payload.settings };

    if (!settings.entityId) {
      await ev.action.setTitle("Setup\nRequired");
      return;
    }

    // Subscribe to entity updates
    const unsubscribe = haConnection.subscribeToEntities((entities) => {
      const entity = entities.get(settings.entityId);
      if (entity) {
        this.updateButtonAppearance(ev.action, entity, settings);
      }
    });

    this.unsubscribers.set(ev.action.id, unsubscribe);
  }

  override async onWillDisappear(ev: WillDisappearEvent<EntityButtonSettings>): Promise<void> {
    const unsubscribe = this.unsubscribers.get(ev.action.id);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(ev.action.id);
    }
  }

  override async onKeyDown(ev: KeyDownEvent<EntityButtonSettings>): Promise<void> {
    const settings = { ...defaultEntityButtonSettings, ...ev.payload.settings };

    if (!settings.entityId) {
      await ev.action.showAlert();
      return;
    }

    try {
      await this.executeAction(settings);
    } catch (error) {
      console.error("Failed to execute action:", error);
      await ev.action.showAlert();
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<EntityButtonSettings>): Promise<void> {
    const settings = { ...defaultEntityButtonSettings, ...ev.payload.settings };

    if (settings.entityId) {
      const entity = haConnection.getEntity(settings.entityId);
      if (entity) {
        await this.updateButtonAppearance(ev.action, entity, settings);
      }
    }
  }

  private async executeAction(settings: EntityButtonSettings): Promise<void> {
    const entity = haConnection.getEntity(settings.entityId);
    if (!entity) return;

    const [domain] = settings.entityId.split(".");

    switch (settings.action) {
      case "toggle":
        if (domain === "light" || domain === "switch" || domain === "fan") {
          await haConnection.callService(domain, "toggle", undefined, { entity_id: settings.entityId });
        } else if (domain === "cover") {
          const service = entity.state === "open" ? "close_cover" : "open_cover";
          await haConnection.callService(domain, service, undefined, { entity_id: settings.entityId });
        } else if (domain === "lock") {
          const service = entity.state === "locked" ? "unlock" : "lock";
          await haConnection.callService(domain, service, undefined, { entity_id: settings.entityId });
        }
        break;
      case "turn_on":
        await haConnection.callService(domain, "turn_on", undefined, { entity_id: settings.entityId });
        break;
      case "turn_off":
        await haConnection.callService(domain, "turn_off", undefined, { entity_id: settings.entityId });
        break;
      case "call_service":
        if (settings.serviceData) {
          await haConnection.callService(
            settings.serviceData.domain,
            settings.serviceData.service,
            settings.serviceData.data,
            { entity_id: settings.entityId }
          );
        }
        break;
      case "none":
        // Display only, no action
        break;
    }
  }

  private async updateButtonAppearance(
    action: any,
    entity: HAEntity,
    settings: EntityButtonSettings
  ): Promise<void> {
    // Build title
    let title = "";
    const friendlyName = settings.appearance.titleOverride ||
                         entity.attributes.friendly_name ||
                         entity.entity_id;

    if (settings.appearance.showState && settings.appearance.statePosition === "top") {
      title += this.formatState(entity) + "\n";
    }

    if (settings.appearance.showTitle) {
      title += friendlyName;
    }

    if (settings.appearance.showState && settings.appearance.statePosition === "bottom") {
      title += "\n" + this.formatState(entity);
    }

    await action.setTitle(title.trim());

    // TODO: Generate and set dynamic icon based on entity state and settings
  }

  private formatState(entity: HAEntity): string {
    const state = entity.state;
    const unit = entity.attributes.unit_of_measurement;

    if (unit) {
      return `${state}${unit}`;
    }

    // Capitalize simple states
    if (state === "on" || state === "off") {
      return state.charAt(0).toUpperCase() + state.slice(1);
    }

    return state;
  }
}
```

**Step 3: Update plugin.ts to register action and connect to HA**

Modify `src/plugin.ts`:
```typescript
import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { EntityButtonAction } from "./actions/entity-button";
import { haConnection } from "./homeassistant/connection";

// Enable logging
streamDeck.logger.setLevel(LogLevel.DEBUG);

// Register actions
streamDeck.actions.registerAction(new EntityButtonAction());

// Connect to Home Assistant when global settings are available
streamDeck.settings.onDidReceiveGlobalSettings<{ haUrl?: string; haToken?: string }>((ev) => {
  const { haUrl, haToken } = ev.settings;

  if (haUrl && haToken && !haConnection.isConnected()) {
    haConnection.connect({ url: haUrl, token: haToken }).catch((error) => {
      streamDeck.logger.error("Failed to connect to Home Assistant:", error);
    });
  }
});

// Start the plugin
streamDeck.connect();
```

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: add EntityButton action with HA state sync and service calls"
```

---

### Task 5: Update Manifest with Entity Button Action

**Files:**
- Modify: `com.homeassistant.streamdeck.sdPlugin/manifest.json`

**Step 1: Update manifest.json**

Update `com.homeassistant.streamdeck.sdPlugin/manifest.json`:
```json
{
  "$schema": "https://schemas.elgato.com/streamdeck/plugins/manifest.json",
  "Name": "Home Assistant",
  "Version": "0.1.0",
  "Author": "Your Name",
  "Actions": [
    {
      "Name": "Entity Button",
      "UUID": "com.homeassistant.streamdeck.entity-button",
      "Icon": "imgs/actions/entity-button/icon",
      "Tooltip": "Control any Home Assistant entity",
      "PropertyInspectorPath": "ui/entity-button.html",
      "States": [
        {
          "Image": "imgs/actions/entity-button/state"
        }
      ]
    }
  ],
  "Category": "Home Assistant",
  "CategoryIcon": "imgs/plugin/category-icon",
  "CodePath": "bin/plugin.js",
  "Description": "Control Home Assistant entities from your Stream Deck",
  "Icon": "imgs/plugin/icon",
  "SDKVersion": 2,
  "Software": {
    "MinimumVersion": "6.9"
  },
  "OS": [
    {
      "Platform": "mac",
      "MinimumVersion": "10.15"
    },
    {
      "Platform": "windows",
      "MinimumVersion": "10"
    }
  ],
  "Nodejs": {
    "Version": "20",
    "Debug": "enabled"
  },
  "UUID": "com.homeassistant.streamdeck"
}
```

**Step 2: Create placeholder images**

Create placeholder icons (these will be replaced with proper icons later):

Run:
```bash
mkdir -p com.homeassistant.streamdeck.sdPlugin/imgs/actions/entity-button
mkdir -p com.homeassistant.streamdeck.sdPlugin/imgs/plugin
```

**Step 3: Commit**

```bash
git add com.homeassistant.streamdeck.sdPlugin/
git commit -m "feat: update manifest with EntityButton action definition"
```

---

## Phase 2: Property Inspector UI

### Task 6: Create Basic Property Inspector HTML

**Files:**
- Create: `com.homeassistant.streamdeck.sdPlugin/ui/entity-button.html`
- Create: `com.homeassistant.streamdeck.sdPlugin/ui/css/styles.css`

**Step 1: Download sdpi-components.js**

Run:
```bash
curl -L https://cdn.jsdelivr.net/npm/@panbor/sdpi-components/dist/sdpi-components.js -o com.homeassistant.streamdeck.sdPlugin/ui/sdpi-components.js
```

**Step 2: Create Property Inspector HTML**

Create `com.homeassistant.streamdeck.sdPlugin/ui/entity-button.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Entity Button</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <script src="sdpi-components.js"></script>

  <div id="connection-setup" class="hidden">
    <sdpi-item label="Home Assistant URL">
      <sdpi-textfield id="ha-url" placeholder="http://192.168.1.254:8123"></sdpi-textfield>
    </sdpi-item>
    <sdpi-item label="Access Token">
      <sdpi-password id="ha-token" placeholder="Long-lived access token"></sdpi-password>
    </sdpi-item>
    <sdpi-item>
      <sdpi-button id="connect-btn">Connect</sdpi-button>
    </sdpi-item>
    <details>
      <summary>How do I get a token?</summary>
      <p>In Home Assistant: Profile → Security → Long-Lived Access Tokens → Create Token</p>
    </details>
  </div>

  <div id="entity-setup" class="hidden">
    <!-- Search and Filter -->
    <sdpi-item label="Search">
      <sdpi-textfield id="entity-search" placeholder="Search by name..."></sdpi-textfield>
    </sdpi-item>

    <sdpi-item label="Area">
      <sdpi-select id="area-filter">
        <option value="">All Areas</option>
      </sdpi-select>
    </sdpi-item>

    <sdpi-item label="Type">
      <sdpi-select id="domain-filter">
        <option value="">All Types</option>
        <option value="light">Lights</option>
        <option value="switch">Switches</option>
        <option value="sensor">Sensors</option>
        <option value="binary_sensor">Binary Sensors</option>
        <option value="climate">Climate</option>
        <option value="cover">Covers</option>
        <option value="media_player">Media Players</option>
        <option value="scene">Scenes</option>
        <option value="script">Scripts</option>
        <option value="lock">Locks</option>
        <option value="fan">Fans</option>
      </sdpi-select>
    </sdpi-item>

    <!-- Entity List -->
    <sdpi-item label="Entity">
      <sdpi-select id="entity-select" setting="entityId">
        <option value="">Select an entity...</option>
      </sdpi-select>
    </sdpi-item>

    <div id="entity-count" class="entity-count"></div>

    <!-- Action -->
    <sdpi-item label="On Press">
      <sdpi-select id="action-select" setting="action">
        <option value="toggle">Toggle</option>
        <option value="turn_on">Turn On</option>
        <option value="turn_off">Turn Off</option>
        <option value="none">No Action (Display Only)</option>
        <option value="call_service">Custom Service Call</option>
      </sdpi-select>
    </sdpi-item>

    <!-- Connection Settings Link -->
    <sdpi-item>
      <a href="#" id="edit-connection" class="settings-link">⚙️ Edit Connection</a>
    </sdpi-item>
  </div>

  <script src="js/entity-button-pi.js"></script>
</body>
</html>
```

**Step 3: Create styles**

Create `com.homeassistant.streamdeck.sdPlugin/ui/css/styles.css`:
```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  margin: 0;
  padding: 8px;
}

.hidden {
  display: none !important;
}

.entity-count {
  font-size: 11px;
  color: #888;
  padding: 4px 0;
  text-align: right;
}

.settings-link {
  font-size: 11px;
  color: #0084ff;
  text-decoration: none;
}

.settings-link:hover {
  text-decoration: underline;
}

details {
  margin-top: 8px;
  font-size: 11px;
  color: #888;
}

details summary {
  cursor: pointer;
  color: #0084ff;
}

details p {
  margin: 8px 0 0 0;
  padding-left: 12px;
}
```

**Step 4: Create Property Inspector JavaScript**

Create directory and file:
```bash
mkdir -p com.homeassistant.streamdeck.sdPlugin/ui/js
```

Create `com.homeassistant.streamdeck.sdPlugin/ui/js/entity-button-pi.js`:
```javascript
/// <reference path="../sdpi-components.js" />

const { streamDeckClient } = SDPIComponents;

// State
let entities = [];
let areas = [];
let globalSettings = {};
let actionSettings = {};

// DOM Elements
const connectionSetup = document.getElementById('connection-setup');
const entitySetup = document.getElementById('entity-setup');
const haUrlInput = document.getElementById('ha-url');
const haTokenInput = document.getElementById('ha-token');
const connectBtn = document.getElementById('connect-btn');
const entitySearch = document.getElementById('entity-search');
const areaFilter = document.getElementById('area-filter');
const domainFilter = document.getElementById('domain-filter');
const entitySelect = document.getElementById('entity-select');
const entityCount = document.getElementById('entity-count');
const editConnection = document.getElementById('edit-connection');

// Initialize
async function init() {
  // Get global settings
  globalSettings = await streamDeckClient.getGlobalSettings();

  if (globalSettings.haUrl && globalSettings.haToken) {
    showEntitySetup();
    requestEntities();
  } else {
    showConnectionSetup();
  }
}

function showConnectionSetup() {
  connectionSetup.classList.remove('hidden');
  entitySetup.classList.add('hidden');

  if (globalSettings.haUrl) {
    haUrlInput.value = globalSettings.haUrl;
  }
}

function showEntitySetup() {
  connectionSetup.classList.add('hidden');
  entitySetup.classList.remove('hidden');
}

// Connection
connectBtn.addEventListener('click', async () => {
  const haUrl = haUrlInput.value.trim();
  const haToken = haTokenInput.value.trim();

  if (!haUrl || !haToken) {
    alert('Please enter both URL and token');
    return;
  }

  // Save to global settings
  await streamDeckClient.setGlobalSettings({
    haUrl,
    haToken
  });

  globalSettings = { haUrl, haToken };

  // Request plugin to connect and send entities
  streamDeckClient.sendToPlugin({
    event: 'connect',
    payload: { haUrl, haToken }
  });

  showEntitySetup();
});

editConnection.addEventListener('click', (e) => {
  e.preventDefault();
  showConnectionSetup();
});

// Entity filtering
function requestEntities() {
  streamDeckClient.sendToPlugin({
    event: 'getEntities'
  });
}

function updateEntityList() {
  const searchTerm = entitySearch.value.toLowerCase();
  const selectedArea = areaFilter.value;
  const selectedDomain = domainFilter.value;

  const filtered = entities.filter(entity => {
    // Domain filter
    if (selectedDomain) {
      const [domain] = entity.entity_id.split('.');
      if (domain !== selectedDomain) return false;
    }

    // Area filter
    if (selectedArea && entity.area_id !== selectedArea) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const name = (entity.attributes?.friendly_name || entity.entity_id).toLowerCase();
      const id = entity.entity_id.toLowerCase();
      if (!name.includes(searchTerm) && !id.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  // Sort by friendly name
  filtered.sort((a, b) => {
    const nameA = a.attributes?.friendly_name || a.entity_id;
    const nameB = b.attributes?.friendly_name || b.entity_id;
    return nameA.localeCompare(nameB);
  });

  // Update select
  entitySelect.innerHTML = '<option value="">Select an entity...</option>';

  for (const entity of filtered) {
    const option = document.createElement('option');
    option.value = entity.entity_id;
    option.textContent = entity.attributes?.friendly_name || entity.entity_id;
    if (entity.entity_id === actionSettings.entityId) {
      option.selected = true;
    }
    entitySelect.appendChild(option);
  }

  entityCount.textContent = `${filtered.length} entities`;
}

function updateAreaOptions() {
  areaFilter.innerHTML = '<option value="">All Areas</option>';

  for (const area of areas) {
    const option = document.createElement('option');
    option.value = area.area_id;
    option.textContent = area.name;
    areaFilter.appendChild(option);
  }
}

// Event listeners for filters
entitySearch.addEventListener('input', updateEntityList);
areaFilter.addEventListener('change', updateEntityList);
domainFilter.addEventListener('change', updateEntityList);

// Listen for messages from plugin
streamDeckClient.onSendToPropertyInspector((data) => {
  if (data.event === 'entities') {
    entities = data.payload.entities || [];
    areas = data.payload.areas || [];
    updateAreaOptions();
    updateEntityList();
  } else if (data.event === 'connectionStatus') {
    if (data.payload.connected) {
      showEntitySetup();
      requestEntities();
    } else {
      alert('Connection failed: ' + (data.payload.error || 'Unknown error'));
    }
  }
});

// Listen for settings
streamDeckClient.onDidReceiveSettings((settings) => {
  actionSettings = settings;
  updateEntityList();
});

// Start
init();
```

**Step 5: Update EntityButtonAction to respond to Property Inspector messages**

Add to `src/actions/entity-button.ts`:
```typescript
import {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
  DidReceiveSettingsEvent,
  SendToPluginEvent,
} from "@elgato/streamdeck";

// ... existing code ...

  override async onSendToPlugin(ev: SendToPluginEvent<any, EntityButtonSettings>): Promise<void> {
    const { event, payload } = ev.payload;

    switch (event) {
      case 'connect':
        try {
          await haConnection.connect({ url: payload.haUrl, token: payload.haToken });
          await ev.action.sendToPropertyInspector({
            event: 'connectionStatus',
            payload: { connected: true }
          });
          // Send entities after successful connection
          await this.sendEntitiesToPropertyInspector(ev.action);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Connection failed';
          await ev.action.sendToPropertyInspector({
            event: 'connectionStatus',
            payload: { connected: false, error: message }
          });
        }
        break;

      case 'getEntities':
        await this.sendEntitiesToPropertyInspector(ev.action);
        break;
    }
  }

  private async sendEntitiesToPropertyInspector(action: any): Promise<void> {
    const entities = haConnection.getAllEntities();
    const areas = haConnection.getAreas();
    const registry = haConnection.getEntityRegistry();

    // Merge area info into entities
    const entitiesWithAreas = entities.map(entity => {
      const regEntry = registry.find(r => r.entity_id === entity.entity_id);
      return {
        ...entity,
        area_id: regEntry?.area_id
      };
    });

    await action.sendToPropertyInspector({
      event: 'entities',
      payload: {
        entities: entitiesWithAreas,
        areas
      }
    });
  }
```

**Step 6: Commit**

```bash
git add com.homeassistant.streamdeck.sdPlugin/ui/
git commit -m "feat: add Property Inspector with entity search, area, and domain filtering"
```

---

### Task 7: Build and Test Plugin

**Step 1: Build the plugin**

Run:
```bash
npm run build
```

**Step 2: Link plugin for development**

Run:
```bash
streamdeck link com.homeassistant.streamdeck.sdPlugin
```

**Step 3: Restart Stream Deck software**

The plugin should now appear in Stream Deck. Test:
1. Drag "Entity Button" to a key
2. Enter HA URL and token in Property Inspector
3. Search/filter entities
4. Select an entity
5. Press the button to toggle

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve any issues found during testing"
```

---

## Phase 3: Icon Rendering

### Task 8: Create Icon Rendering Module

**Files:**
- Create: `src/icons/renderer.ts`
- Create: `src/icons/mdi-bundled.ts`
- Create: `src/icons/cache.ts`

**Step 1: Create icon cache module**

Create `src/icons/cache.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';

const CACHE_DIR = path.join(__dirname, '../../icon-cache');

export async function getCachedIcon(iconName: string): Promise<string | null> {
  const cachePath = path.join(CACHE_DIR, `${iconName}.svg`);

  try {
    if (fs.existsSync(cachePath)) {
      return fs.readFileSync(cachePath, 'utf-8');
    }
  } catch (error) {
    console.error('Error reading cached icon:', error);
  }

  return null;
}

export async function cacheIcon(iconName: string, svgContent: string): Promise<void> {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    const cachePath = path.join(CACHE_DIR, `${iconName}.svg`);
    fs.writeFileSync(cachePath, svgContent, 'utf-8');
  } catch (error) {
    console.error('Error caching icon:', error);
  }
}
```

**Step 2: Create bundled icons list**

Create `src/icons/mdi-bundled.ts`:
```typescript
// Most common Home Assistant icons - bundled for offline use
// These SVG paths are from Material Design Icons (Apache 2.0 License)

export const bundledIcons: Record<string, string> = {
  'lightbulb': 'M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z',
  'lightbulb-outline': 'M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21M12,4A5,5 0 0,1 17,9C17,11.05 15.76,12.83 14,13.67V16H10V13.67C8.24,12.83 7,11.05 7,9A5,5 0 0,1 12,4Z',
  'power-plug': 'M16,7V3H14V7H10V3H8V7H8C7,7 6,8 6,9V14.5L9.5,18V21H14.5V18L18,14.5V9C18,8 17,7 16,7Z',
  'power-plug-off': 'M22.11,21.46L2.39,1.73L1.11,3L6.56,8.45C6.21,8.87 6,9.41 6,10V15.5L9.5,19V22H14.5V19L15.43,18.07L20.84,23.5L22.11,21.46M16,7V3H14V7H10V3H8V7C7.05,7 6.23,7.67 6.05,8.56L16.44,18.94L18,17.38V10C18,9 17,8 16,8V7Z',
  'thermometer': 'M15,13V5A3,3 0 0,0 12,2A3,3 0 0,0 9,5V13A5,5 0 0,0 7,17A5,5 0 0,0 12,22A5,5 0 0,0 17,17A5,5 0 0,0 15,13M12,4A1,1 0 0,1 13,5V8H11V5A1,1 0 0,1 12,4Z',
  'thermostat': 'M16.95,16.95L14.83,14.83C15.55,14.1 16,13.1 16,12C16,9.79 14.21,8 12,8V4H11V8C8.79,8 7,9.79 7,12C7,14.21 8.79,16 11,16H12V20H13V16C14.1,16 15.1,15.55 15.83,14.83L17.95,16.95L16.95,16.95M12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14Z',
  'fan': 'M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z',
  'lock': 'M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z',
  'lock-open': 'M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18Z',
  'door': 'M8,3H16V21H14V19H10V21H8V3M14,5H10V7H14V5M10,9H14V11H10V9M14,13H10V15H14V13Z',
  'door-open': 'M12,3L2,8V21H5V13H8V21H11V8.91L12,8.5L22,13V21H19V15H16V21H13V8.91L12,3Z',
  'window-closed': 'M6,3H18A2,2 0 0,1 20,5V19A2,2 0 0,1 18,21H6A2,2 0 0,1 4,19V5A2,2 0 0,1 6,3M11,5V10H6V5H11M18,5H13V10H18V5M11,19V12H6V19H11M18,19V12H13V19H18Z',
  'garage': 'M22,9V20H20V11H4V20H2V9L12,5L22,9M19,12H5V14H19V12M19,18H5V20H19V18M19,15H5V17H19V15Z',
  'blinds': 'M20,19V3H4V19H2V21H22V19H20M6,5H18V7H6V5M6,9H18V11H6V9M6,13H18V15H6V13M6,17H18V19H6V17Z',
  'play': 'M8,5.14V19.14L19,12.14L8,5.14Z',
  'pause': 'M14,19H18V5H14M6,19H10V5H6V19Z',
  'stop': 'M18,18H6V6H18V18Z',
  'skip-next': 'M16,18H18V6H16M6,18L14.5,12L6,6V18Z',
  'skip-previous': 'M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z',
  'volume-high': 'M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z',
  'volume-off': 'M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z',
  'motion-sensor': 'M10,0.2C9,0.2 8.2,1 8.2,2C8.2,3 9,3.8 10,3.8C11,3.8 11.8,3 11.8,2C11.8,1 11,0.2 10,0.2M15.67,1A7.33,7.33 0 0,0 23,8.33V7A8.67,8.67 0 0,0 14.33,0H15.67M18.33,1C18.33,1 18.33,1 18.33,1A4.67,4.67 0 0,0 23,5.67V4.33A6,6 0 0,0 17,0C17,0 17,0 17,0H18.33M21,1A2,2 0 0,0 23,3V2A3.33,3.33 0 0,0 19.67,0H21M14,4.5V7.5L12,8.5V12H10L7.5,14.5L5.5,13.5L3.5,15.5L5.5,17.5L7.5,15.5L9.5,16.5L12,14H14V17.5L16,18.5V20H23V18H18V17.2L14.5,15.5L16.5,13.5L14.5,11.5L13.5,12.5L14,8.5L15.5,7.5L16.5,5.5L14,4.5Z',
  'home': 'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z',
  'cog': 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z',
  'script-text': 'M17.8,20C17.4,21.2 16.3,22 15,22H5C3.3,22 2,20.7 2,19V5C2,3.3 3.3,2 5,2H15C16.3,2 17.4,2.8 17.8,4H19C20.7,4 22,5.3 22,7V17C22,18.7 20.7,20 19,20H17.8M7,6V8H13V6H7M7,10V12H13V10H7M7,14V16H11V14H7Z',
  'palette': 'M17.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,9A1.5,1.5 0 0,1 19,10.5A1.5,1.5 0 0,1 17.5,12M14.5,8A1.5,1.5 0 0,1 13,6.5A1.5,1.5 0 0,1 14.5,5A1.5,1.5 0 0,1 16,6.5A1.5,1.5 0 0,1 14.5,8M9.5,8A1.5,1.5 0 0,1 8,6.5A1.5,1.5 0 0,1 9.5,5A1.5,1.5 0 0,1 11,6.5A1.5,1.5 0 0,1 9.5,8M6.5,12A1.5,1.5 0 0,1 5,10.5A1.5,1.5 0 0,1 6.5,9A1.5,1.5 0 0,1 8,10.5A1.5,1.5 0 0,1 6.5,12M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A1.5,1.5 0 0,0 13.5,19.5C13.5,19.11 13.35,18.76 13.11,18.5C12.88,18.23 12.73,17.88 12.73,17.5A1.5,1.5 0 0,1 14.23,16H16A5,5 0 0,0 21,11C21,6.58 16.97,3 12,3Z',
};

// Get the SVG path for a bundled icon
export function getBundledIconPath(iconName: string): string | undefined {
  // Remove 'mdi:' prefix if present
  const name = iconName.replace(/^mdi:/, '');
  return bundledIcons[name];
}
```

**Step 3: Create icon renderer**

Create `src/icons/renderer.ts`:
```typescript
import sharp from 'sharp';
import { getBundledIconPath } from './mdi-bundled';
import { getCachedIcon, cacheIcon } from './cache';

const MDI_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg';

interface RenderOptions {
  size: number;
  iconColor: string;
  backgroundColor: string;
  title?: string;
  titlePosition?: 'top' | 'bottom';
  state?: string;
  statePosition?: 'top' | 'bottom';
}

export async function renderIcon(
  iconName: string,
  options: RenderOptions
): Promise<string> {
  const { size, iconColor, backgroundColor, title, titlePosition, state, statePosition } = options;

  // Get SVG path
  let svgPath = getBundledIconPath(iconName);

  if (!svgPath) {
    // Try to fetch from CDN
    svgPath = await fetchIconFromCDN(iconName);
  }

  if (!svgPath) {
    // Use a default icon
    svgPath = getBundledIconPath('help-circle') || 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z';
  }

  // Build SVG
  const iconSize = size * 0.5; // Icon takes 50% of button
  const iconOffset = (size - iconSize) / 2;

  let textElements = '';
  const fontSize = size * 0.12;

  if (state && statePosition === 'top') {
    textElements += `<text x="${size/2}" y="${fontSize + 4}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="white" text-anchor="middle">${escapeXml(state)}</text>`;
  }

  if (title && titlePosition === 'bottom') {
    textElements += `<text x="${size/2}" y="${size - 6}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="white" text-anchor="middle">${escapeXml(truncate(title, 12))}</text>`;
  }

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
      <g transform="translate(${iconOffset}, ${iconOffset})">
        <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24">
          <path d="${svgPath}" fill="${iconColor}"/>
        </svg>
      </g>
      ${textElements}
    </svg>
  `;

  // Convert to PNG and return as base64
  const pngBuffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  return `data:image/png;base64,${pngBuffer.toString('base64')}`;
}

async function fetchIconFromCDN(iconName: string): Promise<string | null> {
  const name = iconName.replace(/^mdi:/, '');

  // Check cache first
  const cached = await getCachedIcon(name);
  if (cached) {
    return extractPathFromSvg(cached);
  }

  try {
    const response = await fetch(`${MDI_CDN_BASE}/${name}.svg`);
    if (!response.ok) return null;

    const svgContent = await response.text();

    // Cache the SVG
    await cacheIcon(name, svgContent);

    return extractPathFromSvg(svgContent);
  } catch (error) {
    console.error(`Failed to fetch icon ${name}:`, error);
    return null;
  }
}

function extractPathFromSvg(svgContent: string): string | null {
  const match = svgContent.match(/d="([^"]+)"/);
  return match ? match[1] : null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

// Get default icon for a domain
export function getDefaultIconForDomain(domain: string): string {
  const domainIcons: Record<string, string> = {
    light: 'lightbulb',
    switch: 'power-plug',
    sensor: 'thermometer',
    binary_sensor: 'motion-sensor',
    climate: 'thermostat',
    fan: 'fan',
    lock: 'lock',
    cover: 'blinds',
    door: 'door',
    garage_door: 'garage',
    window: 'window-closed',
    media_player: 'play',
    scene: 'palette',
    script: 'script-text',
    automation: 'cog',
  };

  return domainIcons[domain] || 'home';
}
```

**Step 4: Update EntityButtonAction to use icon renderer**

Update `src/actions/entity-button.ts` to use the renderer:
```typescript
import { renderIcon, getDefaultIconForDomain } from "../icons/renderer";

// In updateButtonAppearance method:
private async updateButtonAppearance(
  action: any,
  entity: HAEntity,
  settings: EntityButtonSettings
): Promise<void> {
  const [domain] = entity.entity_id.split('.');
  const isOn = ['on', 'open', 'unlocked', 'playing', 'home'].includes(entity.state.toLowerCase());

  // Determine icon
  let iconName = settings.appearance.mdiIcon;
  if (!iconName || settings.appearance.iconSource === 'auto') {
    iconName = entity.attributes.icon?.replace('mdi:', '') || getDefaultIconForDomain(domain);
  }

  // Determine colors based on state
  const iconColor = isOn ? settings.appearance.iconColorOn : settings.appearance.iconColorOff;
  const bgColor = isOn
    ? (settings.appearance.backgroundColorOn || settings.appearance.backgroundColor)
    : (settings.appearance.backgroundColorOff || settings.appearance.backgroundColor);

  // Render icon
  const friendlyName = settings.appearance.titleOverride || entity.attributes.friendly_name || entity.entity_id;
  const stateText = this.formatState(entity);

  try {
    const imageData = await renderIcon(iconName, {
      size: 144, // Standard Stream Deck icon size
      iconColor,
      backgroundColor: bgColor,
      title: settings.appearance.showTitle ? friendlyName : undefined,
      titlePosition: settings.appearance.titlePosition,
      state: settings.appearance.showState ? stateText : undefined,
      statePosition: settings.appearance.statePosition,
    });

    await action.setImage(imageData);
    await action.setTitle(''); // Clear title since it's rendered in the image
  } catch (error) {
    console.error('Failed to render icon:', error);
    await action.setTitle(friendlyName);
  }
}
```

**Step 5: Commit**

```bash
git add src/icons/
git commit -m "feat: add icon rendering with bundled MDI icons and CDN fallback"
```

---

## Phase 4: Testing & Polish

### Task 9: Add Error Handling and Connection Status

**Files:**
- Modify: `src/plugin.ts`
- Modify: `src/actions/entity-button.ts`

**Step 1: Improve error handling in plugin.ts**

Update `src/plugin.ts`:
```typescript
import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { EntityButtonAction } from "./actions/entity-button";
import { haConnection } from "./homeassistant/connection";

streamDeck.logger.setLevel(LogLevel.DEBUG);

// Register actions
streamDeck.actions.registerAction(new EntityButtonAction());

// Track connection attempts
let connectionAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

async function connectToHA(url: string, token: string): Promise<void> {
  try {
    await haConnection.connect({ url, token });
    connectionAttempts = 0;
    streamDeck.logger.info("Connected to Home Assistant");
  } catch (error) {
    connectionAttempts++;
    streamDeck.logger.error(`Connection failed (attempt ${connectionAttempts}):`, error);

    if (connectionAttempts < MAX_RETRIES) {
      streamDeck.logger.info(`Retrying in ${RETRY_DELAY/1000}s...`);
      setTimeout(() => connectToHA(url, token), RETRY_DELAY);
    }
  }
}

// Handle global settings
streamDeck.settings.onDidReceiveGlobalSettings<{ haUrl?: string; haToken?: string }>((ev) => {
  const { haUrl, haToken } = ev.settings;

  if (haUrl && haToken) {
    if (!haConnection.isConnected()) {
      connectToHA(haUrl, haToken);
    }
  }
});

// Handle connection state changes
haConnection.subscribeToConnection((state) => {
  if (!state.connected && state.error) {
    streamDeck.logger.warn("Home Assistant disconnected:", state.error);
  }
});

streamDeck.connect();
```

**Step 2: Add disconnected state to buttons**

Update EntityButtonAction to show disconnected state:
```typescript
// In onWillAppear:
if (!haConnection.isConnected()) {
  await ev.action.setTitle("Not\nConnected");
  await ev.action.showAlert();
}

// Subscribe to connection state
haConnection.subscribeToConnection(async (state) => {
  if (!state.connected) {
    await ev.action.setTitle("Not\nConnected");
  } else {
    const entity = haConnection.getEntity(settings.entityId);
    if (entity) {
      await this.updateButtonAppearance(ev.action, entity, settings);
    }
  }
});
```

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add connection retry logic and disconnected state display"
```

---

### Task 10: Create Plugin Icons

**Files:**
- Create: `com.homeassistant.streamdeck.sdPlugin/imgs/plugin/icon.png`
- Create: `com.homeassistant.streamdeck.sdPlugin/imgs/plugin/icon@2x.png`
- Create: `com.homeassistant.streamdeck.sdPlugin/imgs/plugin/category-icon.png`
- Create: `com.homeassistant.streamdeck.sdPlugin/imgs/plugin/category-icon@2x.png`
- Create: `com.homeassistant.streamdeck.sdPlugin/imgs/actions/entity-button/icon.png`
- Create: `com.homeassistant.streamdeck.sdPlugin/imgs/actions/entity-button/state.png`

**Step 1: Generate icons using sharp**

Create a script `scripts/generate-icons.ts`:
```typescript
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const HA_BLUE = '#41BDF5';
const HA_ICON_PATH = 'M12,3L2,12H5V20H19V12H22L12,3M12,8.5C14.34,8.5 16.46,9.43 18,10.94L16.8,12.12C15.58,10.91 13.88,10.17 12,10.17C10.12,10.17 8.42,10.91 7.2,12.12L6,10.94C7.54,9.43 9.66,8.5 12,8.5M12,11.83C13.4,11.83 14.67,12.39 15.6,13.3L14.4,14.47C13.79,13.87 12.94,13.5 12,13.5C11.06,13.5 10.21,13.87 9.6,14.47L8.4,13.3C9.33,12.39 10.6,11.83 12,11.83M12,15.17C12.94,15.17 13.7,15.91 13.7,16.83C13.7,17.75 12.94,18.5 12,18.5C11.06,18.5 10.3,17.75 10.3,16.83C10.3,15.91 11.06,15.17 12,15.17Z';

async function generateIcon(size: number, outputPath: string): Promise<void> {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#1a1a1a"/>
      <path d="${HA_ICON_PATH}" fill="${HA_BLUE}"/>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
}

async function main() {
  const imgDir = path.join(__dirname, '../com.homeassistant.streamdeck.sdPlugin/imgs');

  // Plugin icons
  await generateIcon(72, path.join(imgDir, 'plugin/icon.png'));
  await generateIcon(144, path.join(imgDir, 'plugin/icon@2x.png'));
  await generateIcon(28, path.join(imgDir, 'plugin/category-icon.png'));
  await generateIcon(56, path.join(imgDir, 'plugin/category-icon@2x.png'));

  // Action icons
  await generateIcon(20, path.join(imgDir, 'actions/entity-button/icon.png'));
  await generateIcon(40, path.join(imgDir, 'actions/entity-button/icon@2x.png'));
  await generateIcon(72, path.join(imgDir, 'actions/entity-button/state.png'));
  await generateIcon(144, path.join(imgDir, 'actions/entity-button/state@2x.png'));

  console.log('Icons generated successfully!');
}

main().catch(console.error);
```

**Step 2: Run icon generation**

```bash
npx ts-node scripts/generate-icons.ts
```

**Step 3: Commit**

```bash
git add scripts/ com.homeassistant.streamdeck.sdPlugin/imgs/
git commit -m "feat: add plugin and action icons"
```

---

### Task 11: Final Build and Test

**Step 1: Full build**

```bash
npm run build
```

**Step 2: Verify plugin loads in Stream Deck**

1. Restart Stream Deck software
2. Find "Home Assistant" in the action list
3. Drag "Entity Button" to a key
4. Configure connection in Property Inspector
5. Select an entity
6. Test button press

**Step 3: Fix any issues and commit**

```bash
git add -A
git commit -m "fix: resolve issues found in final testing"
```

**Step 4: Tag release**

```bash
git tag -a v0.1.0 -m "Initial release - Entity Button with real-time state sync"
git push origin main --tags
```

---

## Summary

**What we built:**
- Stream Deck plugin using Elgato SDK
- Home Assistant WebSocket connection with auto-reconnect
- Entity Button action with toggle/on/off/service call support
- Property Inspector with search, area, and domain filtering
- Dynamic icon rendering with MDI icons
- State-based appearance (colors change based on entity state)

**Next phases (future):**
- Phase 4: Quick Setup Wizard
- Phase 5: Profile Designer web app
- Phase 6: Appearance presets
- Phase 7: Long-press actions
