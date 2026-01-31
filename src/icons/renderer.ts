import sharp from 'sharp';
import { getBundledIconPath } from './mdi-bundled.js';
import { getCachedIcon, cacheIcon } from './cache.js';

const MDI_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg';

export interface RenderOptions {
  size: number;
  iconColor: string;
  backgroundColor: string;
  title?: string;
  titlePosition?: 'top' | 'bottom';
  state?: string;
  statePosition?: 'top' | 'bottom';
}

/**
 * Fetches an SVG icon from the MDI CDN.
 * @param iconName The name of the icon (without mdi: prefix)
 * @returns The SVG content as a string, or null if not found
 */
async function fetchIconFromCDN(iconName: string): Promise<string | null> {
  // Remove mdi: prefix if present
  const cleanName = iconName.replace(/^mdi:/, '');

  // Check cache first
  const cached = await getCachedIcon(cleanName);
  if (cached) {
    return cached;
  }

  try {
    const url = `${MDI_CDN_BASE}/${cleanName}.svg`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch icon ${cleanName}: ${response.status}`);
      return null;
    }

    const svgContent = await response.text();

    // Cache the fetched icon
    await cacheIcon(cleanName, svgContent);

    return svgContent;
  } catch (error) {
    console.error(`Error fetching icon ${cleanName}:`, error);
    return null;
  }
}

/**
 * Extracts the path data from an SVG string.
 * @param svgContent The full SVG content
 * @returns The path data (d attribute), or null if not found
 */
function extractPathFromSVG(svgContent: string): string | null {
  // Match the d attribute from the path element
  const pathMatch = svgContent.match(/<path[^>]*d="([^"]+)"[^>]*>/);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }
  return null;
}

/**
 * Gets the SVG path data for an icon, from bundled icons or CDN.
 * @param iconName The name of the icon
 * @returns The SVG path data, or null if not found
 */
async function getIconPath(iconName: string): Promise<string | null> {
  // Remove mdi: prefix if present
  const cleanName = iconName.replace(/^mdi:/, '');

  // Try bundled icons first
  const bundledPath = getBundledIconPath(cleanName);
  if (bundledPath) {
    return bundledPath;
  }

  // Fall back to CDN
  const svgContent = await fetchIconFromCDN(cleanName);
  if (svgContent) {
    return extractPathFromSVG(svgContent);
  }

  return null;
}

/**
 * Renders an icon to a base64-encoded PNG image.
 * @param iconName The name of the icon to render
 * @param options Rendering options
 * @returns A data URI string (data:image/png;base64,...)
 */
export async function renderIcon(iconName: string, options: RenderOptions): Promise<string> {
  const { size, iconColor, backgroundColor, title, titlePosition, state, statePosition } = options;

  // Get the icon path
  const iconPath = await getIconPath(iconName);

  // Calculate layout
  const padding = Math.floor(size * 0.1);
  const hasTitle = title && title.trim().length > 0;
  const hasState = state && state.trim().length > 0;

  // Calculate icon size based on whether we have text
  let iconSize = size - (padding * 2);
  let iconY = padding;

  const textHeight = Math.floor(size * 0.15);
  const fontSize = Math.floor(size * 0.12);

  if (hasTitle || hasState) {
    iconSize = Math.floor(size * 0.55);

    // Position icon based on text positions
    const topText = (hasTitle && titlePosition === 'top') || (hasState && statePosition === 'top');
    const bottomText = (hasTitle && titlePosition === 'bottom') || (hasState && statePosition === 'bottom');

    if (topText && bottomText) {
      // Text on both sides, center icon
      iconY = Math.floor((size - iconSize) / 2);
    } else if (topText) {
      // Text on top only
      iconY = textHeight + padding;
    } else if (bottomText) {
      // Text on bottom only
      iconY = padding;
    }
  }

  const iconX = Math.floor((size - iconSize) / 2);

  // Build the SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

  // Background
  svg += `<rect width="${size}" height="${size}" fill="${backgroundColor}"/>`;

  // Icon
  if (iconPath) {
    // The MDI icons use a 24x24 viewBox, so we need to scale
    const scale = iconSize / 24;
    svg += `<g transform="translate(${iconX}, ${iconY}) scale(${scale})">`;
    svg += `<path d="${iconPath}" fill="${iconColor}"/>`;
    svg += `</g>`;
  } else {
    // Fallback: render a question mark if icon not found
    const fallbackPath = "M15.07,11.25L14.17,12.17C13.45,12.89 13,13.5 13,15H11V14.5C11,13.39 11.45,12.39 12.17,11.67L13.41,10.41C13.78,10.05 14,9.55 14,9C14,7.89 13.1,7 12,7A2,2 0 0,0 10,9H8A4,4 0 0,1 12,5A4,4 0 0,1 16,9C16,9.88 15.64,10.67 15.07,11.25M13,19H11V17H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z";
    const scale = iconSize / 24;
    svg += `<g transform="translate(${iconX}, ${iconY}) scale(${scale})">`;
    svg += `<path d="${fallbackPath}" fill="${iconColor}"/>`;
    svg += `</g>`;
  }

  // Text styling
  const textColor = '#FFFFFF';
  const textAnchor = 'middle';
  const textX = size / 2;

  // Render title
  if (hasTitle && title) {
    const titleY = titlePosition === 'top'
      ? fontSize + 2
      : size - 4;

    svg += `<text x="${textX}" y="${titleY}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="${textColor}" text-anchor="${textAnchor}">`;
    svg += escapeXml(truncateText(title, 10));
    svg += `</text>`;
  }

  // Render state
  if (hasState && state) {
    // Determine state Y position
    let stateY: number;
    if (statePosition === 'top') {
      // If title is also at top, put state below title
      if (hasTitle && titlePosition === 'top') {
        stateY = fontSize * 2 + 4;
      } else {
        stateY = fontSize + 2;
      }
    } else {
      // Bottom position
      if (hasTitle && titlePosition === 'bottom') {
        stateY = size - fontSize - 6;
      } else {
        stateY = size - 4;
      }
    }

    svg += `<text x="${textX}" y="${stateY}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="${textColor}" text-anchor="${textAnchor}">`;
    svg += escapeXml(truncateText(state, 10));
    svg += `</text>`;
  }

  svg += '</svg>';

  // Convert SVG to PNG using sharp
  try {
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    const base64 = pngBuffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error rendering icon to PNG:', error);
    // Return a simple fallback
    return createFallbackImage(size, backgroundColor);
  }
}

/**
 * Escapes special XML characters in a string.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Truncates text to a maximum length.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 1) + '...';
}

/**
 * Creates a simple fallback image when rendering fails.
 */
async function createFallbackImage(size: number, backgroundColor: string): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
    <text x="${size/2}" y="${size/2}" font-family="Arial" font-size="${size * 0.3}" fill="#888888" text-anchor="middle" dominant-baseline="middle">?</text>
  </svg>`;

  try {
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    const base64 = pngBuffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch {
    // If even this fails, return an empty data URI
    return 'data:image/png;base64,';
  }
}

/**
 * Returns the default icon name for a Home Assistant domain.
 * @param domain The entity domain (e.g., 'light', 'switch')
 * @returns The icon name to use
 */
export function getDefaultIconForDomain(domain: string): string {
  const domainIcons: Record<string, string> = {
    'light': 'lightbulb',
    'switch': 'toggle-switch',
    'fan': 'fan',
    'climate': 'thermostat',
    'cover': 'blinds',
    'lock': 'lock',
    'door': 'door',
    'window': 'window-closed',
    'garage_door': 'garage',
    'media_player': 'speaker',
    'scene': 'palette',
    'script': 'script-text',
    'automation': 'robot',
    'input_boolean': 'toggle-switch',
    'input_button': 'power',
    'button': 'power',
    'binary_sensor': 'eye',
    'sensor': 'thermometer',
    'camera': 'camera',
    'vacuum': 'vacuum',
    'person': 'home',
    'device_tracker': 'home',
    'weather': 'weather-sunny',
    'humidifier': 'water-percent',
    'water_heater': 'fire',
    'alarm_control_panel': 'alert-circle',
    'remote': 'television',
    'select': 'cog',
    'input_select': 'cog',
    'number': 'cog',
    'input_number': 'cog',
    'text': 'script-text',
    'input_text': 'script-text',
  };

  return domainIcons[domain] || 'home';
}

/**
 * Determines if an entity state represents an "on" or active state.
 * @param state The entity state string
 * @param domain Optional entity domain for domain-specific logic
 * @returns True if the state is considered "on"
 */
export function isStateOn(state: string, domain?: string): boolean {
  const onStates = ['on', 'open', 'unlocked', 'playing', 'home', 'heat', 'cool', 'heat_cool', 'auto', 'cleaning'];

  // Check common on states
  if (onStates.includes(state.toLowerCase())) {
    return true;
  }

  // Domain-specific checks
  if (domain === 'cover') {
    return state.toLowerCase() === 'open';
  }

  if (domain === 'lock') {
    return state.toLowerCase() === 'unlocked';
  }

  if (domain === 'media_player') {
    return ['playing', 'paused', 'on'].includes(state.toLowerCase());
  }

  if (domain === 'climate') {
    return !['off', 'unavailable', 'unknown'].includes(state.toLowerCase());
  }

  if (domain === 'vacuum') {
    return ['cleaning', 'returning'].includes(state.toLowerCase());
  }

  if (domain === 'device_tracker' || domain === 'person') {
    return state.toLowerCase() === 'home';
  }

  // Numeric states (like sensors showing non-zero values)
  const numericValue = parseFloat(state);
  if (!isNaN(numericValue) && numericValue > 0) {
    return true;
  }

  return false;
}
