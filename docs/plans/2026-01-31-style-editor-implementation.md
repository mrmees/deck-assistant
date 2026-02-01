# Style Editor Implementation Plan

## Overview
Replace the drag-and-drop layout editor with a Style Editor that focuses on visual styling of groups. Layout is determined automatically by wizard selections.

## Architecture

### Flow
1. **Wizard** → Define entities, groups, ordering, display types
2. **Style Editor** → Customize appearance with live Stream Deck preview
3. **Generate** → Create profile with blank titles, rendered button images

### Style Editor Layout

```
+------------------+------------------------+------------------+
|   Group Styles   |   Stream Deck Preview  |   Global Theme   |
|                  |                        |                  |
| [Living Room ▼]  |   +--+--+--+--+--+    | Presets:         |
|   BG: [____]     |   |  |  |  |  |  |    | [Dark] [Blue]    |
|   Icon: [____]   |   +--+--+--+--+--+    | [Minimal]        |
|   Text: [____]   |   |  |  |  |  |  |    |                  |
|                  |   +--+--+--+--+--+    | Domain Colors:   |
| [Kitchen ▼]      |   |  |  |  |  |  |    | light: [____]    |
|   ...            |   +--+--+--+--+--+    | switch: [____]   |
|                  |                        |                  |
| [Ungrouped ▼]    |   [Click folder to     | Back Button:     |
|   ...            |    preview sub-page]   | Position: [___]  |
+------------------+------------------------+------------------+
|                     [ Generate Profile ]                     |
+--------------------------------------------------------------+
```

## Implementation Tasks

### Phase 1: Wizard Completion Changes
- [ ] Remove confirm step from wizard (go straight to style editor)
- [ ] Pass wizard selections to style editor state
- [ ] Remove old layout-related code paths

### Phase 2: Style Editor UI Structure
- [ ] Create three-panel layout (left, center, right)
- [ ] Left panel: Group list with collapsible style controls
- [ ] Center panel: Stream Deck preview grid
- [ ] Right panel: Theme presets and global settings
- [ ] Footer: Generate button

### Phase 3: Group Styling Controls
- [ ] Background color picker per group
- [ ] Icon color picker per group
- [ ] Text color picker per group
- [ ] Collapsible entity list within each group
- [ ] "Ungrouped Entities" section

### Phase 4: Stream Deck Preview
- [ ] Render grid matching selected device size
- [ ] Show main page with folders + flat/ungrouped entities
- [ ] Make folders clickable to show sub-pages
- [ ] Back button to return to main page
- [ ] Live updates when styles change
- [ ] Accurate button rendering (icon + text + colors)

### Phase 5: Theme System
- [ ] Preset themes: Stream Deck Dark, Home Assistant Blue, Minimal White
- [ ] Domain color defaults
- [ ] Back button position selector
- [ ] Apply preset → updates all group styles

### Phase 6: Profile Generation
- [ ] Generate with blank Stream Deck titles
- [ ] Render button images with our styling
- [ ] Include icon + text + background in image
- [ ] Proper folder/page/flat layout based on wizard

## Data Structures

### Group Style
```javascript
{
  groupName: "Living Room",
  backgroundColor: "#1C1C1C",
  iconColor: "#FFFFFF",
  textColor: "#FFFFFF"
}
```

### Theme Preset
```javascript
{
  name: "Stream Deck Dark",
  background: "#1C1C1C",
  iconColor: "#FFFFFF",
  textColor: "#CCCCCC",
  domainColors: {
    light: "#FFEB3B",
    switch: "#4CAF50",
    // ...
  },
  backButtonPosition: "bottom-right"
}
```

### Editor State
```javascript
{
  // From wizard
  groups: [...],
  ungroupedEntities: [...],

  // Style settings
  groupStyles: { groupName: styleObj },
  ungroupedStyle: styleObj,
  globalTheme: themeObj,

  // Preview state
  previewPage: "main" | groupName,
  selectedDevice: deviceInfo
}
```

## Files to Modify
- `layout-editor.html` → Restructure for style editor
- `layout-editor.js` → Replace layout logic with style logic
- `layout-editor.css` → New styles for editor panels
- `settings.ts` → Update profile generation for blank titles

## Notes
- Keep device size selector in header
- Preserve connection status indicator
- Reuse existing color picker components where possible
