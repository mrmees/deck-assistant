# Deck Assistant - Project Memory

## Project Overview

Deck Assistant is NOT a granular layout/appearance editor. It exists to assist users in importing a large number of Home Assistant entities in a manner that allows natural grouping and subsequent layout of those entities, which are then exported to a profile for future use and refinement within the native Stream Deck application.

### Why This Plugin Exists

The native Stream Deck application is not particularly user-friendly and does not provide convenient bulk theming options. Setting up dozens of Home Assistant entities manually would require:
- Adding each entity button individually
- Configuring each button's appearance one at a time
- No way to apply consistent styling across groups of buttons

Deck Assistant solves this by providing:
1. **Bulk entity import** — Select many entities at once using Home Assistant's organizational concepts
2. **Natural grouping** — Organize by area, floor, domain, label, or other HA definitions
3. **Bulk theming** — Apply consistent styling to entire groups, not button-by-button
4. **Agreeable starting point** — Generate a uniform, visually coherent profile rather than bland defaults

### What This Plugin Does

1. Retrieves a thorough list of entity information from Home Assistant
2. Presents that information in a logical grouping workflow
3. Allows users to define as many groups as they choose through various Home Assistant definitions
4. Applies bulk theming options to groups for visual consistency
5. Generates a multi-page layout with proper navigation
6. Exports a profile ready for import into Stream Deck

### Important Limitations (By Design)

- The plugin does NOT allow defining multiple nested subgroups — that complexity is left to the user in the native Stream Deck app
- The plugin provides bulk theming options to groups (background color, icon color, text color) but is not meant for per-entity or pixel-perfect customization
- Generated profiles are a polished starting point, not a final product — users can further refine in Stream Deck software

## Design Decisions

### Theming Model

Theming is done at the **group level**, not globally or per-entity. Each group has 4 color settings:

| Setting | Controls |
|---------|----------|
| **Background** | Button background for all entities in the group |
| **On/Off** | Icon + text color for controllable entities (lights, switches, covers, locks, fans, media) |
| **Information** | Icon + text color for sensors and binary sensors |
| **Trigger** | Icon + text color for scripts, scenes, automations, input_* |

**Presets** (Dark, Blue, Minimal, etc.) are applied per-group as shortcuts that fill in all 4 colors. Users can then customize individual colors after applying a preset.

**Removed by design:**
- No global domain color pickers (the 3 category colors replace 27 domain colors)
- No separate text color setting (text matches icon color for each category)

This approach provides bulk theming with semantic meaning — entities are colored by their behavior (controllable vs informational vs trigger), not by their specific domain.

### Ungrouped Entities
Ungrouped entities (individually selected items outside of named groups) are treated as a nameless group. They are:
- Added in the order the user selected them
- Styled with bulk theming like any other group (background, icon, text color)
- NOT individually reorderable — that level of customization belongs in the native Stream Deck app

The user can apply quick-sort options during selection, but once selected, the order is fixed. This keeps the plugin focused on bulk operations rather than per-entity manipulation.

### Home Assistant Labels
The only use of labels in Home Assistant is to allow the user the convenience of filtering out other items during the wizard's group and entity selection steps. Labels are NOT used for any functional purpose - they are purely optional and help users who want to pre-tag entities for easier selection in future configurations.
