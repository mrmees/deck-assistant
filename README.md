# Deck Assistant

A Stream Deck plugin for controlling Home Assistant entities. Transform your Elgato Stream Deck into a powerful smart home controller with visual feedback and intuitive button layouts.

## Features

- **Entity Control** - Toggle lights, switches, run scripts, trigger automations, and more
- **Live State Display** - Button icons update in real-time to reflect entity states
- **Visual Layout Editor** - Intuitive wizard for organizing entities into groups and pages
- **Theming System** - Per-group color schemes with category-based colors (On/Off, Information, Trigger)
- **Flexible Labels** - Choose between icon only, name, state, or name+state display per group
- **Profile Generation** - Export configurations as importable Stream Deck profiles
- **MDI Icons** - Material Design Icons with CDN fallback for rich visual representation

## Requirements

- Elgato Stream Deck software v6.9 or later
- Home Assistant instance with Long-Lived Access Token
- Node.js 20+ (for development)

## Installation

### From Release (Recommended)

1. Download the latest `.streamDeckPlugin` file from [Releases](https://github.com/mrmees/deck-assistant/releases)
2. Double-click to install in Stream Deck software

### From Source

```bash
# Clone the repository
git clone https://github.com/mrmees/deck-assistant.git
cd deck-assistant

# Install dependencies
npm install

# Build the plugin
npm run build

# Package for installation
npm run pack
```

## Configuration

### Home Assistant Setup

1. In Home Assistant, go to your profile
2. Scroll down to "Long-Lived Access Tokens"
3. Create a new token and copy it

### Plugin Setup

1. Add a "Settings" action to your Stream Deck
2. Click the button to open the Layout Editor
3. Enter your Home Assistant URL and token
4. Use the wizard to select and organize entities

## Layout Editor

The Layout Editor provides a visual way to configure your Stream Deck:

### Wizard Mode

1. **Select Entities** - Choose which Home Assistant entities to include
2. **Create Groups** - Organize entities by room, device type, or custom groupings
3. **Configure Layout** - Set how groups display:
   - **Folder** - Button opens a sub-page with group entities
   - **Flat** - Entities render directly on the main page
   - **Page** - Entities on separate pages at end of navigation
4. **Style Groups** - Apply color themes and label preferences per group

### Style Options

Each group supports:
- **Background Color** - Button background
- **Category Colors** - On/Off (controllable), Information (sensors), Trigger (scripts/automations)
- **Theme Presets** - Modern, Classic, Minimal, Vibrant
- **Label Style** - Icon Only, Name, State, or Name + State

### Layout Ordering

- Drag groups to reorder render priority
- Ungrouped items can be positioned anywhere in the layout
- "New Row" option forces flat groups to start on a new row
- Page groups are visually separated and render at the navigation chain end

## Development

```bash
# Start development mode with hot reload
npm run start

# Watch for changes and rebuild
npm run watch

# Run linting
npm run lint
```

### Project Structure

```
deck-assistant/
├── src/
│   ├── plugin.ts           # Main plugin entry point
│   ├── actions/            # Stream Deck action handlers
│   ├── homeassistant/      # HA WebSocket connection
│   ├── icons/              # Icon rendering utilities
│   └── layout/             # Profile generation
├── com.deckassistant.sdPlugin/
│   ├── manifest.json       # Plugin manifest
│   ├── bin/                # Compiled plugin code
│   ├── ui/                 # Property Inspector HTML/CSS/JS
│   └── imgs/               # Plugin and action icons
└── docs/
    └── plans/              # Design and implementation docs
```

### Key Technologies

- **@elgato/streamdeck** - Official Stream Deck SDK
- **home-assistant-js-websocket** - Home Assistant WebSocket client
- **Alpine.js** - Reactive UI for the Layout Editor
- **TypeScript** - Type-safe plugin development
- **Rollup** - Module bundling

## Entity Categories

Entities are automatically categorized for color coding:

| Category | Color Purpose | Entity Types |
|----------|--------------|--------------|
| Controllable | On/Off toggle color | light, switch, cover, lock, fan, media_player, vacuum, climate, etc. |
| Informational | Information display color | sensor, binary_sensor, weather, device_tracker, person, etc. |
| Trigger | Action trigger color | script, scene, automation, input_boolean, timer, etc. |

## Troubleshooting

### Connection Issues

- Verify Home Assistant URL is accessible from your computer
- Ensure the Long-Lived Access Token is valid
- Check that Home Assistant WebSocket API is enabled

### Icons Not Displaying

- Icons use Material Design Icons (MDI)
- First load fetches from CDN and caches locally
- Check `icon-cache/` folder for cached icons

### Layout Not Saving

- Profile generation requires clicking "Generate Profile"
- Profiles are exported as `.streamDeckProfile` files
- Import the generated file through Stream Deck software

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## Credits

- [Elgato Stream Deck SDK](https://developer.elgato.com/documentation/stream-deck/)
- [Home Assistant](https://www.home-assistant.io/)
- [Material Design Icons](https://materialdesignicons.com/)
- Profile generation based on [streamdeck-profile-generator](https://github.com/data-enabler/streamdeck-profile-generator)
