# Home Assistant Stream Deck Plugin - Design Document

**Date:** 2026-01-31
**Status:** Design Complete, Awaiting Implementation

---

## Project Overview

### Goal
Create a Stream Deck plugin that integrates with Home Assistant, making it easy to add HA entities as Stream Deck buttons with full customization and real-time state updates.

### Key Principles
- **Easy entity discovery** - Filter by area, domain, or search by name (user has hundreds of entities)
- **Full customization** - Appearance, icons, colors, actions all configurable
- **No extra services** - Plugin runs inside Elgato's Stream Deck software, no background processes
- **Real-time updates** - Button icons reflect current HA entity states via WebSocket

### Target Users
- Home Assistant users with Stream Deck hardware
- Users running Elgato's official Stream Deck software
- Home Assistant accessible via local API (http://192.168.x.x:8123)

---

## Architecture

### Approach: Stream Deck SDK Plugin

We chose the SDK Plugin approach over direct HID communication because:
- User already runs Elgato's Stream Deck software
- No additional background service required
- Easier development (Node.js/TypeScript)
- Native integration with Stream Deck UI

### Component Diagram

```
┌─────────────────────────────────────────────────┐
│           Elgato Stream Deck Software           │
│  ┌───────────────────────────────────────────┐  │
│  │   Home Assistant Plugin (Node.js)         │  │
│  │   - Connects to HA via WebSocket          │  │
│  │   - Subscribes to entity state changes    │  │
│  │   - Sends commands on button press        │  │
│  │   - Dynamically updates button icons      │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │   Property Inspector (HTML/JS)            │  │
│  │   - Per-button configuration UI           │  │
│  │   - Fetches entities from HA              │  │
│  │   - Entity picker, action selector        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
            │                      │
            ▼                      ▼
    ┌──────────────┐      ┌──────────────────┐
    │ Stream Deck  │      │  Home Assistant  │
    │   Hardware   │      │   (Local API)    │
    └──────────────┘      └──────────────────┘
```

---

## Plugin Actions

Two action types included:

| Action | Purpose |
|--------|---------|
| **Entity Button** | Main action - any HA entity with full display + action options |
| **Service Call** | Advanced - call arbitrary HA services with custom data |

The Entity Button adapts its default behavior based on domain but allows any action to be assigned to any entity (e.g., a sensor button can still trigger a service call).

---

## Property Inspector (Configuration UI)

### Entity Discovery

The core UX challenge: user has hundreds of entities and needs fast discovery.

**Multi-filter Entity Picker:**

```
┌─────────────────────────────────────────────────┐
│  Home Assistant Entity                          │
├─────────────────────────────────────────────────┤
│  🔍 [Search by name...                    ]     │
│                                                 │
│  Area:        [All Areas         ▼]            │
│  Domain:      [All Types         ▼]            │
│               ☑ light  ☑ switch  ☑ sensor      │
│               ☐ climate ☐ cover  ☐ media_player│
│                                                 │
├─────────────────────────────────────────────────┤
│  Matching Entities (12):                        │
│  ┌─────────────────────────────────────────┐   │
│  │ 💡 Living Room Lamp              [Select]│   │
│  │ 💡 Kitchen Lights                [Select]│   │
│  │ 🔌 Office Fan                    [Select]│   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  Selected: light.living_room_lamp              │
│                                                 │
│  Action:      [Toggle (Recommended) ▼]         │
│  Display:     [State + Icon         ▼]         │
└─────────────────────────────────────────────────┘
```

**Filtering capabilities:**
- **Search** - Real-time text filtering by friendly name or entity_id
- **Area dropdown** - Filter by HA area (Living Room, Kitchen, etc.)
- **Domain checkboxes** - Filter by entity type (light, switch, sensor, etc.)
- **Filters combine** - All filters work together (AND logic)

### Connection Setup

**First-run prompt approach:**
- First HA button added triggers connection setup
- User enters HA URL + long-lived access token
- After connected, small "⚙️ Connection" link available to edit later
- If token becomes invalid, prompt again automatically

```
┌─────────────────────────────────────────────────┐
│  Connect to Home Assistant                      │
├─────────────────────────────────────────────────┤
│  No connection configured yet.                  │
│                                                 │
│  URL:    [http://                         ]     │
│  Token:  [                                ]     │
│                                                 │
│  [How do I get a token?]        [Connect]      │
└─────────────────────────────────────────────────┘
```

---

## Actions & Button Behavior

### Default Actions by Domain

| Domain | Default Actions |
|--------|-----------------|
| `light` | Toggle, Turn On, Turn Off, Set Brightness |
| `switch` | Toggle, Turn On, Turn Off |
| `cover` | Open, Close, Toggle, Set Position |
| `climate` | Set Temperature (+/-), Set Mode |
| `media_player` | Play/Pause, Volume +/-, Mute, Next/Prev |
| `scene` | Activate |
| `script` | Run |
| `lock` | Lock, Unlock, Toggle |
| `sensor` | Display only (default), but action can be assigned |

### Any Entity Can Have Any Action

Even display-focused entities (sensors) can have actions assigned:

```
┌─────────────────────────────────────────────────┐
│  Selected: sensor.outdoor_temperature           │
├─────────────────────────────────────────────────┤
│  On Press:                                      │
│  ○ No action (display only)                     │
│  ○ Call service:                                │
│    Domain:  [climate           ▼]              │
│    Service: [set_temperature   ▼]              │
│    Target:  [climate.living_room ▼]            │
│    Data:    temperature: 72                     │
│  ○ Navigate to folder: [Thermostat Controls ▼] │
└─────────────────────────────────────────────────┘
```

### Button Press Types

- **Single press** - Primary action (e.g., Toggle)
- **Long press** - Secondary action (e.g., open brightness control)

---

## Appearance Customization

### Per-Button Display Options

```
┌─────────────────────────────────────────────────┐
│  Appearance                                     │
├─────────────────────────────────────────────────┤
│  Title:       [Living Room    ] ☑ Show title   │
│  Title Position: [Bottom ▼]                     │
│                                                 │
│  State Value: ☑ Show state (e.g., "72°F", "On")│
│  State Position: [Top ▼]                        │
│                                                 │
├─────────────────────────────────────────────────┤
│  Icon Style:                                    │
│  ○ Auto (domain default)                        │
│  ○ Home Assistant icon (mdi:lightbulb)          │
│  ○ Custom image [Browse...]                     │
│                                                 │
│  Icon Color:                                    │
│  On State:  [■ #FFD700 ▼] (or use entity color) │
│  Off State: [■ #808080 ▼]                       │
│                                                 │
├─────────────────────────────────────────────────┤
│  Background:                                    │
│  ○ Solid color  [■ #1a1a1a ▼]                  │
│  ○ Gradient     [■ #1a1a1a] → [■ #2d2d2d]      │
│  ○ Custom image [Browse...]                     │
│                                                 │
│  Background changes with state: ☑              │
│  On: [■ #2d3a2d ▼]  Off: [■ #1a1a1a ▼]        │
└─────────────────────────────────────────────────┘
```

### Features

- **Title** - Override friendly name, toggle visibility, position (top/bottom/none)
- **State display** - Show/hide current value, position
- **Icon source** - Auto-detect, HA's MDI icons, or custom image
- **Icon colors** - Per-state colors, or inherit from HA entity attributes
- **Background** - Solid, gradient, or image; optionally changes with state
- **Font size** - Auto-fit or manual selection

### Presets

- Save current appearance as a preset
- Apply presets across multiple buttons
- Built-in presets: Minimal, Detailed, Icon-only

---

## Icon Handling

### Hybrid Approach (Chosen)

Home Assistant uses Material Design Icons (MDI) - 7,000+ icons referenced by name (e.g., `mdi:lightbulb`).

**Strategy:**
1. Bundle ~200 most common icons with plugin (~1-2MB)
2. Fetch missing icons from CDN (`cdn.jsdelivr.net/npm/@mdi/svg`)
3. Cache fetched icons locally (never re-download)
4. User can upload custom images to override any icon

**Icon Rendering Pipeline:**
1. Read entity's `icon` attribute from HA
2. Check local bundle → if missing, fetch from CDN → cache
3. Render SVG to PNG at correct size (72x72 or 96x96 depending on device)
4. Apply user's color settings

---

## Home Assistant Connection

### Authentication

- **URL** - Local HA instance (e.g., `http://192.168.1.100:8123`)
- **Token** - Long-lived access token from HA Profile → Security

### Connection Strategy

1. **WebSocket for real-time updates**
   - Subscribe to `state_changed` events
   - Button icons update instantly when entities change
   - Auto-reconnect with exponential backoff

2. **REST API for actions**
   - `POST /api/services/{domain}/{service}` to trigger actions

3. **REST API for initial data**
   - Fetch all entities, areas, device registry on startup
   - Refresh when Property Inspector opens

### Offline Behavior

- Cache last known states
- Show "disconnected" indicator on buttons
- Queue actions and retry when connection restored

---

## Layout & Organization Tools

### Two Complementary Tools

| Tool | Use Case | Location |
|------|----------|----------|
| **Quick Setup Wizard** | Fill a folder with entities from an area | Inside Property Inspector |
| **Profile Designer** | Design complete multi-page layouts | Separate web app |

### Quick Setup Wizard (In-Plugin)

- Special action: "HA Quick Setup"
- Drag onto first button of empty folder
- Select area + domains → auto-populates remaining buttons
- Applies default appearance preset
- Wizard button can be deleted after use

```
┌─────────────────────────────────────────────────┐
│  Quick Setup - Populate Folder                  │
├─────────────────────────────────────────────────┤
│  Area:    [Living Room ▼]                       │
│  Include: ☑ Lights  ☑ Switches  ☐ Sensors      │
│                                                 │
│  Found 6 entities. This will fill the current  │
│  folder with buttons for each.                  │
│                                                 │
│  [Preview]                    [Create Buttons]  │
└─────────────────────────────────────────────────┘
```

### Profile Designer (Web App)

- Spin up locally when needed
- Visual drag-and-drop grid matching Stream Deck model
- Create multiple pages/folders
- Bulk appearance settings
- Export `.streamDeckProfile` → import into Stream Deck software
- No background service - close when done

```
┌─────────────────────────────────────────────────────────────┐
│  Profile Designer                          [Export Profile] │
├──────────────────┬──────────────────────────────────────────┤
│  Areas           │   Stream Deck XL (8x4)                   │
│  ├ Living Room   │  ┌────┬────┬────┬────┬────┬────┬────┬────┤
│  ├ Kitchen       │  │ 💡 │ 💡 │ 💡 │ 🔌 │    │    │    │ 📁 │
│  └ Bedroom       │  ├────┼────┼────┼────┼────┼────┼────┼────┤
│                  │  │    │    │    │    │    │    │    │    │
│  Entities        │  ├────┼────┼────┼────┼────┼────┼────┼────┤
│  (drag to grid)  │  │    │    │    │    │    │    │    │    │
│  💡 Lamp         │  └────┴────┴────┴────┴────┴────┴────┴────┘
│  💡 Ceiling      │                                          │
│  🔌 Fan          │  Pages: [Main] [Lights] [Media] [+]      │
└──────────────────┴──────────────────────────────────────────┘
```

---

## Technical Structure

### Plugin Files

```
com.homeassistant.streamdeck.sdPlugin/
├── manifest.json              # Plugin metadata, action definitions
├── bin/
│   └── plugin.js              # Compiled Node.js plugin code
├── ui/
│   ├── entity-button.html     # Property Inspector for Entity Button
│   ├── service-call.html      # Property Inspector for Service Call
│   ├── quick-setup.html       # Quick Setup Wizard
│   ├── connection-setup.html  # First-run connection modal
│   └── css/
│       └── styles.css         # Shared styles
├── imgs/
│   ├── plugin-icon.png        # Plugin icon
│   ├── action-icons/          # Default action icons
│   └── mdi/                   # Bundled MDI icon subset (~200 icons)
└── icon-cache/                # Downloaded icons cached here
```

### Key Dependencies

- `@elgato/streamdeck` - SDK for plugin communication
- `home-assistant-js-websocket` - Official HA WebSocket client
- `sharp` or `canvas` - SVG to PNG rendering for icons

### Profile Designer (Separate Package)

- Standalone web app (run via npx or local install)
- Connects to HA to fetch entities
- Exports Stream Deck profile files
- No dependency on the plugin itself

---

## Implementation Phases

### Phase 1: Core Plugin
- [ ] Plugin scaffold with Elgato SDK
- [ ] HA connection (WebSocket + REST)
- [ ] Entity Button action with basic entity picker
- [ ] Real-time state updates on buttons

### Phase 2: Enhanced Property Inspector
- [ ] Multi-filter entity picker (search, area, domain)
- [ ] Full action configuration
- [ ] Appearance customization

### Phase 3: Icons
- [ ] Bundle common MDI icons
- [ ] CDN fetch for missing icons
- [ ] Icon caching
- [ ] Custom image upload

### Phase 4: Organization Tools
- [ ] Quick Setup Wizard
- [ ] Profile Designer web app

### Phase 5: Polish
- [ ] Presets system
- [ ] Offline handling
- [ ] Error states and user feedback
- [ ] Documentation

---

## References

- [Stream Deck SDK Documentation](https://docs.elgato.com/streamdeck/sdk/)
- [Stream Deck SDK GitHub](https://github.com/elgatosf/streamdeck)
- [Stream Deck HID Protocol](https://docs.elgato.com/streamdeck/hid/) (not used, but documented)
- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/)
- [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/)
- [Material Design Icons](https://pictogrammers.com/library/mdi/)
