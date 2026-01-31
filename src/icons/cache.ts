import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '../../icon-cache');

export async function getCachedIcon(iconName: string): Promise<string | null> {
  const cachePath = path.join(CACHE_DIR, `${iconName}.svg`);
  try {
    if (fs.existsSync(cachePath)) {
      return fs.readFileSync(cachePath, 'utf-8');
    }
  } catch (error) {
    console.error('Error reading cached icon:', error);
  }
  return null;
}

export async function cacheIcon(iconName: string, svgContent: string): Promise<void> {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const cachePath = path.join(CACHE_DIR, `${iconName}.svg`);
    fs.writeFileSync(cachePath, svgContent, 'utf-8');
  } catch (error) {
    console.error('Error caching icon:', error);
  }
}
