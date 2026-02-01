# Layout Rendering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement multi-page layout rendering with configurable navigation button placement, ungrouped entity sorting, and proper page flow (folders → flat/ungrouped → page-groups).

**Architecture:** Update the Style Editor's page generation logic to build pages in the correct order, add navigation settings UI, implement draggable sorting for ungrouped items, and update the preview to show accurate navigation. Finally, update the profile generator to output multi-page profiles.

**Tech Stack:** Alpine.js (frontend reactivity), vanilla JS (drag-drop), TypeScript (profile generator)

---

## Task 1: Add Navigation Settings State

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Add theme settings for navigation positions**

In `styleEditor()`, find the `theme` object (around line 280) and add navigation settings:

```javascript
theme: {
    backgroundColor: '#1a1a1a',
    backButtonPosition: 'bottom-right', // Legacy, keep for compatibility
    navStartPosition: 'bottom-right',   // NEW: Linear nav ←/→ position
    folderUpPosition: 'bottom-right',   // NEW: Folder up button position
},
```

**Step 2: Add helper functions for nav position calculations**

Add after the `getBackButtonPosition()` function:

```javascript
/**
 * Get navigation button positions based on settings
 * @param {string} position - 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
 * @returns {{ prev: {row, col}, next: {row, col} }}
 */
getNavPositions(position) {
    const lastRow = this.deviceSize.rows - 1;
    const lastCol = this.deviceSize.cols - 1;

    switch (position) {
        case 'bottom-right':
            return {
                prev: { row: lastRow, col: lastCol - 1 },
                next: { row: lastRow, col: lastCol }
            };
        case 'bottom-left':
            return {
                prev: { row: lastRow, col: 0 },
                next: { row: lastRow, col: 1 }
            };
        case 'top-right':
            return {
                prev: { row: 0, col: lastCol - 1 },
                next: { row: 0, col: lastCol }
            };
        case 'top-left':
            return {
                prev: { row: 0, col: 0 },
                next: { row: 0, col: 1 }
            };
        default:
            return {
                prev: { row: lastRow, col: lastCol - 1 },
                next: { row: lastRow, col: lastCol }
            };
    }
},

/**
 * Get folder up button position
 * @param {string} position - 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
 * @returns {{ row: number, col: number }}
 */
getFolderUpPosition(position) {
    const lastRow = this.deviceSize.rows - 1;
    const lastCol = this.deviceSize.cols - 1;

    switch (position) {
        case 'bottom-right':
            return { row: lastRow, col: lastCol };
        case 'bottom-left':
            return { row: lastRow, col: 0 };
        case 'top-right':
            return { row: 0, col: lastCol };
        case 'top-left':
            return { row: 0, col: 0 };
        default:
            return { row: lastRow, col: lastCol };
    }
},

/**
 * Get folder sub-page nav positions, accounting for folder-up priority
 * @returns {{ folderUp: {row, col}, prev: {row, col}|null, next: {row, col}|null }}
 */
getFolderNavPositions() {
    const folderUp = this.getFolderUpPosition(this.theme.folderUpPosition);
    const navPositions = this.getNavPositions(this.theme.navStartPosition);

    // Check for conflicts - folder up takes priority
    let prev = navPositions.prev;
    let next = navPositions.next;

    // If folder up conflicts with next, shift nav inward
    if (folderUp.row === next.row && folderUp.col === next.col) {
        // Shift both prev and next one position inward
        if (this.theme.navStartPosition.includes('right')) {
            next = { row: next.row, col: next.col - 1 };
            prev = { row: prev.row, col: prev.col - 1 };
        } else {
            next = { row: next.row, col: next.col + 1 };
            prev = { row: prev.row, col: prev.col + 1 };
        }
    }
    // If folder up conflicts with prev, shift nav inward
    else if (folderUp.row === prev.row && folderUp.col === prev.col) {
        if (this.theme.navStartPosition.includes('right')) {
            next = { row: next.row, col: next.col - 1 };
            prev = { row: prev.row, col: prev.col - 1 };
        } else {
            next = { row: next.row, col: next.col + 1 };
            prev = { row: prev.row, col: prev.col + 1 };
        }
    }

    return { folderUp, prev, next };
},
```

**Step 3: Verify no syntax errors**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: add navigation position settings and helper functions"
```

---

## Task 2: Add Ungrouped Sorting State and Functions

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Add sorting state to wizardSelections**

Find `wizardSelections` object and add:

```javascript
wizardSelections: {
    // ... existing properties
    ungroupedSort: 'selection', // 'selection' | 'alpha' | 'domain' | 'area' | 'floor' | 'custom'
    ungroupedOriginalOrder: [], // Preserved selection order for reset
},
```

**Step 2: Add contextual sort options function**

Add after the nav position functions:

```javascript
/**
 * Get available sort options based on ungrouped entity data
 * Only shows options that would actually change the order
 */
getAvailableSortOptions() {
    const entityIds = this.wizardSelections.ungroupedEntities || [];
    const entities = entityIds.map(id => this.getEntityById(id)).filter(Boolean);

    const options = [
        { id: 'selection', label: 'Selection Order' },
        { id: 'alpha', label: 'Alphabetical' }
    ];

    // Only if multiple domains
    const uniqueDomains = new Set(entities.map(e => e.domain));
    if (uniqueDomains.size > 1) {
        options.push({ id: 'domain', label: 'By Domain' });
    }

    // Only if multiple areas
    const uniqueAreas = new Set(entities.map(e => e.area_id).filter(Boolean));
    if (uniqueAreas.size > 1) {
        options.push({ id: 'area', label: 'By Area' });
    }

    // Only if multiple floors
    const floorsWithEntities = entities.map(e => {
        const area = this.areas.find(a => a.area_id === e.area_id);
        return area?.floor_id;
    }).filter(Boolean);
    const uniqueFloors = new Set(floorsWithEntities);
    if (uniqueFloors.size > 1) {
        options.push({ id: 'floor', label: 'By Floor' });
    }

    return options;
},

/**
 * Apply sort to ungrouped entities
 */
applyUngroupedSort(sortType) {
    this.wizardSelections.ungroupedSort = sortType;

    if (sortType === 'selection') {
        // Reset to original order
        this.wizardSelections.ungroupedEntities = [...this.wizardSelections.ungroupedOriginalOrder];
        return;
    }

    const entityIds = this.wizardSelections.ungroupedEntities || [];
    const entities = entityIds.map(id => ({
        id,
        data: this.getEntityById(id)
    })).filter(e => e.data);

    switch (sortType) {
        case 'alpha':
            entities.sort((a, b) => {
                const nameA = (a.data.friendly_name || a.id).toLowerCase();
                const nameB = (b.data.friendly_name || b.id).toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;

        case 'domain':
            entities.sort((a, b) => {
                const domainCompare = a.data.domain.localeCompare(b.data.domain);
                if (domainCompare !== 0) return domainCompare;
                const nameA = (a.data.friendly_name || a.id).toLowerCase();
                const nameB = (b.data.friendly_name || b.id).toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;

        case 'area':
            entities.sort((a, b) => {
                const areaA = this.getAreaName(a.data.area_id) || 'zzz';
                const areaB = this.getAreaName(b.data.area_id) || 'zzz';
                const areaCompare = areaA.localeCompare(areaB);
                if (areaCompare !== 0) return areaCompare;
                const nameA = (a.data.friendly_name || a.id).toLowerCase();
                const nameB = (b.data.friendly_name || b.id).toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;

        case 'floor':
            entities.sort((a, b) => {
                const getFloor = (entity) => {
                    const area = this.areas.find(ar => ar.area_id === entity.area_id);
                    if (!area?.floor_id) return 999;
                    const floor = this.floors.find(f => f.floor_id === area.floor_id);
                    return floor?.level ?? 999;
                };
                const floorCompare = getFloor(a.data) - getFloor(b.data);
                if (floorCompare !== 0) return floorCompare;
                const nameA = (a.data.friendly_name || a.id).toLowerCase();
                const nameB = (b.data.friendly_name || b.id).toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;
    }

    this.wizardSelections.ungroupedEntities = entities.map(e => e.id);
    this.preloadPreviewIcons();
},
```

**Step 3: Preserve original order when wizard finishes**

Find `finishWizard()` and update the else branch:

```javascript
} else {
    // Simple flow - create a single flat group with all entities
    this.wizardSelections.ungroupedEntities = simpleEntities;
    this.wizardSelections.ungroupedOriginalOrder = [...simpleEntities]; // Preserve original order
}
```

Also update `finishQuickSetup()`:

```javascript
// Set sorted entities as ungrouped entities for Style Editor
this.wizardSelections.ungroupedEntities = sortedEntityIds;
this.wizardSelections.ungroupedOriginalOrder = [...sortedEntityIds]; // Preserve original order
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: add ungrouped entity sorting with contextual options"
```

---

## Task 3: Add Navigation Settings UI

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`
- Modify: `com.deckassistant.sdPlugin/ui/css/layout-editor.css`

**Step 1: Add navigation settings section to HTML**

Find the right panel (style-panel-right) and add after the theme presets section:

```html
<!-- Navigation Settings -->
<div class="theme-section">
    <div class="theme-section-title">Navigation</div>

    <div class="setting-row">
        <label class="setting-label">Nav Buttons</label>
        <select class="setting-select" x-model="theme.navStartPosition">
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="top-right">Top Right</option>
            <option value="top-left">Top Left</option>
        </select>
    </div>

    <div class="setting-row">
        <label class="setting-label">Folder Up</label>
        <select class="setting-select" x-model="theme.folderUpPosition">
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="top-right">Top Right</option>
            <option value="top-left">Top Left</option>
        </select>
    </div>
</div>
```

**Step 2: Add CSS for setting rows**

Add to layout-editor.css:

```css
/* Navigation Settings */
.setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.setting-label {
    font-size: 12px;
    color: #aaa;
}

.setting-select {
    background: #333;
    border: 1px solid #444;
    border-radius: 4px;
    color: #fff;
    padding: 4px 8px;
    font-size: 11px;
    min-width: 120px;
}

.setting-select:focus {
    outline: none;
    border-color: #0078d4;
}
```

**Step 3: Verify UI displays**

Open Style Editor and confirm the Navigation section appears with dropdowns.

**Step 4: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/layout-editor.html com.deckassistant.sdPlugin/ui/css/layout-editor.css
git commit -m "feat: add navigation settings UI"
```

---

## Task 4: Add Ungrouped Sorting UI

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`
- Modify: `com.deckassistant.sdPlugin/ui/css/layout-editor.css`

**Step 1: Add ungrouped section to left panel**

In the style-panel-left, add after the groups list:

```html
<!-- Ungrouped Entities -->
<div class="ungrouped-section" x-show="wizardSelections.ungroupedEntities && wizardSelections.ungroupedEntities.length > 0">
    <div class="panel-header">
        <span>Ungrouped Items</span>
        <span class="item-count" x-text="wizardSelections.ungroupedEntities.length"></span>
    </div>

    <!-- Sort Options -->
    <div class="sort-options">
        <template x-for="option in getAvailableSortOptions()" :key="option.id">
            <button class="sort-btn"
                    :class="{ 'active': wizardSelections.ungroupedSort === option.id }"
                    @click="applyUngroupedSort(option.id)"
                    x-text="option.label">
            </button>
        </template>
    </div>

    <!-- Draggable List -->
    <div class="ungrouped-list" id="ungrouped-sortable">
        <template x-for="(entityId, index) in wizardSelections.ungroupedEntities" :key="entityId">
            <div class="ungrouped-item"
                 draggable="true"
                 @dragstart="handleUngroupedDragStart($event, index)"
                 @dragover.prevent="handleUngroupedDragOver($event, index)"
                 @dragleave="handleUngroupedDragLeave()"
                 @drop="handleUngroupedDrop($event, index)"
                 :class="{ 'drag-over': ungroupedDragOverIndex === index }">
                <span class="drag-handle">⋮⋮</span>
                <span class="ungrouped-item-name" x-text="getEntityById(entityId)?.friendly_name || entityId"></span>
                <span class="ungrouped-item-domain" x-text="getEntityById(entityId)?.domain"></span>
            </div>
        </template>
    </div>
</div>
```

**Step 2: Add drag state and handlers to JS**

In layout-editor.js, add to the component state:

```javascript
// Ungrouped drag state
ungroupedDragIndex: null,
ungroupedDragOverIndex: null,
```

Add drag handlers:

```javascript
handleUngroupedDragStart(event, index) {
    this.ungroupedDragIndex = index;
    event.dataTransfer.effectAllowed = 'move';
},

handleUngroupedDragOver(event, index) {
    event.preventDefault();
    this.ungroupedDragOverIndex = index;
},

handleUngroupedDragLeave() {
    this.ungroupedDragOverIndex = null;
},

handleUngroupedDrop(event, targetIndex) {
    event.preventDefault();
    const sourceIndex = this.ungroupedDragIndex;

    if (sourceIndex !== null && sourceIndex !== targetIndex) {
        // Reorder the array
        const items = [...this.wizardSelections.ungroupedEntities];
        const [movedItem] = items.splice(sourceIndex, 1);
        items.splice(targetIndex, 0, movedItem);
        this.wizardSelections.ungroupedEntities = items;

        // Mark as custom sort
        this.wizardSelections.ungroupedSort = 'custom';
    }

    this.ungroupedDragIndex = null;
    this.ungroupedDragOverIndex = null;
    this.preloadPreviewIcons();
},
```

**Step 3: Add CSS for ungrouped section**

```css
/* Ungrouped Section */
.ungrouped-section {
    margin-top: 16px;
    border-top: 1px solid #333;
    padding-top: 12px;
}

.sort-options {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 8px 12px;
}

.sort-btn {
    background: #333;
    border: 1px solid #444;
    border-radius: 4px;
    color: #aaa;
    padding: 4px 8px;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.15s;
}

.sort-btn:hover {
    background: #3a3a3a;
    color: #fff;
}

.sort-btn.active {
    background: #0078d4;
    border-color: #0078d4;
    color: #fff;
}

.ungrouped-list {
    max-height: 300px;
    overflow-y: auto;
    padding: 0 8px;
}

.ungrouped-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: #2a2a2a;
    border-radius: 4px;
    margin-bottom: 4px;
    cursor: grab;
    transition: all 0.15s;
}

.ungrouped-item:hover {
    background: #333;
}

.ungrouped-item.drag-over {
    border-top: 2px solid #0078d4;
}

.ungrouped-item:active {
    cursor: grabbing;
}

.drag-handle {
    color: #666;
    font-size: 12px;
    user-select: none;
}

.ungrouped-item-name {
    flex: 1;
    font-size: 11px;
    color: #ddd;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ungrouped-item-domain {
    font-size: 10px;
    color: #888;
    text-transform: uppercase;
}

.item-count {
    background: #444;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    color: #aaa;
}
```

**Step 4: Verify UI**

Open Style Editor with ungrouped entities and test:
- Sort buttons appear based on data
- Drag and drop reorders items
- Custom sort is marked when manually reordering

**Step 5: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/layout-editor.html com.deckassistant.sdPlugin/ui/js/layout-editor.js com.deckassistant.sdPlugin/ui/css/layout-editor.css
git commit -m "feat: add ungrouped entity sorting UI with drag-drop"
```

---

## Task 5: Rewrite Page Generation Logic

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Replace buildPagesFromStyleEditor function**

Find and replace the entire `buildPagesFromStyleEditor()` function:

```javascript
/**
 * Build pages from Style Editor configuration
 * Order: Folders → Flat entities → Ungrouped → Page-type groups
 */
buildPagesFromStyleEditor() {
    const pages = [];
    const groups = this.wizardSelections.groups || [];
    const ungrouped = this.wizardSelections.ungroupedEntities || [];
    const cellsPerPage = this.deviceSize.cols * this.deviceSize.rows;

    // Collect all items for the linear flow (main + overflow + page-groups)
    const linearItems = [];

    // 1. Folder buttons (just the buttons, sub-pages created separately)
    const folderGroups = groups.filter(g => g.displayType === 'folder');
    for (const group of folderGroups) {
        linearItems.push({
            type: 'folder-button',
            group: group,
            style: this.getGroupStyle(group.name)
        });
    }

    // 2. Flat group entities
    const flatGroups = groups.filter(g => g.displayType === 'flat');
    for (const group of flatGroups) {
        const style = this.getGroupStyle(group.name);
        for (const entityId of group.entities) {
            const entity = this.getEntityById(entityId);
            if (entity) {
                linearItems.push({
                    type: 'entity',
                    entity: entity,
                    entityId: entityId,
                    style: style
                });
            }
        }
    }

    // 3. Ungrouped entities
    for (const entityId of ungrouped) {
        const entity = this.getEntityById(entityId);
        if (entity) {
            linearItems.push({
                type: 'entity',
                entity: entity,
                entityId: entityId,
                style: this.ungroupedStyle
            });
        }
    }

    // 4. Page-type groups (each becomes pages in the linear chain)
    const pageGroups = groups.filter(g => g.displayType === 'page');
    const pageGroupItems = [];
    for (const group of pageGroups) {
        const style = this.getGroupStyle(group.name);
        const groupItems = [];
        for (const entityId of group.entities) {
            const entity = this.getEntityById(entityId);
            if (entity) {
                groupItems.push({
                    type: 'entity',
                    entity: entity,
                    entityId: entityId,
                    style: style,
                    groupName: group.name
                });
            }
        }
        if (groupItems.length > 0) {
            pageGroupItems.push({ group, items: groupItems });
        }
    }

    // Build linear pages (main + overflow)
    const linearPages = this.buildLinearPages(linearItems, pageGroupItems);
    pages.push(...linearPages);

    // Build folder sub-pages (separate from linear flow)
    for (const group of folderGroups) {
        const folderPages = this.buildFolderSubPages(group);
        pages.push(...folderPages);
    }

    return pages;
},

/**
 * Build linear pages (main, overflow, page-groups)
 */
buildLinearPages(linearItems, pageGroupItems) {
    const pages = [];
    const cellsPerPage = this.deviceSize.cols * this.deviceSize.rows;
    const navPositions = this.getNavPositions(this.theme.navStartPosition);

    // Calculate reserved slots per page type
    const mainReservedNext = 1; // Might need →
    const overflowReserved = 2; // ← and →

    let remainingItems = [...linearItems];
    let pageIndex = 0;
    let isMain = true;

    // First pass: determine if we need overflow pages
    const totalItemSlots = linearItems.length;
    const pageGroupsExist = pageGroupItems.length > 0;

    while (remainingItems.length > 0 || (isMain && remainingItems.length === 0)) {
        const page = {
            id: this.generateId(),
            name: isMain ? 'Main' : `Page ${pageIndex + 1}`,
            type: isMain ? 'main' : 'overflow',
            layout: this.createEmptyLayout()
        };

        // Determine available slots
        const hasMoreItems = remainingItems.length > (isMain ? cellsPerPage - 1 : cellsPerPage - 2);
        const needsNext = hasMoreItems || pageGroupsExist;
        const needsPrev = !isMain;

        let availableSlots = cellsPerPage;
        if (needsNext) availableSlots--;
        if (needsPrev) availableSlots--;

        // Place navigation buttons
        if (needsPrev) {
            page.layout[navPositions.prev.row][navPositions.prev.col] = {
                type: 'nav-prev',
                icon: 'mdi:arrow-left',
                label: '←'
            };
        }
        if (needsNext) {
            page.layout[navPositions.next.row][navPositions.next.col] = {
                type: 'nav-next',
                icon: 'mdi:arrow-right',
                label: '→'
            };
        }

        // Fill with items, skipping reserved slots
        const itemsForPage = remainingItems.splice(0, availableSlots);
        let slotIndex = 0;

        for (const item of itemsForPage) {
            // Find next available slot
            while (slotIndex < cellsPerPage) {
                const row = Math.floor(slotIndex / this.deviceSize.cols);
                const col = slotIndex % this.deviceSize.cols;

                // Skip if slot is reserved for navigation
                if (page.layout[row][col] !== null) {
                    slotIndex++;
                    continue;
                }

                // Place item
                if (item.type === 'folder-button') {
                    page.layout[row][col] = {
                        type: 'folder',
                        label: item.group.name,
                        icon: 'mdi:folder',
                        groupName: item.group.name,
                        targetPageId: null, // Will be linked later
                        style: item.style
                    };
                } else {
                    page.layout[row][col] = {
                        type: 'entity',
                        ...item.entity,
                        entityId: item.entityId,
                        style: item.style
                    };
                }
                slotIndex++;
                break;
            }
        }

        pages.push(page);
        pageIndex++;
        isMain = false;

        // If no more linear items, break to handle page-groups
        if (remainingItems.length === 0) break;
    }

    // Add page-group pages
    for (const { group, items } of pageGroupItems) {
        let remainingGroupItems = [...items];
        let groupPageIndex = 0;

        while (remainingGroupItems.length > 0) {
            const isLastGroupPage = remainingGroupItems.length <= (cellsPerPage - 2);
            const isLastGroup = pageGroupItems.indexOf({ group, items }) === pageGroupItems.length - 1;
            const needsNext = !isLastGroupPage || !isLastGroup;

            const page = {
                id: this.generateId(),
                name: groupPageIndex === 0 ? group.name : `${group.name} ${groupPageIndex + 1}`,
                type: 'page-group',
                groupName: group.name,
                layout: this.createEmptyLayout()
            };

            // Navigation
            page.layout[navPositions.prev.row][navPositions.prev.col] = {
                type: 'nav-prev',
                icon: 'mdi:arrow-left',
                label: '←'
            };
            if (needsNext) {
                page.layout[navPositions.next.row][navPositions.next.col] = {
                    type: 'nav-next',
                    icon: 'mdi:arrow-right',
                    label: '→'
                };
            }

            const availableSlots = needsNext ? cellsPerPage - 2 : cellsPerPage - 1;
            const itemsForPage = remainingGroupItems.splice(0, availableSlots);
            let slotIndex = 0;

            for (const item of itemsForPage) {
                while (slotIndex < cellsPerPage) {
                    const row = Math.floor(slotIndex / this.deviceSize.cols);
                    const col = slotIndex % this.deviceSize.cols;

                    if (page.layout[row][col] !== null) {
                        slotIndex++;
                        continue;
                    }

                    page.layout[row][col] = {
                        type: 'entity',
                        ...item.entity,
                        entityId: item.entityId,
                        style: item.style
                    };
                    slotIndex++;
                    break;
                }
            }

            pages.push(page);
            groupPageIndex++;
        }
    }

    return pages;
},

/**
 * Build folder sub-pages (separate from linear flow)
 */
buildFolderSubPages(group) {
    const pages = [];
    const style = this.getGroupStyle(group.name);
    const cellsPerPage = this.deviceSize.cols * this.deviceSize.rows;
    const folderNav = this.getFolderNavPositions();

    const entities = group.entities.map(id => this.getEntityById(id)).filter(Boolean);
    let remainingEntities = [...entities];
    let pageIndex = 0;

    while (remainingEntities.length > 0) {
        const page = {
            id: this.generateId(),
            name: pageIndex === 0 ? group.name : `${group.name} ${pageIndex + 1}`,
            type: 'folder-sub',
            groupName: group.name,
            parentId: null, // Will be linked to main
            layout: this.createEmptyLayout()
        };

        // Folder up button always present
        page.layout[folderNav.folderUp.row][folderNav.folderUp.col] = {
            type: 'folder-up',
            icon: 'mdi:arrow-up',
            label: '↑',
            targetPageId: null // Will be linked to main
        };

        // Check if we need next button
        const needsNext = remainingEntities.length > (cellsPerPage - 2);
        if (needsNext) {
            page.layout[folderNav.next.row][folderNav.next.col] = {
                type: 'nav-next',
                icon: 'mdi:arrow-right',
                label: '→'
            };
        }

        // Need prev if not first folder page
        if (pageIndex > 0) {
            page.layout[folderNav.prev.row][folderNav.prev.col] = {
                type: 'nav-prev',
                icon: 'mdi:arrow-left',
                label: '←'
            };
        }

        // Calculate available slots
        let reservedSlots = 1; // folder-up
        if (needsNext) reservedSlots++;
        if (pageIndex > 0) reservedSlots++;

        const availableSlots = cellsPerPage - reservedSlots;
        const entitiesForPage = remainingEntities.splice(0, availableSlots);
        let slotIndex = 0;

        for (const entity of entitiesForPage) {
            while (slotIndex < cellsPerPage) {
                const row = Math.floor(slotIndex / this.deviceSize.cols);
                const col = slotIndex % this.deviceSize.cols;

                if (page.layout[row][col] !== null) {
                    slotIndex++;
                    continue;
                }

                page.layout[row][col] = {
                    type: 'entity',
                    ...entity,
                    entityId: entity.entity_id,
                    style: style
                };
                slotIndex++;
                break;
            }
        }

        pages.push(page);
        pageIndex++;
    }

    return pages;
},
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Test in Style Editor**

- Create groups with different display types
- Verify preview shows correct page structure
- Test navigation between pages

**Step 4: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: rewrite page generation with correct render order and navigation"
```

---

## Task 6: Update Preview to Show Navigation

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`

**Step 1: Add page navigation state**

Add to component state:

```javascript
// Preview page navigation
currentPreviewPageIndex: 0,
previewPages: [],
previewPageStack: [], // For folder navigation (back to main)
```

**Step 2: Update preview methods**

```javascript
/**
 * Get the current preview page
 */
getCurrentPreviewPage() {
    if (this.previewPages.length === 0) {
        this.previewPages = this.buildPagesFromStyleEditor();
    }
    return this.previewPages[this.currentPreviewPageIndex] || null;
},

/**
 * Refresh preview pages
 */
refreshPreviewPages() {
    this.previewPages = this.buildPagesFromStyleEditor();
    this.currentPreviewPageIndex = 0;
    this.previewPageStack = [];
    this.preloadPreviewIcons();
},

/**
 * Handle preview button click
 */
handlePreviewNavigation(button) {
    if (button.type === 'nav-next') {
        if (this.currentPreviewPageIndex < this.previewPages.length - 1) {
            this.currentPreviewPageIndex++;
            this.preloadPreviewIcons();
        }
    } else if (button.type === 'nav-prev') {
        if (this.currentPreviewPageIndex > 0) {
            this.currentPreviewPageIndex--;
            this.preloadPreviewIcons();
        }
    } else if (button.type === 'folder') {
        // Find folder sub-page
        const folderPage = this.previewPages.find(p =>
            p.type === 'folder-sub' && p.groupName === button.groupName
        );
        if (folderPage) {
            this.previewPageStack.push(this.currentPreviewPageIndex);
            this.currentPreviewPageIndex = this.previewPages.indexOf(folderPage);
            this.preloadPreviewIcons();
        }
    } else if (button.type === 'folder-up') {
        // Return to main
        if (this.previewPageStack.length > 0) {
            this.currentPreviewPageIndex = this.previewPageStack.pop();
        } else {
            this.currentPreviewPageIndex = 0;
        }
        this.preloadPreviewIcons();
    }
},

/**
 * Get buttons for current preview page
 */
getPreviewButtons() {
    const page = this.getCurrentPreviewPage();
    if (!page) return this.getEmptyPreviewButtons();

    const buttons = [];
    for (let row = 0; row < this.deviceSize.rows; row++) {
        for (let col = 0; col < this.deviceSize.cols; col++) {
            const cell = page.layout[row]?.[col];
            if (cell) {
                buttons.push({
                    ...cell,
                    backgroundColor: cell.style?.backgroundColor || this.theme.backgroundColor,
                    iconColor: cell.style?.iconColor || '#FFFFFF',
                    textColor: cell.style?.textColor || '#FFFFFF'
                });
            } else {
                buttons.push({
                    type: 'empty',
                    label: '',
                    icon: '',
                    backgroundColor: '#2a2a2a',
                    iconColor: '#666',
                    textColor: '#666'
                });
            }
        }
    }
    return buttons;
},

getEmptyPreviewButtons() {
    const buttons = [];
    const total = this.deviceSize.cols * this.deviceSize.rows;
    for (let i = 0; i < total; i++) {
        buttons.push({
            type: 'empty',
            label: '',
            icon: '',
            backgroundColor: '#2a2a2a',
            iconColor: '#666',
            textColor: '#666'
        });
    }
    return buttons;
},
```

**Step 3: Update HTML preview click handler**

Update the preview button click:

```html
@click="handlePreviewNavigation(button)"
```

**Step 4: Add page indicator**

In the preview-info section:

```html
<div class="preview-info">
    <span x-text="getCurrentPreviewPage()?.name || 'No pages'"></span>
    <span x-text="(currentPreviewPageIndex + 1) + ' / ' + previewPages.length"></span>
</div>
```

**Step 5: Trigger refresh when settings change**

Add watchers or call `refreshPreviewPages()` when theme settings change.

**Step 6: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js com.deckassistant.sdPlugin/ui/layout-editor.html
git commit -m "feat: update preview with page navigation and indicators"
```

---

## Task 7: Update Profile Generator for Multi-Page

**Files:**
- Modify: `src/layout/profile-generator.ts`

**Step 1: Update interfaces**

```typescript
interface EntityData {
    entity_id: string;
    domain: string;
    friendly_name?: string;
    area_id?: string;
    type?: 'entity' | 'folder' | 'nav-next' | 'nav-prev' | 'folder-up';
    icon?: string;
    label?: string;
    targetPageId?: string;
    style?: {
        backgroundColor?: string;
        iconColor?: string;
        textColor?: string;
    };
}

interface PageData {
    id: string;
    name: string;
    type: 'main' | 'overflow' | 'page-group' | 'folder-sub';
    layout: (EntityData | null)[][];
    groupName?: string;
    parentId?: string;
}
```

**Step 2: Update generateProfile to handle multiple pages**

This is a significant rewrite - create actions for each page and link navigation buttons.

```typescript
export async function generateProfile(config: ProfileConfig): Promise<{ data: string; filename: string }> {
    const mainProfileUuid = uuidv4();
    const safeFilename = config.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');

    const zip = new JSZip();
    const profileFolderName = `${mainProfileUuid}.sdProfile`;
    const profileFolder = zip.folder(profileFolderName);

    if (!profileFolder) {
        throw new Error("Failed to create profile folder in ZIP");
    }

    // Generate UUIDs for each page
    const pageUuids: Record<string, string> = {};
    for (const page of config.pages) {
        pageUuids[page.id] = uuidv4();
    }

    // Create profiles folder structure
    const profilesFolder = profileFolder.folder("Profiles");

    // Build each page
    for (const page of config.pages) {
        const pageUuid = pageUuids[page.id];
        const encodedFolderId = profileFolderId(pageUuid);
        const pageFolder = profilesFolder?.folder(encodedFolderId);

        if (!pageFolder) continue;

        const actions: Record<string, ProfileAction> = {};

        for (let row = 0; row < config.device.rows; row++) {
            for (let col = 0; col < config.device.cols; col++) {
                const cell = page.layout[row]?.[col];
                if (!cell) continue;

                const position = `${col},${row}`;

                if (cell.type === 'entity') {
                    actions[position] = createEntityButtonAction(cell, config.domainColors, config.theme);
                } else if (cell.type === 'folder') {
                    // Find target folder page
                    const targetPage = config.pages.find(p =>
                        p.type === 'folder-sub' && p.groupName === cell.groupName
                    );
                    if (targetPage) {
                        actions[position] = createNavigationAction(
                            cell.label || cell.groupName,
                            pageUuids[targetPage.id],
                            cell.icon || 'folder'
                        );
                    }
                } else if (cell.type === 'nav-next') {
                    const currentIndex = config.pages.indexOf(page);
                    const nextPage = config.pages[currentIndex + 1];
                    if (nextPage) {
                        actions[position] = createNavigationAction('→', pageUuids[nextPage.id], 'arrow-right');
                    }
                } else if (cell.type === 'nav-prev') {
                    const currentIndex = config.pages.indexOf(page);
                    const prevPage = config.pages[currentIndex - 1];
                    if (prevPage) {
                        actions[position] = createNavigationAction('←', pageUuids[prevPage.id], 'arrow-left');
                    }
                } else if (cell.type === 'folder-up') {
                    // Go back to main page
                    const mainPage = config.pages.find(p => p.type === 'main');
                    if (mainPage) {
                        actions[position] = createNavigationAction('↑', pageUuids[mainPage.id], 'arrow-up');
                    }
                }
            }
        }

        const pageManifest = {
            Controllers: [{ Actions: actions, Type: "Keypad" }]
        };
        pageFolder.file("manifest.json", JSON.stringify(pageManifest, null, 2));
    }

    // Top-level manifest with all pages
    const mainPage = config.pages.find(p => p.type === 'main');
    const topLevelManifest = {
        Name: config.name,
        Pages: {
            Current: mainPage ? pageUuids[mainPage.id] : Object.values(pageUuids)[0],
            Pages: Object.values(pageUuids)
        },
        Version: "2.0"
    };

    profileFolder.file("manifest.json", JSON.stringify(topLevelManifest, null, 2));

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const base64 = zipBuffer.toString("base64");

    return {
        data: base64,
        filename: `${safeFilename}.streamDeckProfile`
    };
}

function createNavigationAction(label: string, targetProfileUuid: string, icon: string): ProfileAction {
    return {
        Name: label,
        Settings: {
            ProfileUUID: targetProfileUuid
        },
        State: 0,
        States: [
            {
                Title: label,
                TitleAlignment: "middle",
                ShowTitle: true
            }
        ],
        UUID: "com.elgato.streamdeck.profile.openchild"
    };
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/layout/profile-generator.ts
git commit -m "feat: update profile generator for multi-page profiles"
```

---

## Task 8: Integration Testing

**Step 1: Test full flow**

1. Open Style Editor
2. Create groups with different display types (folder, page, flat)
3. Add ungrouped entities
4. Configure navigation positions
5. Test drag-drop sorting
6. Preview all pages
7. Generate and download profile
8. Import profile to Stream Deck

**Step 2: Verify navigation**

- Linear pages navigate with ←/→
- Folders open and close with folder button and ↑
- All buttons in correct positions

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete layout rendering implementation"
```

---

## Summary

**Files Modified:**
- `com.deckassistant.sdPlugin/ui/js/layout-editor.js` — Core logic
- `com.deckassistant.sdPlugin/ui/layout-editor.html` — UI components
- `com.deckassistant.sdPlugin/ui/css/layout-editor.css` — Styling
- `src/layout/profile-generator.ts` — Multi-page profile output

**Features Implemented:**
1. Navigation position settings (nav buttons, folder up)
2. Ungrouped entity sorting (drag-drop + quick-sort)
3. Correct page generation order (folders → flat → ungrouped → page-groups)
4. Linear navigation for pages
5. Hub-and-spoke navigation for folders
6. Multi-page profile generation
