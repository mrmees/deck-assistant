/**
 * Generate PNG icons for the Stream Deck plugin
 * Uses sharp to create icons with the Home Assistant home+wifi symbol
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Home Assistant brand color and dark background
const HA_COLOR = '#41BDF5';
const BG_COLOR = '#1a1a1a';

// Home Assistant home+wifi icon path (from MDI)
const HA_ICON_PATH = 'M12,3L2,12H5V20H19V12H22L12,3M12,8.5C14.34,8.5 16.46,9.43 18,10.94L16.8,12.12C15.58,10.91 13.88,10.17 12,10.17C10.12,10.17 8.42,10.91 7.2,12.12L6,10.94C7.54,9.43 9.66,8.5 12,8.5M12,11.83C13.4,11.83 14.67,12.39 15.6,13.3L14.4,14.47C13.79,13.87 12.94,13.5 12,13.5C11.06,13.5 10.21,13.87 9.6,14.47L8.4,13.3C9.33,12.39 10.6,11.83 12,11.83M12,15.17C12.94,15.17 13.7,15.91 13.7,16.83C13.7,17.75 12.94,18.5 12,18.5C11.06,18.5 10.3,17.75 10.3,16.83C10.3,15.91 11.06,15.17 12,15.17Z';

// The icon path has a viewBox of 24x24 (MDI standard)
const VIEWBOX_SIZE = 24;

interface IconConfig {
  outputPath: string;
  size: number;
  padding?: number; // Percentage of size to use as padding (0-1)
}

const ICONS: IconConfig[] = [
  // Plugin icons
  { outputPath: 'com.homeassistant.streamdeck.sdPlugin/imgs/plugin/icon.png', size: 72, padding: 0.1 },
  { outputPath: 'com.homeassistant.streamdeck.sdPlugin/imgs/plugin/icon@2x.png', size: 144, padding: 0.1 },
  { outputPath: 'com.homeassistant.streamdeck.sdPlugin/imgs/plugin/category-icon.png', size: 28, padding: 0.1 },
  { outputPath: 'com.homeassistant.streamdeck.sdPlugin/imgs/plugin/category-icon@2x.png', size: 56, padding: 0.1 },

  // Entity button action icons
  { outputPath: 'com.homeassistant.streamdeck.sdPlugin/imgs/actions/entity-button/icon.png', size: 20, padding: 0.1 },
  { outputPath: 'com.homeassistant.streamdeck.sdPlugin/imgs/actions/entity-button/icon@2x.png', size: 40, padding: 0.1 },
  { outputPath: 'com.homeassistant.streamdeck.sdPlugin/imgs/actions/entity-button/state.png', size: 72, padding: 0.15 },
  { outputPath: 'com.homeassistant.streamdeck.sdPlugin/imgs/actions/entity-button/state@2x.png', size: 144, padding: 0.15 },
];

function createSvg(size: number, padding: number = 0.1): string {
  const paddingPx = Math.floor(size * padding);
  const iconSize = size - (paddingPx * 2);
  const scale = iconSize / VIEWBOX_SIZE;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${BG_COLOR}"/>
  <g transform="translate(${paddingPx}, ${paddingPx}) scale(${scale})">
    <path d="${HA_ICON_PATH}" fill="${HA_COLOR}"/>
  </g>
</svg>`;
}

async function generateIcon(config: IconConfig, baseDir: string): Promise<void> {
  const { outputPath, size, padding } = config;
  const fullPath = path.join(baseDir, outputPath);

  // Ensure directory exists
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create SVG and convert to PNG
  const svg = createSvg(size, padding);

  await sharp(Buffer.from(svg))
    .png()
    .toFile(fullPath);

  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

async function main(): Promise<void> {
  const baseDir = path.resolve(__dirname, '..');

  console.log('Generating Home Assistant Stream Deck plugin icons...\n');
  console.log(`Base directory: ${baseDir}`);
  console.log(`Brand color: ${HA_COLOR}`);
  console.log(`Background: ${BG_COLOR}\n`);

  for (const icon of ICONS) {
    await generateIcon(icon, baseDir);
  }

  console.log('\nAll icons generated successfully!');
}

main().catch((error) => {
  console.error('Error generating icons:', error);
  process.exit(1);
});
