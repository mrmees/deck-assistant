# Style Editor MDI Icons Design

## Overview

Replace emoji placeholders in the Style Editor preview with actual MDI (Material Design Icons) that match what will be displayed on the Stream Deck. Icons come from Home Assistant entity attributes, with fallback to domain-based defaults.

## Data Flow

### Backend Change (settings.ts)

Add the `icon` attribute when sending entity data to the Style Editor:

```typescript
return {
  entity_id: entity.entity_id,
  domain: entity.entity_id.split('.')[0],
  friendly_name: entity.attributes?.friendly_name || entity.entity_id,
  area_id: area_id,
  state: entity.state,
  device_class: entity.attributes?.device_class || null,
  icon: entity.attributes?.icon || null,  // NEW
};
```

### Icon Resolution Order

1. Use `entity.attributes.icon` if set (e.g., `"mdi:ceiling-light"`)
2. Fall back to domain-based default (e.g., `light` → `"mdi:lightbulb"`)

## Frontend Icon System

### Bundled Icons

Copy path data from `src/icons/mdi-bundled.ts` into the Style Editor (~100 common icons). These load instantly without network requests.

### CDN Fallback

For icons not in the bundled set, fetch from jsdelivr CDN:
```
https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/{icon-name}.svg
```

### In-Memory Cache

Cache fetched icon paths in a JavaScript object during the session. Icons persist while the Style Editor is open.

### Fetch Function

```javascript
async function fetchIconSvg(iconName) {
  const cleanName = iconName.replace(/^mdi:/, '');

  // 1. Check bundled
  if (BUNDLED_ICONS[cleanName]) return BUNDLED_ICONS[cleanName];

  // 2. Check cache
  if (iconCache[cleanName]) return iconCache[cleanName];

  // 3. Fetch from CDN
  const url = `https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/${cleanName}.svg`;
  const response = await fetch(url);
  const svgText = await response.text();
  const pathMatch = svgText.match(/<path[^>]*d="([^"]+)"/);
  const pathData = pathMatch ? pathMatch[1] : null;

  if (pathData) iconCache[cleanName] = pathData;
  return pathData;
}
```

## Preview Rendering

### Alpine Component State

```javascript
iconPaths: {},  // { "mdi:lightbulb": "M12,2A7,7...", ... }

async loadIcon(iconName) { ... }
getIconPath(iconName) { ... }
```

### Button Data

```javascript
// Change from:
icon: DOMAIN_ICONS[entity.domain] || '📦'

// To:
icon: entity.icon || `mdi:${getDefaultIcon(entity.domain)}`
```

### HTML Template

```html
<svg class="button-icon" viewBox="0 0 24 24"
     x-show="getIconPath(button.icon) && getIconPath(button.icon) !== 'loading'">
  <path :d="getIconPath(button.icon)" :fill="button.iconColor"/>
</svg>
<span class="button-icon-loading"
      x-show="!getIconPath(button.icon) || getIconPath(button.icon) === 'loading'">
  ...
</span>
```

## CSS Styling

```css
.button-icon {
  width: 50%;
  height: 50%;
  display: block;
  margin: 0 auto;
}

.button-icon-loading {
  font-size: 12px;
  color: #666;
  text-align: center;
}
```

## Special Cases

- **Group buttons**: Use generic `mdi:folder` icon
- **Back button**: Use `mdi:arrow-left`
- **Empty slots**: No icon needed

## Files to Modify

1. `src/actions/settings.ts` - Add icon to entity data
2. `com.deckassistant.sdPlugin/ui/js/layout-editor.js` - Icon loading system
3. `com.deckassistant.sdPlugin/ui/layout-editor.html` - SVG rendering
4. `com.deckassistant.sdPlugin/ui/css/layout-editor.css` - Icon styling
