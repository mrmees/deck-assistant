# On/Off Color Split + Match Home Assistant Theme

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the single `onOff` color into separate `onColor` and `offColor`, and add a "Match Home Assistant" preset that fetches colors from the user's HA theme.

**Architecture:** Update GroupStyle interface to have distinct on/off colors, update UI to show two color pickers, add HA theme fetching capability to layout editor.

**Tech Stack:** TypeScript, Alpine.js, Home Assistant WebSocket API

---

### Task 1: Update GroupStyle in profile-generator.ts

**Files:**
- Modify: `src/layout/profile-generator.ts`

**Changes:**
1. Update `GroupStyle` interface: replace `onOff: string` with `onColor: string` and `offColor: string`
2. Update `DEFAULT_GROUP_STYLE`: add both colors (onColor: '#4CAF50', offColor: '#9E9E9E')
3. Rename `getEntityCategoryColor` to `getEntityCategoryColors` - return `{ on: string, off: string }`
4. Update `createEntityButtonAction` to pass `iconColorOn` and `iconColorOff` to settings

---

### Task 2: Update layout-editor.js data model and presets

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Changes:**
1. Update `DEFAULT_CATEGORY_COLORS`: replace `onOff` with `onColor` and `offColor`
2. Update `ungroupedStyle` default: replace `onOff` with `onColor` and `offColor`
3. Update all `themePresets` (modern, classic, minimal, vibrant): replace `onOff` with `onColor` and `offColor`
4. Update `getGroupStyle()` default return
5. Update `applyPreset()` to use new property names
6. Update `finishWizard()` and `quickFinishWizard()` to use new property names
7. Update `getEntityCategoryColor()` to use `style.onColor` (preview shows "on" state)

---

### Task 3: Update layout-editor.html color pickers

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`

**Changes:**
1. In group style controls (~line 85-88): Replace single "On/Off" picker with two pickers ("On" and "Off")
2. In ungrouped style controls (~line 165-168): Same change

Before:
```html
<div class="style-control-row">
    <label>On/Off</label>
    <input type="color" :value="getGroupStyle(group.name).onOff" ...>
</div>
```

After:
```html
<div class="style-control-row">
    <label>On</label>
    <input type="color" :value="getGroupStyle(group.name).onColor" ...>
</div>
<div class="style-control-row">
    <label>Off</label>
    <input type="color" :value="getGroupStyle(group.name).offColor" ...>
</div>
```

---

### Task 4: Add getThemes to HA connection

**Files:**
- Modify: `src/homeassistant/connection.ts`

**Changes:**
Add method to fetch themes from Home Assistant:
```typescript
async getThemes(): Promise<any> {
    if (!this.connection) throw new Error("Not connected");
    return this.connection.sendMessagePromise({ type: "frontend/get_themes" });
}
```

---

### Task 5: Add getThemes handler in settings.ts

**Files:**
- Modify: `src/actions/settings.ts`

**Changes:**
Handle `getThemes` event from layout editor:
```typescript
if (event === "getThemes") {
    const themes = await haConnection.getThemes();
    await this.sendToLayoutEditor({ event: "themes", themes });
}
```

---

### Task 6: Add "Match Home Assistant" preset in layout-editor.js

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Changes:**
1. Add `haTheme` preset placeholder in `themePresets`:
```javascript
ha: {
    name: 'Match Home Assistant',
    dynamic: true
}
```

2. Add `applyHATheme(groupName)` method that:
   - Sends `getThemes` event to plugin
   - Waits for `themes` response
   - Extracts colors from the default/active theme
   - Maps HA colors to our style properties:
     - `background` ← `token-color-background-base` or `primary-background-color`
     - `onColor` ← `token-color-feedback-success` or `success-color`
     - `offColor` ← `token-color-feedback-error` or `error-color`
     - `information` ← `token-color-feedback-info` or `info-color`
     - `trigger` ← `token-color-feedback-warning` or `warning-color`

3. Update `applyPreset()` to check if preset is dynamic and call `applyHATheme()` if so

---

### Task 7: Add message handler for themes response

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Changes:**
In the message handler (handlePluginMessage or similar), add case for `themes` event to store/process the theme data.

---

### Task 8: Build and test

**Commands:**
```bash
npm run build
```

**Verify:**
1. Layout editor shows separate On/Off color pickers
2. Theme presets apply correct on/off colors
3. "Match Home Assistant" preset fetches and applies HA theme colors
4. Generated profiles have correct `iconColorOn` and `iconColorOff` settings
