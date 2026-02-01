# Layout Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Layout Editor for generating Stream Deck profile files with Home Assistant entity buttons.

**Architecture:** Alpine.js frontend in popup window, Node.js plugin backend, websocket communication, profile file generation.

**Tech Stack:** Alpine.js, HTML/CSS, TypeScript, Stream Deck SDK

---

## Task 1: Install Alpine.js and Set Up Layout Editor Structure

**Files:**
- Create: `com.deckassistant.sdPlugin/ui/layout-editor.html`
- Create: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`
- Create: `com.deckassistant.sdPlugin/ui/css/layout-editor.css`

**Step 1: Create the HTML structure with Alpine.js**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Deck Assistant - Layout Editor</title>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <link rel="stylesheet" href="css/layout-editor.css">
</head>
<body>
    <div x-data="layoutEditor()" x-init="init()">
        <!-- Header -->
        <header class="header">
            <h1>Layout Editor</h1>
            <div class="device-info">
                <span x-text="deviceName"></span>
                <span class="connection-status" :class="connected ? 'connected' : 'disconnected'"></span>
            </div>
        </header>

        <!-- Main content area - will be built out in subsequent tasks -->
        <main class="main-content">
            <div class="status" x-text="status"></div>
        </main>
    </div>
    <script src="js/layout-editor.js"></script>
</body>
</html>
```

**Step 2: Create base CSS**

Dark theme matching Stream Deck aesthetic, flexbox layout, status indicators.

**Step 3: Create Alpine.js component skeleton**

```javascript
function layoutEditor() {
    return {
        // Connection state
        websocket: null,
        connected: false,
        status: 'Connecting...',

        // Device info
        deviceName: 'Unknown Device',
        deviceSize: { cols: 5, rows: 3 },

        // Data from plugin
        entities: [],
        areas: [],

        // User selections
        selectedEntities: [],
        groups: [],

        init() {
            this.connectWebSocket();
        },

        connectWebSocket() {
            // Get params from URL
            const params = new URLSearchParams(window.location.search);
            const port = params.get('port');
            const uuid = params.get('uuid');
            const registerEvent = params.get('registerEvent');

            if (!port || !uuid || !registerEvent) {
                this.status = 'Missing connection parameters';
                return;
            }

            this.websocket = new WebSocket('ws://127.0.0.1:' + port);
            this.websocket.onopen = () => this.onWebSocketOpen(uuid, registerEvent);
            this.websocket.onmessage = (evt) => this.onWebSocketMessage(evt);
            this.websocket.onerror = () => { this.status = 'Connection error'; };
            this.websocket.onclose = () => { this.connected = false; };
        },

        onWebSocketOpen(uuid, registerEvent) {
            // Register with Stream Deck
            this.websocket.send(JSON.stringify({ event: registerEvent, uuid: uuid }));
            this.connected = true;
            this.status = 'Connected';

            // Request initial data
            this.sendToPlugin({ event: 'getDeviceInfo' });
            this.sendToPlugin({ event: 'getEntities' });
            this.sendToPlugin({ event: 'getAreas' });
        },

        onWebSocketMessage(evt) {
            const message = JSON.parse(evt.data);
            if (message.event === 'sendToPropertyInspector') {
                this.handlePluginMessage(message.payload);
            }
        },

        handlePluginMessage(payload) {
            // Handle messages from plugin - implemented in later tasks
        },

        sendToPlugin(payload) {
            if (!this.websocket) return;
            this.websocket.send(JSON.stringify({
                event: 'sendToPlugin',
                action: 'com.deckassistant.settings',
                context: new URLSearchParams(window.location.search).get('uuid'),
                payload: payload
            }));
        }
    };
}
```

**Step 4: Test connection**

Run: `npm run build`
Open Layout Editor from Settings, verify connection status shows "Connected"

---

## Task 2: Plugin Message Handlers for Device Info and Entities

**Files:**
- Modify: `src/actions/settings.ts`
- Create: `src/layout/device-info.ts`

**Step 1: Create device info helper**

```typescript
// src/layout/device-info.ts
import streamDeck from "@elgato/streamdeck";

export interface DeviceInfo {
    id: string;
    name: string;
    model: string;
    cols: number;
    rows: number;
}

const DEVICE_SIZES: Record<string, { cols: number; rows: number }> = {
    'StreamDeck': { cols: 5, rows: 3 },
    'StreamDeckMini': { cols: 3, rows: 2 },
    'StreamDeckXL': { cols: 8, rows: 4 },
    'StreamDeckPlus': { cols: 4, rows: 2 },
    'StreamDeckNeo': { cols: 4, rows: 2 },
    'StreamDeckPedal': { cols: 3, rows: 1 },
};

export function getConnectedDevices(): DeviceInfo[] {
    const devices: DeviceInfo[] = [];
    // Use streamDeck.devices to get connected devices
    for (const device of streamDeck.devices) {
        const size = DEVICE_SIZES[device.type] || { cols: 5, rows: 3 };
        devices.push({
            id: device.id,
            name: device.type,
            model: device.type,
            cols: size.cols,
            rows: size.rows
        });
    }
    return devices;
}
```

**Step 2: Add message handlers to settings.ts**

Handle `getDeviceInfo`, `getEntities`, `getAreas` messages and respond via sendToPropertyInspector.

**Step 3: Fetch entities from Home Assistant**

Use existing `haConnection` to get entity list with states, areas, and domains.

**Step 4: Test data flow**

Verify Layout Editor receives device info and entity list.

---

## Task 3: Entity Selection UI

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`
- Modify: `com.deckassistant.sdPlugin/ui/css/layout-editor.css`

**Step 1: Add entity list panel HTML**

Left sidebar with search, domain filter, area filter, and scrollable entity list with checkboxes.

**Step 2: Add Alpine.js computed properties for filtering**

```javascript
get filteredEntities() {
    return this.entities.filter(e => {
        if (this.searchFilter && !e.entity_id.includes(this.searchFilter)) return false;
        if (this.domainFilter && e.domain !== this.domainFilter) return false;
        if (this.areaFilter && e.area_id !== this.areaFilter) return false;
        return true;
    });
},

get uniqueDomains() {
    return [...new Set(this.entities.map(e => e.domain))].sort();
}
```

**Step 3: Add selection handling**

Toggle selection, select all visible, clear selection, selection count display.

**Step 4: Style the entity list**

Compact rows, domain icons, friendly names, selected state highlighting.

---

## Task 4: Grid Preview Component

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`
- Modify: `com.deckassistant.sdPlugin/ui/css/layout-editor.css`

**Step 1: Add grid preview HTML**

Right panel showing Stream Deck grid based on device size (cols x rows).

```html
<div class="grid-preview">
    <div class="grid" :style="gridStyle">
        <template x-for="row in deviceSize.rows">
            <template x-for="col in deviceSize.cols">
                <div class="grid-cell"
                     :class="{ 'has-entity': getEntityAt(col-1, row-1) }"
                     @drop="handleDrop($event, col-1, row-1)"
                     @dragover.prevent>
                    <template x-if="getEntityAt(col-1, row-1)">
                        <div class="entity-preview">
                            <span x-text="getEntityAt(col-1, row-1).friendly_name"></span>
                        </div>
                    </template>
                </div>
            </template>
        </template>
    </div>
</div>
```

**Step 2: Add grid computed style**

```javascript
get gridStyle() {
    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${this.deviceSize.cols}, 1fr)`,
        gridTemplateRows: `repeat(${this.deviceSize.rows}, 1fr)`,
    };
}
```

**Step 3: Add page navigation**

Tabs for multiple pages, add page button, page management.

**Step 4: Style grid cells**

Square aspect ratio, rounded corners, dark background, hover states.

---

## Task 5: Smart Grouping Logic

**Files:**
- Create: `com.deckassistant.sdPlugin/ui/js/grouping.js`
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Create grouping algorithm**

```javascript
function suggestGroups(entities, areas) {
    const groups = [];

    // Group by area first
    const byArea = {};
    for (const entity of entities) {
        const areaId = entity.area_id || 'unassigned';
        if (!byArea[areaId]) byArea[areaId] = [];
        byArea[areaId].push(entity);
    }

    for (const [areaId, areaEntities] of Object.entries(byArea)) {
        const area = areas.find(a => a.area_id === areaId);
        groups.push({
            id: areaId,
            name: area?.name || 'Other',
            entities: areaEntities,
            type: 'folder', // default to folder, user can change
            backButtonPosition: 'bottom-right'
        });
    }

    return groups;
}
```

**Step 2: Add group management UI**

List of groups, rename, change type (folder/page), reorder, move entities between groups.

**Step 3: Add group assignment when selecting entities**

After entity selection, auto-group and show group editor.

---

## Task 6: Theming System

**Files:**
- Create: `com.deckassistant.sdPlugin/ui/js/theming.js`
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`

**Step 1: Define default domain colors**

```javascript
const DOMAIN_COLORS = {
    light: { icon: '#FFEB3B', background: '#1C1C1C' },
    switch: { icon: '#4CAF50', background: '#1C1C1C' },
    climate: { icon: '#2196F3', background: '#1C1C1C' },
    media_player: { icon: '#9C27B0', background: '#1C1C1C' },
    sensor: { icon: '#9E9E9E', background: '#1C1C1C' },
    cover: { icon: '#FF9800', background: '#1C1C1C' },
    fan: { icon: '#00BCD4', background: '#1C1C1C' },
    binary_sensor: { icon: '#607D8B', background: '#1C1C1C' },
};
```

**Step 2: Add theming panel UI**

Base theme section, per-domain overrides, preview.

**Step 3: Apply theming to grid preview**

Show entity icons with correct colors in grid cells.

---

## Task 7: Profile Generator Core

**Files:**
- Create: `src/layout/profile-generator.ts`
- Modify: `src/actions/settings.ts`

**Step 1: Create profile structure builder**

```typescript
// src/layout/profile-generator.ts
import { v4 as uuidv4 } from 'uuid';

interface ProfileConfig {
    name: string;
    device: { model: string; cols: number; rows: number };
    groups: Group[];
    theme: ThemeConfig;
}

interface Group {
    id: string;
    name: string;
    type: 'folder' | 'page';
    entities: EntityConfig[];
    backButtonPosition: string;
}

export function generateProfile(config: ProfileConfig): object {
    const mainPageUuid = uuidv4();
    const pages: Record<string, object> = {};

    // Build main page
    pages[mainPageUuid] = buildPage(config.groups, config.device, config.theme);

    // Build sub-pages for folders
    for (const group of config.groups) {
        if (group.type === 'folder') {
            const pageUuid = uuidv4();
            pages[pageUuid] = buildGroupPage(group, config.device, config.theme);
        }
    }

    return {
        Name: config.name,
        Version: '2.0',
        Device: { Model: config.device.model },
        Pages: {
            Current: mainPageUuid,
            pages: Object.keys(pages)
        },
        // ... full structure
    };
}
```

**Step 2: Build action objects**

Create Entity Button actions with settings, folder navigation actions with correct UUIDs.

**Step 3: Handle pagination**

When entities exceed page capacity, auto-create next/prev navigation buttons.

**Step 4: Add message handler in settings.ts**

Handle `generateProfile` message, call generator, return base64 encoded file.

---

## Task 8: Profile Download and Naming

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`

**Step 1: Add profile name prompt**

Modal dialog asking for profile name before generation.

**Step 2: Handle profile file response**

Receive base64 profile data from plugin, trigger browser download.

```javascript
downloadProfile(base64Data, filename) {
    const blob = new Blob([atob(base64Data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.streamDeckProfile';
    a.click();
    URL.revokeObjectURL(url);
}
```

**Step 3: Add success feedback**

Show success message with import instructions.

---

## Task 9: Label Sync to Home Assistant

**Files:**
- Modify: `src/actions/settings.ts`
- Modify: `src/homeassistant/connection.ts` (if needed)
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Add syncLabels message handler**

Receive entity list with group assignments, format as `streamdeck:group:order` labels.

**Step 2: Call Home Assistant label API**

Use HA WebSocket API to update entity labels.

**Step 3: Add UI button and feedback**

"Sync Labels to HA" button, loading state, success/error feedback.

---

## Task 10: Guided Wizard Flow

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Add wizard mode toggle**

"Free-form" vs "Guide Me" buttons at top.

**Step 2: Implement wizard steps**

Step 1: Select area/room
Step 2: Select entity types (domains)
Step 3: Pick specific entities
Step 4: Review and confirm

**Step 3: Wire wizard to main selection**

Wizard populates selectedEntities, then proceeds to grouping.

---

## Task 11: Drag and Drop Enhancement

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`
- Modify: `com.deckassistant.sdPlugin/ui/css/layout-editor.css`

**Step 1: Make entity list items draggable**

Add draggable attribute, dragstart handler with entity data.

**Step 2: Add drop zones on grid**

Handle drop on grid cells, assign entity to position.

**Step 3: Drag between groups**

Allow dragging entities between group lists.

**Step 4: Visual feedback**

Drag ghost, valid drop highlights, animation on drop.

---

## Task 12: Polish and Edge Cases

**Files:**
- Various

**Step 1: Error handling**

Connection failures, HA unavailable, empty entity list.

**Step 2: Loading states**

Spinners during data fetch, disabled buttons during generation.

**Step 3: Responsive layout**

Handle different window sizes gracefully.

**Step 4: Final testing**

Test with different device types, large entity lists, multi-page profiles.

---

## Task 13: Commit and Cleanup

**Step 1: Review all changes**

Run `npm run build`, verify no TypeScript errors.

**Step 2: Test end-to-end**

Open Layout Editor, select entities, generate profile, import into Stream Deck.

**Step 3: Commit with descriptive message**

```bash
git add .
git commit -m "feat: add Layout Editor for generating Stream Deck profiles

- Alpine.js-based popup window for entity selection
- Smart grouping by area with manual adjustment
- Visual grid preview matching connected device
- Profile file generation for user import
- Label sync to Home Assistant
- Theming with domain-based defaults

Credits: Profile format based on data-enabler/streamdeck-profile-generator"
```

---

## Dependencies to Install

```bash
npm install uuid
```

---

## Testing Checklist

- [ ] Layout Editor opens from Settings
- [ ] Device auto-detected correctly
- [ ] Entities load from Home Assistant
- [ ] Filtering works (search, domain, area)
- [ ] Entity selection persists
- [ ] Smart grouping suggests reasonable groups
- [ ] Groups can be renamed, reordered, changed type
- [ ] Grid preview shows correct device size
- [ ] Multi-page navigation works
- [ ] Theming applies to preview
- [ ] Profile name prompt appears
- [ ] Profile downloads as .streamDeckProfile
- [ ] Imported profile works in Stream Deck
- [ ] Label sync writes to Home Assistant
- [ ] Guided wizard flow completes successfully
- [ ] Drag and drop works
