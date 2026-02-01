# Layout Editor Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Layout Editor that generates importable Stream Deck profile files with pre-configured Home Assistant entity buttons.

**Architecture:** Web-based editor opens in popup window, communicates with plugin via Stream Deck websocket, generates `.streamDeckProfile` files that users import.

**Tech Stack:** HTML/CSS/JS frontend, Node.js plugin backend, Home Assistant WebSocket API

---

## Overview

The Layout Editor solves the problem that the Stream Deck SDK doesn't allow plugins to programmatically create or modify profiles. Instead, we generate a `.streamDeckProfile` file that users import manually.

### Credits

Profile file format research based on [data-enabler/streamdeck-profile-generator](https://github.com/data-enabler/streamdeck-profile-generator).

---

## User Flow

### 1. Opening the Editor

- User clicks "Open Layout Editor" in Settings Property Inspector
- 1600x1000 popup window opens (configurable via manifest)
- Editor connects to Stream Deck websocket using passed connection params
- Editor requests connected device info and Home Assistant entities from plugin

### 2. Entity Selection (Wizard Flow)

**Primary Option: Free-form Selection**
- Display all HA entities in a searchable, filterable list
- Filters: Domain (light, switch, sensor), Area, Search text
- User checks entities to include
- Multi-select with shift-click, select-all per filter

**Alternative: Guided Flow**
- "Guide me by room" button starts step-by-step wizard
- Step 1: Select an area/room
- Step 2: Select entity types (Lights, Switches, Media, etc.)
- Step 3: Pick specific entities from filtered list

### 3. Grouping & Organization

After entity selection:
- System proposes smart groupings based on area/domain
- Visual preview shows proposed pages/folders
- User can:
  - Accept suggested groupings
  - Drag entities between groups
  - Rename groups
  - Create/delete groups
  - Set group order

### 4. Layout Preview

- Shows accurate Stream Deck grid based on connected device
- Device auto-detection (Standard 5x3, XL 8x4, Mini 2x3, etc.)
- Drag-and-drop entity placement on grid
- Multiple pages shown as tabs
- Folder navigation preview
- Button appearance preview (icon, colors, title)

### 5. Theming

- Base theme: Default colors, icon style
- Domain overrides: e.g., all lights get yellow accent
- Per-entity overrides: Individual customization
- Preview updates in real-time

### 6. Profile Generation

- Click "Generate Profile"
- Plugin generates `.streamDeckProfile` file containing:
  - Entity Button actions at correct grid positions
  - Settings pre-filled (entity ID, icon, colors, domain)
  - Folder structure for pages/groups
  - Back buttons for navigation
- File downloads to user's computer
- User double-clicks file to import into Stream Deck

### 7. Label Sync (Optional)

- Option to write `streamdeck:*` labels to selected entities in Home Assistant
- Labels encode hierarchy: `streamdeck:group:subgroup:order`
- Enables consistent organization on future layouts
- Sync with confirmation before writing

---

## Technical Architecture

### Communication Flow

```
Layout Editor                    Plugin                    Home Assistant
     |                             |                             |
     |-- getDeviceInfo ----------->|                             |
     |<-- deviceInfo --------------|                             |
     |                             |                             |
     |-- getEntities ------------->|                             |
     |                             |-- fetch entities ---------->|
     |                             |<-- entities ----------------|
     |<-- entitiesData ------------|                             |
     |                             |                             |
     |-- getAreas ---------------->|                             |
     |                             |-- fetch areas ------------->|
     |                             |<-- areas -------------------|
     |<-- areasData ---------------|                             |
     |                             |                             |
     |-- generateProfile {cfg} --->|                             |
     |                             |-- (build profile file) -----|
     |<-- profileFile (base64) ----|                             |
     |                             |                             |
     |-- syncLabels {entities} --->|                             |
     |                             |-- write labels ------------>|
     |                             |<-- success -----------------|
     |<-- labelsSynced ------------|                             |
```

### Message Types

**Editor → Plugin:**
- `getDeviceInfo` - Request connected Stream Deck device(s)
- `getEntities` - Request all HA entities with states
- `getAreas` - Request HA areas/rooms
- `getLabels` - Request entities with `streamdeck:*` labels
- `generateProfile` - Generate profile file with configuration
- `syncLabels` - Write labels to HA entities

**Plugin → Editor:**
- `deviceInfo` - Connected device model, size, UUID
- `entitiesData` - Array of entities with domain, area, state, attributes
- `areasData` - Array of areas/rooms
- `labelsData` - Entities organized by label hierarchy
- `profileFile` - Generated profile as base64 or download URL
- `labelsSynced` - Confirmation of label sync

### Profile File Structure

```javascript
{
  "Name": "Home Assistant",
  "Version": "2.0",
  "Device": {
    "Model": "StreamDeck",  // or StreamDeckXL, StreamDeckMini, etc.
    "UUID": "device-uuid"
  },
  "Pages": {
    "Current": "main-page-uuid",
    "pages": ["main-page-uuid", "lights-page-uuid", ...]
  },
  "Controllers": [{
    "Type": "Keypad",
    "Actions": {
      "0,0": {
        "UUID": "com.deckassistant.entity-button",
        "Name": "Entity Button",
        "Settings": {
          "entityId": "light.living_room",
          "domain": "light",
          "iconSource": "mdi",
          "mdiIcon": "lightbulb",
          "iconColor": "#FFEB3B",
          "backgroundColor": "#1C1C1C"
        },
        "States": [{ "Title": "" }]
      },
      "1,0": {
        "UUID": "com.elgato.streamdeck.profile.openchild",
        "Name": "Folder",
        "Settings": {
          "ProfileUUID": "lights-page-uuid"
        },
        "States": [{ "Title": "Lights" }]
      }
      // ... more positions
    }
  }]
}
```

### Device Grid Sizes

| Device | Columns | Rows | Total Buttons |
|--------|---------|------|---------------|
| Stream Deck Mini | 2 | 3 | 6 |
| Stream Deck | 5 | 3 | 15 |
| Stream Deck MK.2 | 5 | 3 | 15 |
| Stream Deck XL | 8 | 4 | 32 |
| Stream Deck + | 4 | 2 | 8 (+dials) |
| Stream Deck Neo | 4 | 2 | 8 |
| Stream Deck Pedal | 3 | 1 | 3 |

---

## UI Components

### Layout Editor Window

```
+------------------------------------------------------------------+
|  Deck Assistant - Layout Editor                            [X]   |
+------------------------------------------------------------------+
|  [Free-form] [Guide Me]                          Device: SD XL   |
+------------------------------------------------------------------+
|                        |                                          |
|  ENTITY SELECTION      |  LAYOUT PREVIEW                         |
|                        |                                          |
|  Filter: [___________] |  +--+--+--+--+--+--+--+--+               |
|  Domain: [All      v]  |  |  |  |  |  |  |  |  |  |               |
|  Area:   [All      v]  |  +--+--+--+--+--+--+--+--+               |
|                        |  |  |  |  |  |  |  |  |  |               |
|  [ ] light.living_room |  +--+--+--+--+--+--+--+--+               |
|  [ ] light.bedroom     |  |  |  |  |  |  |  |  |  |               |
|  [ ] switch.fan        |  +--+--+--+--+--+--+--+--+               |
|  [ ] sensor.temp       |  |  |  |  |  |  |  |  |  |               |
|  ...                   |  +--+--+--+--+--+--+--+--+               |
|                        |                                          |
|  Selected: 12 entities |  [Page 1] [Page 2] [+]                   |
|                        |                                          |
+------------------------+------------------------------------------+
|  GROUPS                |  THEMING                                 |
|                        |                                          |
|  [Living Room] (5)     |  Base Theme: [Dark        v]            |
|  [Bedroom] (4)         |  Light Color: [#FFEB3B]                  |
|  [Climate] (3)         |  Switch Color: [#4CAF50]                 |
|                        |                                          |
+------------------------+------------------------------------------+
|                    [Sync Labels to HA]  [Generate Profile]        |
+------------------------------------------------------------------+
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
- WebSocket message handlers for editor communication
- Device detection
- Entity/area fetching from Home Assistant

### Phase 2: Layout Editor UI
- Popup window with connection handling
- Entity list with filtering
- Basic grid preview (single page)
- Entity selection and assignment

### Phase 3: Profile Generation
- Profile file structure generation
- Multi-page/folder support
- Settings serialization for Entity Buttons
- File download mechanism

### Phase 4: Advanced Features
- Smart grouping suggestions
- Drag-and-drop layout editing
- Theming system
- Label sync to Home Assistant

---

## Design Decisions

1. **Profile naming:** Prompt user to enter a name before generating
2. **Page overflow:** Auto-create additional pages with navigation buttons
3. **Folder structure:** User chooses per-group (folder vs. flat page)
4. **Back button placement:** User configurable (default: bottom-right)
5. **Label sync:** No confirmation dialog, just execute
6. **UI framework:** Alpine.js for reactivity (lightweight)
7. **Default domain colors:**
   - Lights: #FFEB3B (yellow)
   - Switches: #4CAF50 (green)
   - Climate: #2196F3 (blue)
   - Media: #9C27B0 (purple)
   - Sensors: #9E9E9E (gray)
   - Covers: #FF9800 (orange)

## Open Questions

1. **Update flow:** How to update an existing profile vs. create new?
2. **Conflict handling:** What if entity no longer exists in HA?

---

## File Structure

```
com.deckassistant.sdPlugin/
├── ui/
│   ├── layout-editor.html      # Main editor UI
│   ├── js/
│   │   ├── layout-editor.js    # Editor logic
│   │   ├── profile-generator.js # Profile file generation
│   │   └── grid-preview.js     # Visual grid component
│   └── css/
│       └── layout-editor.css   # Editor styles
└── manifest.json
```

```
src/
├── layout/
│   ├── profile-generator.ts    # Profile file builder
│   └── device-info.ts          # Device detection
└── actions/
    └── settings.ts             # Extended for editor messages
```
