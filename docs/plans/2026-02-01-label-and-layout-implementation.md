# Label Configuration & Layout Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-group label configuration and improve layout ordering with ungrouped as a sortable item, separated page groups, and new-row option for flat groups.

**Architecture:** Extend existing group style structure with labelStyle property. Refactor group display options UI to show ungrouped as sortable item and visually separate page groups. Update render logic for two-phase placement.

**Tech Stack:** Alpine.js (frontend), vanilla JS, TypeScript (profile generator)

---

## Task 1: Add Ungrouped to Sortable List Data Model

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Update wizardSelections structure**

Find the `wizardSelections` default (around line 370) and add `ungroupedPosition`:

```javascript
wizardSelections: {
    selectedEntities: [],
    groups: [],
    ungroupedEntities: [],
    ungroupedPosition: null,  // New: null means "at end", number means position in sort order
},
```

**Step 2: Add startNewRow to group structure**

When groups are created (in `createGroupFromSelection` or similar), ensure they have:

```javascript
{
    name: groupName,
    displayType: 'flat',
    startNewRow: false,  // New property
    entities: [...]
}
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: add ungroupedPosition and startNewRow to data model"
```

---

## Task 2: Update Group Display Options UI Structure

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`

**Step 1: Find the group display options section**

Look for the wizard step that shows group configuration (search for `displayType` or group sorting UI).

**Step 2: Split into two sections**

Create two distinct sections:

```html
<!-- Main Page Layout Section -->
<div class="wizard-layout-section">
    <div class="wizard-section-header">
        <h4>Main Page Layout</h4>
        <p class="wizard-section-hint">Drag to set render order</p>
    </div>

    <div class="wizard-sortable-list" id="main-layout-list">
        <!-- Groups with displayType 'folder' or 'flat' -->
        <template x-for="item in getMainLayoutItems()" :key="item.id">
            <div class="wizard-sortable-item"
                 draggable="true"
                 @dragstart="handleLayoutDragStart($event, item)"
                 @dragover.prevent="handleLayoutDragOver($event, item)"
                 @drop="handleLayoutDrop($event, item)">
                <span class="wizard-drag-handle">≡</span>
                <span class="wizard-item-name" x-text="item.name"></span>

                <!-- Display type selector (hidden for ungrouped) -->
                <template x-if="item.type !== 'ungrouped'">
                    <select class="wizard-display-select"
                            :value="item.displayType"
                            @change="setGroupDisplayType(item.name, $event.target.value)">
                        <option value="folder">Folder</option>
                        <option value="flat">Flat</option>
                        <option value="page">Page</option>
                    </select>
                </template>
                <template x-if="item.type === 'ungrouped'">
                    <span class="wizard-display-locked">Flat</span>
                </template>

                <!-- New Row checkbox (only for flat) -->
                <template x-if="item.displayType === 'flat' && item.type !== 'ungrouped'">
                    <label class="wizard-newrow-checkbox">
                        <input type="checkbox"
                               :checked="item.startNewRow"
                               @change="setGroupStartNewRow(item.name, $event.target.checked)">
                        New Row
                    </label>
                </template>
            </div>
        </template>
    </div>
</div>

<!-- Separator -->
<div class="wizard-section-separator"></div>

<!-- Page Groups Section -->
<div class="wizard-layout-section wizard-page-section">
    <div class="wizard-section-header">
        <h4>Separate Pages</h4>
        <p class="wizard-section-hint">Render at end of navigation chain</p>
    </div>

    <div class="wizard-sortable-list" id="page-layout-list">
        <template x-for="group in getPageGroups()" :key="group.name">
            <div class="wizard-sortable-item wizard-page-item"
                 draggable="true"
                 @dragstart="handlePageDragStart($event, group)"
                 @dragover.prevent="handlePageDragOver($event, group)"
                 @drop="handlePageDrop($event, group)">
                <span class="wizard-drag-handle">≡</span>
                <span class="wizard-item-name" x-text="group.name"></span>
                <span class="wizard-display-locked">Page</span>
            </div>
        </template>

        <template x-if="getPageGroups().length === 0">
            <div class="wizard-empty-hint">No page groups configured</div>
        </template>
    </div>
</div>
```

**Step 3: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/layout-editor.html
git commit -m "feat: split group display options into main layout and page sections"
```

---

## Task 3: Add Helper Functions for Layout Sections

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Add getMainLayoutItems function**

Returns groups (folder/flat) + ungrouped in sort order:

```javascript
/**
 * Get items for main layout section (folders, flats, ungrouped) in sort order
 */
getMainLayoutItems() {
    const items = [];
    const groups = this.wizardSelections.groups || [];

    // Get non-page groups
    const mainGroups = groups
        .filter(g => g.displayType !== 'page')
        .map(g => ({
            type: 'group',
            id: g.name,
            name: g.name,
            displayType: g.displayType,
            startNewRow: g.startNewRow || false,
            entities: g.entities
        }));

    // Create ungrouped item
    const ungroupedItem = {
        type: 'ungrouped',
        id: '__ungrouped__',
        name: 'Ungrouped Items',
        displayType: 'flat',
        startNewRow: false,
        entities: this.wizardSelections.ungroupedEntities || []
    };

    // Determine ungrouped position
    const ungroupedPos = this.wizardSelections.ungroupedPosition;

    if (ungroupedPos === null || ungroupedPos === undefined || ungroupedPos >= mainGroups.length) {
        // Ungrouped at end
        items.push(...mainGroups, ungroupedItem);
    } else {
        // Insert ungrouped at specified position
        mainGroups.splice(ungroupedPos, 0, ungroupedItem);
        items.push(...mainGroups);
    }

    return items;
},

/**
 * Get page-type groups
 */
getPageGroups() {
    return (this.wizardSelections.groups || [])
        .filter(g => g.displayType === 'page');
},
```

**Step 2: Add setGroupDisplayType function**

Handles moving groups between sections when display type changes:

```javascript
/**
 * Set display type for a group, moving between sections if needed
 */
setGroupDisplayType(groupName, displayType) {
    const group = this.wizardSelections.groups.find(g => g.name === groupName);
    if (!group) return;

    const wasPage = group.displayType === 'page';
    const isPage = displayType === 'page';

    group.displayType = displayType;

    // Clear startNewRow if not flat
    if (displayType !== 'flat') {
        group.startNewRow = false;
    }

    // Refresh preview
    this.refreshPreviewPages();
},

/**
 * Set startNewRow for a flat group
 */
setGroupStartNewRow(groupName, startNewRow) {
    const group = this.wizardSelections.groups.find(g => g.name === groupName);
    if (group && group.displayType === 'flat') {
        group.startNewRow = startNewRow;
        this.refreshPreviewPages();
    }
},
```

**Step 3: Add drag handlers for layout sorting**

```javascript
/**
 * Handle drag start for layout items
 */
handleLayoutDragStart(event, item) {
    this.draggedLayoutItem = item;
    event.dataTransfer.effectAllowed = 'move';
},

/**
 * Handle drag over for layout items
 */
handleLayoutDragOver(event, targetItem) {
    if (!this.draggedLayoutItem || this.draggedLayoutItem.id === targetItem.id) return;
    event.preventDefault();
},

/**
 * Handle drop for layout items
 */
handleLayoutDrop(event, targetItem) {
    if (!this.draggedLayoutItem || this.draggedLayoutItem.id === targetItem.id) return;
    event.preventDefault();

    const items = this.getMainLayoutItems();
    const fromIndex = items.findIndex(i => i.id === this.draggedLayoutItem.id);
    const toIndex = items.findIndex(i => i.id === targetItem.id);

    if (fromIndex === -1 || toIndex === -1) return;

    // Reorder the actual data
    this.reorderMainLayoutItems(fromIndex, toIndex);

    this.draggedLayoutItem = null;
    this.refreshPreviewPages();
},

/**
 * Reorder main layout items
 */
reorderMainLayoutItems(fromIndex, toIndex) {
    const items = this.getMainLayoutItems();
    const movedItem = items[fromIndex];

    // Build new order of group names (excluding ungrouped)
    const newGroupOrder = [];
    let newUngroupedPosition = null;

    // Remove item from old position, insert at new position
    items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);

    // Rebuild group order and ungrouped position
    items.forEach((item, index) => {
        if (item.type === 'ungrouped') {
            newUngroupedPosition = index;
        } else {
            newGroupOrder.push(item.id);
        }
    });

    // Reorder groups array to match
    const groups = this.wizardSelections.groups;
    const nonPageGroups = groups.filter(g => g.displayType !== 'page');
    const pageGroups = groups.filter(g => g.displayType === 'page');

    const reorderedNonPage = newGroupOrder.map(name =>
        nonPageGroups.find(g => g.name === name)
    ).filter(Boolean);

    this.wizardSelections.groups = [...reorderedNonPage, ...pageGroups];
    this.wizardSelections.ungroupedPosition = newUngroupedPosition;
},
```

**Step 4: Add state property for dragging**

In the component data:

```javascript
draggedLayoutItem: null,
```

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: add helper functions for layout sections and drag reordering"
```

---

## Task 4: Update buildPagesFromStyleEditor for New Render Logic

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Refactor buildPagesFromStyleEditor**

Update to use two-phase rendering:

```javascript
buildPagesFromStyleEditor() {
    const pages = [];
    const groups = this.wizardSelections.groups || [];
    const ungrouped = this.wizardSelections.ungroupedEntities || [];
    const cellsPerPage = this.deviceSize.cols * this.deviceSize.rows;

    // Get main layout items in user's sort order
    const mainLayoutItems = this.getMainLayoutItems();

    // Separate into phases
    const phase1Items = [];  // Continuous flow items
    const phase2Items = [];  // New-row items

    for (const item of mainLayoutItems) {
        if (item.displayType === 'flat' && item.startNewRow && item.type !== 'ungrouped') {
            phase2Items.push(item);
        } else {
            phase1Items.push(item);
        }
    }

    // Build linear items from phase 1
    const linearItems = [];

    for (const item of phase1Items) {
        if (item.type === 'ungrouped') {
            // Ungrouped entities
            for (const entityId of item.entities) {
                const entity = this.getEntityById(entityId);
                if (entity) {
                    linearItems.push({
                        type: 'entity',
                        entity: entity,
                        entityId: entityId,
                        groupName: '__ungrouped__'
                    });
                }
            }
        } else if (item.displayType === 'folder') {
            // Folder button
            linearItems.push({
                type: 'folder-button',
                group: groups.find(g => g.name === item.name),
                groupName: item.name
            });
        } else if (item.displayType === 'flat') {
            // Flat group entities
            const group = groups.find(g => g.name === item.name);
            if (group) {
                for (const entityId of group.entities) {
                    const entity = this.getEntityById(entityId);
                    if (entity) {
                        linearItems.push({
                            type: 'entity',
                            entity: entity,
                            entityId: entityId,
                            groupName: item.name
                        });
                    }
                }
            }
        }
    }

    // Phase 2: New-row groups (will be added after phase 1 fills)
    const newRowGroups = phase2Items.map(item => {
        const group = groups.find(g => g.name === item.name);
        return {
            group: group,
            entities: group ? group.entities.map(entityId => ({
                type: 'entity',
                entity: this.getEntityById(entityId),
                entityId: entityId,
                groupName: item.name
            })).filter(e => e.entity) : []
        };
    });

    // Page groups (separate pages)
    const pageGroups = groups.filter(g => g.displayType === 'page');
    const pageGroupItems = pageGroups.map(group => ({
        group,
        items: group.entities.map(entityId => {
            const entity = this.getEntityById(entityId);
            return entity ? {
                type: 'entity',
                entity: entity,
                entityId: entityId,
                groupName: group.name
            } : null;
        }).filter(Boolean)
    }));

    // Build pages with two-phase placement
    const linearPages = this.buildLinearPagesWithNewRows(linearItems, newRowGroups, pageGroupItems);
    pages.push(...linearPages);

    // Build folder sub-pages
    const folderGroups = groups.filter(g => g.displayType === 'folder');
    for (const group of folderGroups) {
        const folderPages = this.buildFolderSubPages(group);
        pages.push(...folderPages);
    }

    return pages;
},
```

**Step 2: Add buildLinearPagesWithNewRows function**

```javascript
/**
 * Build linear pages with support for new-row groups
 */
buildLinearPagesWithNewRows(linearItems, newRowGroups, pageGroupItems) {
    const pages = [];
    const cols = this.deviceSize.cols;
    const rows = this.deviceSize.rows;
    const cellsPerPage = cols * rows;
    const navPositions = this.getNavPositions(this.theme.navStartPosition);

    let remainingItems = [...linearItems];
    let pageIndex = 0;
    let isMain = true;

    const pageGroupsExist = pageGroupItems.length > 0;
    const newRowGroupsExist = newRowGroups.length > 0;

    // Phase 1: Place continuous flow items
    while (remainingItems.length > 0 || (isMain && remainingItems.length === 0)) {
        const page = {
            id: this.generateId(),
            name: isMain ? 'Main' : `Page ${pageIndex + 1}`,
            type: isMain ? 'main' : 'overflow',
            layout: this.createEmptyLayout()
        };

        const hasMorePhase1 = remainingItems.length > (isMain ? cellsPerPage - 1 : cellsPerPage - 2);
        const needsNext = hasMorePhase1 || pageGroupsExist || newRowGroupsExist;
        const needsPrev = !isMain;

        let availableSlots = cellsPerPage;
        if (needsNext) availableSlots--;
        if (needsPrev) availableSlots--;

        // Place navigation
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

        // Fill with phase 1 items
        const itemsForPage = remainingItems.splice(0, availableSlots);
        let slotIndex = 0;

        for (const item of itemsForPage) {
            while (slotIndex < cellsPerPage) {
                const row = Math.floor(slotIndex / cols);
                const col = slotIndex % cols;

                if (page.layout[row][col] !== null) {
                    slotIndex++;
                    continue;
                }

                if (item.type === 'folder-button') {
                    page.layout[row][col] = {
                        type: 'folder',
                        label: item.group.name,
                        icon: 'mdi:folder',
                        groupName: item.groupName,
                        targetPageId: null
                    };
                } else {
                    page.layout[row][col] = {
                        type: 'entity',
                        ...item.entity,
                        entityId: item.entityId,
                        icon: this.getEntityIconName(item.entity),
                        groupName: item.groupName
                    };
                }
                slotIndex++;
                break;
            }
        }

        pages.push(page);
        pageIndex++;
        isMain = false;

        if (remainingItems.length === 0) break;
    }

    // Phase 2: Place new-row groups
    // Find the last page with content and continue from there
    let currentPage = pages[pages.length - 1];
    let currentRow = this.findNextEmptyRow(currentPage.layout);

    for (const { group, entities } of newRowGroups) {
        if (entities.length === 0) continue;

        // Start on new row
        if (currentRow >= rows) {
            // Need a new page
            currentPage = {
                id: this.generateId(),
                name: `Page ${pages.length + 1}`,
                type: 'overflow',
                layout: this.createEmptyLayout()
            };
            pages.push(currentPage);
            currentRow = 0;

            // Add prev navigation
            currentPage.layout[navPositions.prev.row][navPositions.prev.col] = {
                type: 'nav-prev',
                icon: 'mdi:arrow-left',
                label: '←'
            };
        }

        // Place entities starting at column 0 of currentRow
        let col = 0;
        for (const item of entities) {
            // Skip nav positions
            while (currentPage.layout[currentRow]?.[col] !== null && col < cols) {
                col++;
            }

            if (col >= cols) {
                currentRow++;
                col = 0;

                if (currentRow >= rows) {
                    // Need overflow
                    // Add next nav to current page
                    currentPage.layout[navPositions.next.row][navPositions.next.col] = {
                        type: 'nav-next',
                        icon: 'mdi:arrow-right',
                        label: '→'
                    };

                    currentPage = {
                        id: this.generateId(),
                        name: `Page ${pages.length + 1}`,
                        type: 'overflow',
                        layout: this.createEmptyLayout()
                    };
                    pages.push(currentPage);
                    currentRow = 0;

                    currentPage.layout[navPositions.prev.row][navPositions.prev.col] = {
                        type: 'nav-prev',
                        icon: 'mdi:arrow-left',
                        label: '←'
                    };
                }
            }

            if (currentPage.layout[currentRow][col] === null) {
                currentPage.layout[currentRow][col] = {
                    type: 'entity',
                    ...item.entity,
                    entityId: item.entityId,
                    icon: this.getEntityIconName(item.entity),
                    groupName: item.groupName
                };
                col++;
            }
        }

        // Move to next row for next new-row group
        currentRow++;
    }

    // Add next navigation if page groups exist
    if (pageGroupsExist && pages.length > 0) {
        const lastPage = pages[pages.length - 1];
        if (!lastPage.layout[navPositions.next.row][navPositions.next.col]) {
            lastPage.layout[navPositions.next.row][navPositions.next.col] = {
                type: 'nav-next',
                icon: 'mdi:arrow-right',
                label: '→'
            };
        }
    }

    // Add page-group pages (existing logic)
    for (const { group, items } of pageGroupItems) {
        // ... existing page group logic
        let remainingGroupItems = [...items];
        let groupPageIndex = 0;

        while (remainingGroupItems.length > 0) {
            const isLastGroupPage = remainingGroupItems.length <= (cellsPerPage - 2);
            const needsNextNav = !isLastGroupPage || pageGroupItems.indexOf(pageGroupItems.find(p => p.group === group)) < pageGroupItems.length - 1;

            const page = {
                id: this.generateId(),
                name: groupPageIndex === 0 ? group.name : `${group.name} ${groupPageIndex + 1}`,
                type: 'page-group',
                groupName: group.name,
                layout: this.createEmptyLayout()
            };

            page.layout[navPositions.prev.row][navPositions.prev.col] = {
                type: 'nav-prev',
                icon: 'mdi:arrow-left',
                label: '←'
            };

            if (needsNextNav) {
                page.layout[navPositions.next.row][navPositions.next.col] = {
                    type: 'nav-next',
                    icon: 'mdi:arrow-right',
                    label: '→'
                };
            }

            const availableSlots = needsNextNav ? cellsPerPage - 2 : cellsPerPage - 1;
            const itemsForPage = remainingGroupItems.splice(0, availableSlots);
            let slotIndex = 0;

            for (const item of itemsForPage) {
                while (slotIndex < cellsPerPage) {
                    const row = Math.floor(slotIndex / cols);
                    const col = slotIndex % cols;

                    if (page.layout[row][col] !== null) {
                        slotIndex++;
                        continue;
                    }

                    page.layout[row][col] = {
                        type: 'entity',
                        ...item.entity,
                        entityId: item.entityId,
                        icon: this.getEntityIconName(item.entity),
                        groupName: item.groupName
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
 * Find the next empty row in a layout
 */
findNextEmptyRow(layout) {
    for (let row = 0; row < layout.length; row++) {
        const hasContent = layout[row].some(cell => cell !== null);
        if (!hasContent) return row;
    }
    return layout.length; // All rows have content
},
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: implement two-phase render with new-row support"
```

---

## Task 5: Add CSS for Layout Sections

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/css/layout-editor.css`

**Step 1: Add styles for separated sections**

```css
/* Layout sections */
.wizard-layout-section {
    margin-bottom: 16px;
}

.wizard-section-header h4 {
    margin: 0 0 4px 0;
    font-size: 13px;
    color: #fff;
}

.wizard-section-hint {
    margin: 0 0 8px 0;
    font-size: 11px;
    color: #888;
}

.wizard-section-separator {
    height: 1px;
    background: #444;
    margin: 16px 0;
}

.wizard-page-section {
    opacity: 0.8;
}

.wizard-page-section .wizard-section-header h4 {
    color: #aaa;
}

/* Sortable items */
.wizard-sortable-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: #2a2a2a;
    border-radius: 4px;
    margin-bottom: 4px;
    cursor: grab;
}

.wizard-sortable-item:active {
    cursor: grabbing;
}

.wizard-sortable-item.dragging {
    opacity: 0.5;
}

.wizard-drag-handle {
    color: #666;
    font-size: 14px;
}

.wizard-item-name {
    flex: 1;
    color: #fff;
    font-size: 12px;
}

.wizard-display-select {
    background: #333;
    border: 1px solid #444;
    border-radius: 4px;
    color: #fff;
    padding: 2px 6px;
    font-size: 11px;
}

.wizard-display-locked {
    color: #666;
    font-size: 11px;
    padding: 2px 6px;
}

.wizard-newrow-checkbox {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #aaa;
}

.wizard-newrow-checkbox input {
    margin: 0;
}

.wizard-page-item {
    background: #252525;
    border-left: 2px solid #555;
}

.wizard-empty-hint {
    color: #666;
    font-size: 11px;
    font-style: italic;
    padding: 8px;
}
```

**Step 2: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/css/layout-editor.css
git commit -m "feat: add CSS for layout section UI"
```

---

## Task 6: Add labelStyle to Group Style Structure

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Update default ungroupedStyle**

Find `ungroupedStyle` default (around line 309) and add `labelStyle`:

```javascript
ungroupedStyle: {
    preset: null,
    background: '#1a1a2e',
    onOff: '#4CAF50',
    information: '#2196F3',
    trigger: '#FF9800',
    labelStyle: 'name'  // New
},
```

**Step 2: Update getGroupStyle default return**

Find `getGroupStyle` (around line 2855) and add `labelStyle`:

```javascript
getGroupStyle(groupName) {
    const style = this.groupStyles[groupName];
    if (style) return style;
    return {
        preset: null,
        background: '#1a1a2e',
        onOff: '#4CAF50',
        information: '#2196F3',
        trigger: '#FF9800',
        labelStyle: 'name'  // New
    };
},
```

**Step 3: Update themePresets to include labelStyle**

Find `themePresets` (around line 326) and add `labelStyle` to each:

```javascript
themePresets: {
    modern: {
        name: 'Modern',
        background: '#1a1a2e',
        onOff: '#4CAF50',
        information: '#2196F3',
        trigger: '#FF9800',
        labelStyle: 'name'  // New
    },
    // ... same for classic, minimal, vibrant
},
```

**Step 4: Update applyPreset to include labelStyle**

In `applyPreset`, include `labelStyle` when creating style objects:

```javascript
this.groupStyles[groupName] = {
    preset: presetName,
    background: preset.background,
    onOff: preset.onOff,
    information: preset.information,
    trigger: preset.trigger,
    labelStyle: preset.labelStyle || 'name'  // New
};
```

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: add labelStyle to group style structure"
```

---

## Task 7: Add Label Dropdown to Style Controls

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`

**Step 1: Add label dropdown to group style controls**

After the Trigger color picker (around line 100), add:

```html
<div class="style-control-row">
    <label>Labels</label>
    <select class="style-select"
            :value="getGroupStyle(group.name).labelStyle || 'name'"
            @change="setGroupStyleProp(group.name, 'labelStyle', $event.target.value)">
        <option value="none">Icon Only</option>
        <option value="name">Name</option>
        <option value="state">State</option>
        <option value="name-and-state">Name + State</option>
    </select>
</div>
```

**Step 2: Add same dropdown to ungrouped style controls**

After the ungrouped Trigger color picker (around line 170), add:

```html
<div class="style-control-row">
    <label>Labels</label>
    <select class="style-select"
            :value="ungroupedStyle.labelStyle || 'name'"
            @change="ungroupedStyle.labelStyle = $event.target.value">
        <option value="none">Icon Only</option>
        <option value="name">Name</option>
        <option value="state">State</option>
        <option value="name-and-state">Name + State</option>
    </select>
</div>
```

**Step 3: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/layout-editor.html
git commit -m "feat: add label style dropdown to style controls"
```

---

## Task 8: Update Preview Button Rendering for Labels

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Update getPreviewButtons to include label text**

In `getPreviewButtons()`, after computing colors, add label computation:

```javascript
// Inside the cell processing loop, after color computation:

let label = '';
let subLabel = '';

if (cell.type === 'entity') {
    const style = cell.groupName === '__ungrouped__'
        ? this.ungroupedStyle
        : this.getGroupStyle(cell.groupName);
    const labelStyle = style.labelStyle || 'name';

    const entity = this.getEntityById(cell.entityId);
    if (entity) {
        switch (labelStyle) {
            case 'none':
                label = '';
                break;
            case 'name':
                label = entity.friendly_name || cell.entityId;
                break;
            case 'state':
                label = entity.state || '';
                break;
            case 'name-and-state':
                label = entity.friendly_name || cell.entityId;
                subLabel = entity.state || '';
                break;
        }
    }
} else if (cell.type === 'folder') {
    const style = this.getGroupStyle(cell.groupName);
    const labelStyle = style.labelStyle || 'name';
    const group = this.wizardSelections.groups.find(g => g.name === cell.groupName);
    const entityCount = group ? group.entities.length : 0;

    switch (labelStyle) {
        case 'none':
            label = '';
            break;
        case 'name':
            label = cell.groupName;
            break;
        case 'state':
            label = `${entityCount} items`;
            break;
        case 'name-and-state':
            label = cell.groupName;
            subLabel = `${entityCount} items`;
            break;
    }
} else if (cell.type === 'nav-next' || cell.type === 'nav-prev' || cell.type === 'folder-up') {
    label = cell.label;
}

buttons.push({
    ...cell,
    backgroundColor,
    iconColor,
    textColor,
    label,      // Updated
    subLabel    // New
});
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: update preview buttons with label style support"
```

---

## Task 9: Update Preview HTML for Sub-labels

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`

**Step 1: Update preview button template**

Find the preview button label div (around line 215) and update:

```html
<div class="preview-button-labels">
    <div class="preview-button-label"
         :style="{ color: button.textColor }"
         x-text="button.label"
         x-show="button.label"></div>
    <div class="preview-button-sublabel"
         :style="{ color: button.textColor }"
         x-text="button.subLabel"
         x-show="button.subLabel"></div>
</div>
```

**Step 2: Add CSS for sublabel**

In layout-editor.css:

```css
.preview-button-labels {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
}

.preview-button-label {
    font-size: 8px;
    line-height: 1.1;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
}

.preview-button-sublabel {
    font-size: 7px;
    line-height: 1.1;
    text-align: center;
    opacity: 0.8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
}
```

**Step 3: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/layout-editor.html com.deckassistant.sdPlugin/ui/css/layout-editor.css
git commit -m "feat: add sublabel support to preview buttons"
```

---

## Task 10: Update Profile Generator for Labels

**Files:**
- Modify: `src/layout/profile-generator.ts`

**Step 1: Update GroupStyle interface**

Add `labelStyle` to the interface:

```typescript
interface GroupStyle {
    background: string;
    onOff: string;
    information: string;
    trigger: string;
    labelStyle?: 'none' | 'name' | 'state' | 'name-and-state';
}
```

**Step 2: Update createEntityButtonAction**

Pass label settings to the action:

```typescript
function createEntityButtonAction(
    entity: EntityData,
    config: ProfileConfig
): ProfileAction {
    const domain = entity.domain || 'unknown';
    const style = getGroupStyle(entity.groupName, config.groupStyles, config.ungroupedStyle);
    const categoryColor = getEntityCategoryColor(domain, style);
    const iconColor = categoryColor;
    const textColor = categoryColor;
    const backgroundColor = style.background;
    const friendlyName = entity.friendly_name || entity.label || entity.entity_id || 'Entity';
    const labelStyle = style.labelStyle || 'name';

    return {
        Name: friendlyName,
        Settings: {
            entityId: entity.entity_id,
            domain: domain,
            friendlyName: friendlyName,
            iconSource: "domain",
            iconColor: iconColor,
            textColor: textColor,
            backgroundColor: backgroundColor,
            // Label settings
            labelStyle: labelStyle,
            showTitle: labelStyle !== 'none',
            showState: labelStyle === 'state' || labelStyle === 'name-and-state'
        },
        State: 0,
        States: [{
            Title: '',  // Blank - user can customize in SD software
            TitleAlignment: "bottom",
            ShowTitle: false
        }],
        UUID: "com.deckassistant.entity-button"
    };
}
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/layout/profile-generator.ts
git commit -m "feat: add labelStyle to profile generator"
```

---

## Task 11: Integration Testing

**Step 1: Test layout ordering**

1. Create multiple groups with different display types
2. Add ungrouped entities
3. Drag to reorder items in the main layout section
4. Verify preview updates correctly
5. Change a group to "Page" type, verify it moves to bottom section
6. Test "New Row" checkbox on flat groups

**Step 2: Test label configuration**

1. Change labelStyle dropdown for a group
2. Verify preview shows correct labels (name, state, both, none)
3. Verify folder buttons show correct labels (name, count, both, none)
4. Generate a profile and verify settings are passed correctly

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete label configuration and layout improvements"
```

---

## Summary

**Files Modified:**
- `com.deckassistant.sdPlugin/ui/js/layout-editor.js` - Core logic
- `com.deckassistant.sdPlugin/ui/layout-editor.html` - UI updates
- `com.deckassistant.sdPlugin/ui/css/layout-editor.css` - Styling
- `src/layout/profile-generator.ts` - Profile generation

**Features Added:**
1. Ungrouped entities as sortable item in layout order
2. Visual separation of page groups at bottom
3. "New Row" option for flat groups
4. Per-group label style (none, name, state, name-and-state)
5. Two-phase render logic for new-row groups
