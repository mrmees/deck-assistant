# Label Configuration & Layout Improvements Design

## Overview

Two related improvements to the layout editor:

1. **Label Configuration** - Per-group settings for button labels (name, state, both, none)
2. **Layout Ordering** - Simplified, user-controlled render order with ungrouped as sortable item

---

## Part 1: Label Configuration

### Label Style Options

| Option | Entity Buttons | Folder Buttons |
|--------|---------------|----------------|
| `none` | Icon only | Icon only |
| `name` | Friendly name | Folder/group name |
| `state` | Current state (e.g., "On", "72°F") | Entity count (e.g., "5 items") |
| `name-and-state` | Name above, state below | Name above, count below |

### Data Model

```javascript
// Group style (existing + new)
groupStyles: {
    "Living Room": {
        // Existing colors
        preset: 'modern',
        background: '#1a1a2e',
        onOff: '#4CAF50',
        information: '#2196F3',
        trigger: '#FF9800',

        // New label setting
        labelStyle: 'name'  // 'none' | 'name' | 'state' | 'name-and-state'
    }
}

// Ungrouped style (same structure)
ungroupedStyle: {
    preset: null,
    background: '#1a1a2e',
    onOff: '#4CAF50',
    information: '#2196F3',
    trigger: '#FF9800',
    labelStyle: 'name'
}
```

### Default Value

- `labelStyle`: `'name'` (show friendly name)

### Preview Rendering

**Entity Buttons:**
- `none`: Icon only, no label
- `name`: Friendly name below icon
- `state`: Live state from HA below icon
- `name-and-state`: Name above icon area, state below (stacked)

**Folder Buttons:**
- `none`: Folder icon only
- `name`: Group name below icon
- `state`: Entity count (e.g., "5 items")
- `name-and-state`: Name + count

**Navigation Buttons:**
- Always show arrow symbol (←, →, ↑)
- Not configurable

### Profile Generation

Stream Deck native titles left blank - users can add their own in Elgato software:

```javascript
States: [{
    Title: '',  // Blank
    ShowTitle: false
}]
```

Our plugin renders text on the button image based on `labelStyle` setting.

---

## Part 2: Layout Ordering Improvements

### Current Problems

1. Ungrouped entities have fixed position in render order
2. Folder buttons always render first
3. Page-type groups can accidentally end up in main page flow
4. No visual separation between main page items and separate pages

### New Group Display Options UI

```
┌─────────────────────────────────────────┐
│ Main Page Layout                        │
│ Drag to set render order                │
├─────────────────────────────────────────┤
│ ≡ Lights           [Flat ▾]             │
│ ≡ Rooms            [Folder ▾]           │
│ ≡ Ungrouped Items  [Flat]    (locked)   │
│ ≡ Scenes           [Flat ▾] ☑ New Row   │
│ ≡ Climate          [Flat ▾]             │
├─────────────────────────────────────────┤
│ Separate Pages                          │
│ Render at end of navigation chain       │
├─────────────────────────────────────────┤
│ ≡ Automations      [Page]    (locked)   │
│ ≡ Scripts          [Page]    (locked)   │
└─────────────────────────────────────────┘
```

### Key Behaviors

1. **Ungrouped is sortable** - Appears as "Ungrouped Items" in the list, can be dragged to any position in the main page section

2. **Folders render in user order** - No longer forced first; renders wherever user places it in the sort order

3. **Page groups separated** - Visually distinct section at bottom, can't be dragged into main page section

4. **Display type changes move items** - Changing a group to "Page" moves it to the bottom section; changing from "Page" moves it to main section

5. **New Row option** - Checkbox for flat groups; when checked, group starts on column 0 of next row

### Render Order Logic

**Phase 1: Main Page Flow**
Process items in user's sort order:
- **Folder**: Place folder button, continue flow
- **Flat (no new-row)**: Place entities, continue flow
- **Ungrouped**: Place entities, continue flow
- **Flat (new-row)**: Skip for now (Phase 2)

**Phase 2: New Row Groups**
For each flat group with `startNewRow: true` (in user's sort order):
- Move to column 0 of next row
- Place entities

**Phase 3: Overflow & Page Groups**
- If main page overflows, create overflow pages with ←/→ navigation
- Page-type groups render as separate pages at end of navigation chain

### Data Model Changes

```javascript
// Wizard selections
wizardSelections: {
    groups: [
        {
            name: "Lights",
            displayType: "flat",      // 'folder' | 'flat' | 'page'
            startNewRow: false,       // New: only applies to flat
            entities: [...]
        },
        {
            name: "Rooms",
            displayType: "folder",
            entities: [...]
        }
    ],
    ungroupedEntities: [...],
    ungroupedPosition: 2,             // New: index in sort order (0-based)
}
```

### Example Layout

**User's configured order:**
1. Lights (Flat)
2. Rooms (Folder)
3. Ungrouped Items
4. Scenes (Flat, new row)
5. Climate (Flat)
---
6. Automations (Page)

**Phase 1** processes in order, skipping new-row items:
- Lights (Flat) → place entities
- Rooms (Folder) → place folder button
- Ungrouped → place entities
- Scenes (Flat, new row) → SKIP for Phase 2
- Climate (Flat) → place entities

**Phase 2** processes new-row items in their configured order:
- Scenes → start at column 0 of next row, place entities

**5-column grid result:**
```
Row 0: [Light1] [Light2] [Rooms] [Ungr1] [Ungr2]
Row 1: [Ungr3 ] [Clim1 ] [Clim2] [     ] [  →  ]
Row 2: [Scene1] [Scene2] [Scene3] [    ] [     ]  ← New row for Scenes
```

Navigation to Page groups (Automations) available via → button.

---

## UI Changes Summary

### Group Style Controls (both grouped and ungrouped)

Add label dropdown:
```html
<div class="style-control-row">
    <label>Labels</label>
    <select class="style-select" ...>
        <option value="none">Icon Only</option>
        <option value="name">Name</option>
        <option value="state">State</option>
        <option value="name-and-state">Name + State</option>
    </select>
</div>
```

### Group Display Options Page

1. Add "Ungrouped Items" as draggable item in the list
2. Add visual separator before Page-type groups
3. Add "New Row" checkbox for Flat groups
4. Lock display type selector for Ungrouped (always "Flat")
5. Lock display type selector for Page groups (can't change in this section)

---

## Files to Modify

### Label Configuration
1. `layout-editor.js` - Add `labelStyle` to defaults and presets
2. `layout-editor.html` - Add label dropdown to style controls
3. `profile-generator.ts` - Pass `labelStyle` to entity settings

### Layout Ordering
1. `layout-editor.js` - Update `buildPagesFromStyleEditor()` for new render logic
2. `layout-editor.html` - Update group display options UI with sections
3. `layout-editor.css` - Styles for separated sections

---

## Implementation Order

1. Layout ordering changes (more foundational)
   - Add ungrouped to sortable list
   - Separate page groups visually
   - Implement new-row option
   - Update render logic

2. Label configuration
   - Add labelStyle to data model
   - Add UI controls
   - Update preview rendering
   - Update profile generator
