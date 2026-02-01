# Theming Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the theming model to use category-based colors (On/Off, Information, Trigger) per group, remove global domain colors, and simplify ungrouped entities to match named groups.

**Architecture:** Replace the current 27 domain color pickers with 3 semantic category colors per group. Each group will have: Background + On/Off color + Information color + Trigger color. Presets apply per-group instead of globally. Ungrouped entities are simplified to a basic list without drag-drop reordering.

**Tech Stack:** Alpine.js (frontend), vanilla JS

---

## Summary of Changes

### Remove
- Global domain colors panel (27 color pickers)
- Ungrouped entity drag-drop reordering
- Ungrouped entity sort buttons
- Ungrouped entity position numbers and page indicators
- Per-group "Icon Color" and "Text Color" (replaced by category colors)

### Add
- Per-group category colors: On/Off, Information, Trigger
- Entity categorization helper function
- Per-group preset application

### Modify
- Group style structure (new color properties)
- Theme presets structure (add category colors)
- Preview button rendering (use category-based colors)
- Profile generator (text color = icon color by category)

---

## Task 1: Define Entity Categories

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Add category constants at top of file**

After the `DOMAIN_COLORS` constant (around line 9), add:

```javascript
// Entity categories for theming
const ENTITY_CATEGORIES = {
    controllable: [
        'light', 'switch', 'cover', 'lock', 'fan', 'media_player',
        'vacuum', 'climate', 'humidifier', 'water_heater', 'valve',
        'siren', 'remote', 'button'
    ],
    informational: [
        'sensor', 'binary_sensor', 'weather', 'sun', 'moon', 'calendar',
        'device_tracker', 'person', 'zone'
    ],
    trigger: [
        'script', 'scene', 'automation', 'input_boolean', 'input_button',
        'input_number', 'input_select', 'input_text', 'input_datetime',
        'timer', 'counter', 'schedule'
    ]
};

// Default category colors
const DEFAULT_CATEGORY_COLORS = {
    onOff: '#4CAF50',       // Green for controllable
    information: '#2196F3', // Blue for sensors
    trigger: '#FF9800'      // Orange for automations
};
```

**Step 2: Add helper function to get entity category**

Add this function in the styleEditor() return object (around line 3000, near other helper functions):

```javascript
/**
 * Get the category for an entity based on its domain
 * @returns 'controllable' | 'informational' | 'trigger'
 */
getEntityCategory(entity) {
    if (!entity || !entity.domain) return 'controllable';

    const domain = entity.domain;

    if (ENTITY_CATEGORIES.controllable.includes(domain)) {
        return 'controllable';
    }
    if (ENTITY_CATEGORIES.informational.includes(domain)) {
        return 'informational';
    }
    if (ENTITY_CATEGORIES.trigger.includes(domain)) {
        return 'trigger';
    }

    // Default to controllable for unknown domains
    return 'controllable';
},

/**
 * Get the icon/text color for an entity based on its category and group style
 */
getEntityCategoryColor(entity, groupStyle) {
    const category = this.getEntityCategory(entity);

    switch (category) {
        case 'controllable':
            return groupStyle.onOffColor || DEFAULT_CATEGORY_COLORS.onOff;
        case 'informational':
            return groupStyle.informationColor || DEFAULT_CATEGORY_COLORS.information;
        case 'trigger':
            return groupStyle.triggerColor || DEFAULT_CATEGORY_COLORS.trigger;
        default:
            return groupStyle.onOffColor || DEFAULT_CATEGORY_COLORS.onOff;
    }
},
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: add entity category constants and helper functions"
```

---

## Task 2: Update Group Style Structure

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Update themePresets to include category colors**

Find `themePresets` (around line 300) and update:

```javascript
themePresets: {
    dark: {
        name: 'Stream Deck Dark',
        backgroundColor: '#1C1C1C',
        onOffColor: '#4CAF50',
        informationColor: '#2196F3',
        triggerColor: '#FF9800',
        folderColor: '#333333'
    },
    blue: {
        name: 'Home Assistant Blue',
        backgroundColor: '#03A9F4',
        onOffColor: '#FFFFFF',
        informationColor: '#E3F2FD',
        triggerColor: '#FFEB3B',
        folderColor: '#0288D1'
    },
    minimal: {
        name: 'Minimal White',
        backgroundColor: '#FFFFFF',
        onOffColor: '#4CAF50',
        informationColor: '#2196F3',
        triggerColor: '#FF9800',
        folderColor: '#F5F5F5'
    }
},
```

**Step 2: Update ungroupedStyle default**

Find `ungroupedStyle` (around line 284) and update:

```javascript
ungroupedStyle: {
    backgroundColor: '#1C1C1C',
    onOffColor: '#4CAF50',
    informationColor: '#2196F3',
    triggerColor: '#FF9800'
},
```

**Step 3: Update getGroupStyle to use new structure**

Find `getGroupStyle` (around line 2982) and update:

```javascript
getGroupStyle(groupName) {
    if (!this.groupStyles[groupName]) {
        const preset = this.themePresets[this.currentPreset];
        this.groupStyles[groupName] = {
            backgroundColor: preset.backgroundColor,
            onOffColor: preset.onOffColor,
            informationColor: preset.informationColor,
            triggerColor: preset.triggerColor
        };
    }
    return this.groupStyles[groupName];
},
```

**Step 4: Update applyPreset to use new structure**

Find `applyPreset` (around line 3308) and update:

```javascript
applyPreset(presetId) {
    const preset = this.themePresets[presetId];
    if (!preset) return;

    this.currentPreset = presetId;

    // Apply to all group styles
    for (const group of this.wizardSelections.groups || []) {
        this.groupStyles[group.name] = {
            backgroundColor: preset.backgroundColor,
            onOffColor: preset.onOffColor,
            informationColor: preset.informationColor,
            triggerColor: preset.triggerColor
        };
    }

    // Apply to ungrouped style
    this.ungroupedStyle = {
        backgroundColor: preset.backgroundColor,
        onOffColor: preset.onOffColor,
        informationColor: preset.informationColor,
        triggerColor: preset.triggerColor
    };

    // Update global theme background
    this.theme.backgroundColor = preset.backgroundColor;

    // Refresh preview
    this.refreshPreviewPages();
},
```

**Step 5: Update finishWizard and finishQuickSetup to use new structure**

Find these functions and update the style initialization to use the new properties.

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: update group style structure with category colors"
```

---

## Task 3: Update Group Styling UI

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`

**Step 1: Replace group style controls**

Find the group style controls section (around line 65-84) and replace:

```html
<!-- Style Controls -->
<div class="style-controls">
    <!-- Preset selector -->
    <div class="style-control-row">
        <label>Preset</label>
        <select class="style-preset-select"
                @change="applyPresetToGroup(group.name, $event.target.value)">
            <option value="">Custom</option>
            <option value="dark">Dark</option>
            <option value="blue">Blue</option>
            <option value="minimal">Minimal</option>
        </select>
    </div>
    <div class="style-control-row">
        <label>Background</label>
        <input type="color"
               :value="getGroupStyle(group.name).backgroundColor"
               @input="setGroupStyleProp(group.name, 'backgroundColor', $event.target.value)">
    </div>
    <div class="style-control-row">
        <label>On/Off</label>
        <input type="color"
               :value="getGroupStyle(group.name).onOffColor"
               @input="setGroupStyleProp(group.name, 'onOffColor', $event.target.value)">
    </div>
    <div class="style-control-row">
        <label>Information</label>
        <input type="color"
               :value="getGroupStyle(group.name).informationColor"
               @input="setGroupStyleProp(group.name, 'informationColor', $event.target.value)">
    </div>
    <div class="style-control-row">
        <label>Trigger</label>
        <input type="color"
               :value="getGroupStyle(group.name).triggerColor"
               @input="setGroupStyleProp(group.name, 'triggerColor', $event.target.value)">
    </div>
</div>
```

**Step 2: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/layout-editor.html
git commit -m "feat: update group styling UI with category colors"
```

---

## Task 4: Add Per-Group Preset Function

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Add applyPresetToGroup function**

Add near `applyPreset`:

```javascript
/**
 * Apply a theme preset to a specific group
 */
applyPresetToGroup(groupName, presetId) {
    if (!presetId) return; // "Custom" selected

    const preset = this.themePresets[presetId];
    if (!preset) return;

    this.groupStyles[groupName] = {
        backgroundColor: preset.backgroundColor,
        onOffColor: preset.onOffColor,
        informationColor: preset.informationColor,
        triggerColor: preset.triggerColor
    };

    this.refreshPreviewPages();
},
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: add per-group preset application"
```

---

## Task 5: Simplify Ungrouped Entities Section

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`

**Step 1: Replace ungrouped section with simplified version**

Find the ungrouped section (around line 100-175) and replace with:

```html
<!-- Ungrouped Entities -->
<template x-if="wizardSelections.ungroupedEntities && wizardSelections.ungroupedEntities.length > 0">
    <div class="style-group-item">
        <div class="style-group-header" @click="ungroupedExpanded = !ungroupedExpanded">
            <span class="style-group-expand" x-text="ungroupedExpanded ? '▼' : '▶'"></span>
            <span class="style-group-name">Ungrouped</span>
            <span class="style-group-count" x-text="wizardSelections.ungroupedEntities.length"></span>
            <span class="style-group-type">main</span>
        </div>

        <template x-if="ungroupedExpanded">
            <div class="style-group-content">
                <!-- Style Controls -->
                <div class="style-controls">
                    <div class="style-control-row">
                        <label>Preset</label>
                        <select class="style-preset-select"
                                @change="applyPresetToUngrouped($event.target.value)">
                            <option value="">Custom</option>
                            <option value="dark">Dark</option>
                            <option value="blue">Blue</option>
                            <option value="minimal">Minimal</option>
                        </select>
                    </div>
                    <div class="style-control-row">
                        <label>Background</label>
                        <input type="color"
                               :value="ungroupedStyle.backgroundColor"
                               @input="ungroupedStyle.backgroundColor = $event.target.value; refreshPreviewPages()">
                    </div>
                    <div class="style-control-row">
                        <label>On/Off</label>
                        <input type="color"
                               :value="ungroupedStyle.onOffColor"
                               @input="ungroupedStyle.onOffColor = $event.target.value; refreshPreviewPages()">
                    </div>
                    <div class="style-control-row">
                        <label>Information</label>
                        <input type="color"
                               :value="ungroupedStyle.informationColor"
                               @input="ungroupedStyle.informationColor = $event.target.value; refreshPreviewPages()">
                    </div>
                    <div class="style-control-row">
                        <label>Trigger</label>
                        <input type="color"
                               :value="ungroupedStyle.triggerColor"
                               @input="ungroupedStyle.triggerColor = $event.target.value; refreshPreviewPages()">
                    </div>
                </div>

                <!-- Entity List Preview (simple, no reordering) -->
                <div class="style-group-entities">
                    <template x-for="entityId in wizardSelections.ungroupedEntities.slice(0, 5)" :key="entityId">
                        <div class="style-entity-item" x-text="getEntityName(entityId)"></div>
                    </template>
                    <template x-if="wizardSelections.ungroupedEntities.length > 5">
                        <div class="style-entity-more" x-text="'+ ' + (wizardSelections.ungroupedEntities.length - 5) + ' more'"></div>
                    </template>
                </div>
            </div>
        </template>
    </div>
</template>
```

**Step 2: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/layout-editor.html
git commit -m "feat: simplify ungrouped entities to match named groups"
```

---

## Task 6: Add Ungrouped Preset Function and Remove Old Code

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Add applyPresetToUngrouped function**

```javascript
/**
 * Apply a theme preset to ungrouped entities
 */
applyPresetToUngrouped(presetId) {
    if (!presetId) return; // "Custom" selected

    const preset = this.themePresets[presetId];
    if (!preset) return;

    this.ungroupedStyle = {
        backgroundColor: preset.backgroundColor,
        onOffColor: preset.onOffColor,
        informationColor: preset.informationColor,
        triggerColor: preset.triggerColor
    };

    this.refreshPreviewPages();
},
```

**Step 2: Remove drag-drop related code**

Remove these state properties:
- `ungroupedDragIndex`
- `ungroupedDragOverIndex`

Remove these functions:
- `handleUngroupedDragStart`
- `handleUngroupedDragOver`
- `handleUngroupedDragLeave`
- `handleUngroupedDrop`
- `getEntityPageNumber`
- `getAvailableSortOptions`
- `applyUngroupedSort`

Remove from `wizardSelections`:
- `ungroupedSort`
- `ungroupedOriginalOrder`

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: add ungrouped preset function, remove drag-drop code"
```

---

## Task 7: Remove Global Domain Colors UI

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`

**Step 1: Remove domain colors section from right panel**

Find and remove the domain colors section (around line 245-256):

```html
<!-- Domain Colors - REMOVE THIS ENTIRE SECTION -->
<div class="theme-section">
    <div class="theme-section-title">Domain Colors</div>
    <div class="theme-domain-colors">
        ...
    </div>
</div>
```

**Step 2: Remove global presets section**

The global presets (around line 224-243) should be removed since presets are now per-group. Keep only the Navigation section and Home Assistant Labels section.

**Step 3: Update right panel header**

Change from "Theme" to "Settings" since it now only contains navigation settings:

```html
<div class="panel-header">
    <span>Settings</span>
</div>
```

**Step 4: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/layout-editor.html
git commit -m "feat: remove global domain colors and presets from right panel"
```

---

## Task 8: Remove Domain Colors from JS

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Remove DOMAIN_COLORS constant**

Delete the entire `DOMAIN_COLORS` object (around line 9-35).

**Step 2: Remove domainColors state property**

Remove `domainColors: { ...DOMAIN_COLORS },` from the component state.

**Step 3: Remove formatDomainName function**

If it exists and is only used for domain colors display.

**Step 4: Update any code that references domainColors**

Search for `domainColors` and update to use the new category-based system.

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: remove global domain colors from JS"
```

---

## Task 9: Update Preview Button Rendering

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Update getPreviewButtons to use category colors**

Find where preview buttons are built and update to use `getEntityCategoryColor`:

```javascript
// For entity buttons, use category-based color
const entity = this.getEntityById(item.entityId);
const categoryColor = this.getEntityCategoryColor(entity, style);

buttons.push({
    type: 'entity',
    label: entity.friendly_name || item.entityId,
    icon: this.getEntityIconName(entity),
    entityId: item.entityId,
    backgroundColor: style.backgroundColor,
    iconColor: categoryColor,
    textColor: categoryColor  // Text matches icon
});
```

**Step 2: Update buildPagesFromStyleEditor and related functions**

Ensure all entity buttons use the category color for both icon and text.

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: update preview to use category-based colors"
```

---

## Task 10: Update Profile Generator

**Files:**
- Modify: `src/layout/profile-generator.ts`

**Step 1: Update EntityData interface**

Add category color support:

```typescript
interface EntityData {
    // ... existing fields
    style?: {
        backgroundColor?: string;
        iconColor?: string;
        // textColor removed - derived from iconColor
    };
}
```

**Step 2: Update createEntityButtonAction**

Text color should match icon color:

```typescript
function createEntityButtonAction(
    entity: EntityData,
    theme: ThemeConfig
): ProfileAction {
    const iconColor = entity.style?.iconColor || '#FFFFFF';
    const backgroundColor = entity.style?.backgroundColor || theme.backgroundColor;
    const friendlyName = entity.friendly_name || entity.label || entity.entity_id || 'Entity';

    return {
        Name: friendlyName,
        Settings: {
            entityId: entity.entity_id,
            domain: entity.domain || 'unknown',
            friendlyName: friendlyName,
            iconSource: "domain",
            iconColor: iconColor,
            backgroundColor: backgroundColor,
            textColor: iconColor,  // Text matches icon
            showTitle: true,
            showState: true
        },
        // ... rest
    };
}
```

**Step 3: Remove domainColors from ProfileConfig interface**

Update the interface to remove `domainColors: Record<string, string>`.

**Step 4: Update generateProfile to not use domainColors**

Remove any references to domainColors in the function.

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/layout/profile-generator.ts
git commit -m "feat: update profile generator with category colors, text=icon color"
```

---

## Task 11: Update Config Passed to Profile Generator

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Update generateProfile call**

Find where the profile config is built (around line 2270) and remove domainColors:

```javascript
const config = {
    name: this.profileName,
    device: {
        model: 'standard',
        cols: this.deviceSize.cols,
        rows: this.deviceSize.rows
    },
    pages: this.previewPages,
    theme: this.theme
    // domainColors removed
};
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: remove domainColors from profile config"
```

---

## Task 12: Clean Up CSS

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/css/layout-editor.css`

**Step 1: Remove unused CSS classes**

Remove styles for:
- `.sort-options`
- `.sort-btn`
- `.sort-status`
- `.ungrouped-list`
- `.ungrouped-item`
- `.drag-handle`
- `.ungrouped-position`
- `.ungrouped-item-name`
- `.ungrouped-item-page`
- `.theme-domain-colors`
- `.theme-row` (if only used for domain colors)

**Step 2: Add style-preset-select if needed**

```css
.style-preset-select {
    background: #333;
    border: 1px solid #444;
    border-radius: 4px;
    color: #fff;
    padding: 4px 8px;
    font-size: 11px;
    width: 100%;
}
```

**Step 3: Verify styling looks correct**

Open Style Editor and verify UI looks correct.

**Step 4: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/css/layout-editor.css
git commit -m "chore: clean up unused CSS, add preset select styles"
```

---

## Task 13: Integration Testing

**Step 1: Test group styling**

1. Create groups with different display types
2. Apply different presets to each group
3. Customize individual category colors
4. Verify preview shows correct colors per entity type

**Step 2: Test ungrouped entities**

1. Add ungrouped entities
2. Verify they display as simple list (no drag-drop)
3. Apply preset and custom colors
4. Verify preview shows correct colors

**Step 3: Test profile generation**

1. Generate a profile
2. Import into Stream Deck
3. Verify colors are correct
4. Verify text color matches icon color

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete theming simplification"
```

---

## Summary

**Files Modified:**
- `com.deckassistant.sdPlugin/ui/js/layout-editor.js` — Core logic changes
- `com.deckassistant.sdPlugin/ui/layout-editor.html` — UI updates
- `com.deckassistant.sdPlugin/ui/css/layout-editor.css` — Style cleanup
- `src/layout/profile-generator.ts` — Profile generation updates

**Features Changed:**
1. Group styles now use: Background + On/Off + Information + Trigger colors
2. Presets apply per-group instead of globally
3. Ungrouped entities simplified to match named groups
4. No more drag-drop reordering for ungrouped
5. No more global domain colors panel
6. Text color automatically matches icon color in generated profiles
