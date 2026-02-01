# Layout Rendering Design

## Overview

Defines how groups, ungrouped items, and navigation buttons are rendered across Stream Deck pages.

## Layout Types

### Folder
- Navigation button on Main page
- Opens sub-page(s) containing folder's entities
- "Folder Up" button returns to Main from any sub-page
- Hub-and-spoke navigation (separate from linear flow)

### Page
- No button on Main page
- Rendered after all ungrouped items in the linear page sequence
- User can swipe left/right through all pages
- Part of the linear flow

### Flat
- Entities rendered directly on Main page (no sub-pages)
- Mixed in with ungrouped items

## Page Generation Order

1. **Main Page**
   - Folder buttons first (one per folder-type group)
   - Flat group entities
   - Ungrouped entities (fill remaining slots)
   - "→" button if overflow

2. **Overflow Pages** (Page 2, 3, etc.)
   - Remaining ungrouped entities
   - "←" / "→" linear navigation

3. **Page-group Pages**
   - Each page-type group becomes page(s) in user-defined order
   - Continues the linear navigation chain
   - "←" / "→" to navigate

4. **Folder Sub-pages** (separate from linear flow)
   - Created for each folder-type group
   - "Folder Up" returns to Main
   - "→" for overflow within folder

## Navigation Button Placement

### User Settings

```javascript
theme: {
  navStartPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
  folderUpPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}
```

### Linear Navigation (←/→)

Arrows maintain consistent meaning (← left, → right), justified to chosen corner:

| Setting | "←" Position | "→" Position |
|---------|--------------|--------------|
| bottom-right | Second-to-last col, bottom row | Last col, bottom row |
| bottom-left | First col, bottom row | Second col, bottom row |
| top-right | Second-to-last col, top row | Last col, top row |
| top-left | First col, top row | Second col, top row |

### Folder Sub-pages

- **Folder Up (↑)** — Configurable position, returns to Main
- **←/→** — Configurable position for within-folder navigation
- **Priority** — Folder Up wins if positions conflict; ←/→ shift inward

**Conflict Example (both bottom-right on 5x3 grid):**
```
[ entity ] [ entity ] [ entity ] [ entity ] [ entity ]
[ entity ] [ entity ] [ entity ] [ entity ] [ entity ]
[ entity ] [ entity ] [   ←   ] [   →   ] [   ↑   ]
```

## Ungrouped Items Sorting

### Sortable List UI
- Draggable list in Style Editor
- Default order = selection order from wizard
- Manual drag sets sort to 'custom'

### Contextual Quick-sort Options

Always available:
- **Selection Order** — Reset to original selection order
- **Alphabetical** — Sort by friendly name A→Z

Shown only if data varies:
- **By Domain** — Only if multiple domains exist
- **By Area** — Only if multiple areas exist
- **By Floor** — Only if multiple floors exist

```javascript
getAvailableSortOptions() {
  const entities = this.getUngroupedEntitiesData();
  const options = [
    { id: 'selection', label: 'Selection Order' },
    { id: 'alpha', label: 'Alphabetical' }
  ];

  const uniqueDomains = new Set(entities.map(e => e.domain));
  if (uniqueDomains.size > 1) {
    options.push({ id: 'domain', label: 'By Domain' });
  }

  const uniqueAreas = new Set(entities.map(e => e.area_id).filter(Boolean));
  if (uniqueAreas.size > 1) {
    options.push({ id: 'area', label: 'By Area' });
  }

  const uniqueFloors = new Set(entities.map(e => this.getFloorForEntity(e)).filter(Boolean));
  if (uniqueFloors.size > 1) {
    options.push({ id: 'floor', label: 'By Floor' });
  }

  return options;
}
```

## Page Data Model

```javascript
{
  id: string,
  name: string,
  type: 'main' | 'overflow' | 'page-group' | 'folder-sub',
  layout: (Entity | Button | null)[][],
  parentId?: string,      // For folder-sub pages, references Main
  groupName?: string,     // For page-group and folder-sub pages
}
```

### Navigation Button Types

```javascript
// Folder button (on Main, opens sub-page)
{ type: 'folder', label: 'Lights', targetPageId: 'abc123' }

// Linear navigation
{ type: 'nav-next', label: '→' }
{ type: 'nav-prev', label: '←' }

// Folder up (exits folder sub-page to Main)
{ type: 'folder-up', label: '↑', targetPageId: 'main-id' }
```

## Style Editor UI

### Settings Panel

```
Navigation Settings
├── Nav Button Position: [Bottom Right ▾]
├── Folder Up Position: [Bottom Right ▾]
└── Ungrouped Sort: [Selection Order ▾]

Ungrouped Items
└── [Draggable sortable list]
```

### Preview Behavior
- Shows accurate button placement
- Displays navigation buttons in configured positions
- Page indicator shows current page context
- Click navigation to preview page transitions
- Click folder to see sub-pages
- Click folder up to return to main

## Files to Modify

1. `layout-editor.js` — Page generation, navigation placement, sorting UI
2. `layout-editor.html` — Settings panel, sortable list, preview updates
3. `layout-editor.css` — Sortable list styles, navigation button styles
4. `profile-generator.ts` — Multi-page profile generation with navigation
