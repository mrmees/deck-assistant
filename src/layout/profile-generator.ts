/**
 * Profile Generator
 * Creates .streamDeckProfile files (ZIP archives) for import
 *
 * Based on: https://github.com/data-enabler/streamdeck-profile-generator
 */

import { v4 as uuidv4 } from "uuid";
import JSZip from "jszip";

interface EntityData {
    entity_id: string;
    domain: string;
    friendly_name?: string;
    area_id?: string;
    isFolder?: boolean;
    name?: string;
    targetPageId?: string;
}

interface PageData {
    id: string;
    name: string;
    layout: (EntityData | null)[][];
}

interface ThemeConfig {
    backgroundColor: string;
    backButtonPosition: string;
}

interface ProfileConfig {
    name: string;
    device: {
        model: string;
        cols: number;
        rows: number;
    };
    pages: PageData[];
    theme: ThemeConfig;
    domainColors: Record<string, string>;
}

interface ProfileAction {
    Name: string;
    Settings: Record<string, unknown>;
    State: number;
    States: Array<{
        Title: string;
        TitleAlignment?: string;
        TitleShow?: boolean;
        ShowTitle?: boolean;
    }>;
    UUID: string;
}

/**
 * Convert a UUID to the Stream Deck profile folder ID format
 * Based on: https://github.com/data-enabler/streamdeck-profile-generator/blob/master/lib/ids.js
 */
function profileFolderId(profileId: string): string {
    return ((profileId.replace(/-/g, '') + '000')
        .match(/.{5}/g) || [])
        .map(s => parseInt(s, 16).toString(32).padStart(4, '0'))
        .join('')
        .substring(0, 26)
        .toUpperCase()
        .replace(/V/g, 'W')
        .replace(/U/g, 'V')
        + 'Z';
}

/**
 * Generate a Stream Deck profile ZIP archive from configuration
 */
export async function generateProfile(config: ProfileConfig): Promise<{ data: string; filename: string }> {
    const mainProfileUuid = uuidv4();
    const safeFilename = config.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');

    // Create ZIP archive
    const zip = new JSZip();

    // Create the .sdProfile folder inside the ZIP (named after UUID)
    const profileFolderName = `${mainProfileUuid}.sdProfile`;
    const profileFolder = zip.folder(profileFolderName);

    if (!profileFolder) {
        throw new Error("Failed to create profile folder in ZIP");
    }

    // Build actions for the main page
    const actions: Record<string, ProfileAction> = {};

    // Only use the first page for now (multi-page support can be added later)
    const mainPage = config.pages[0];
    if (mainPage) {
        for (let row = 0; row < config.device.rows; row++) {
            for (let col = 0; col < config.device.cols; col++) {
                const entity = mainPage.layout[row]?.[col];
                if (entity) {
                    const position = `${col},${row}`;
                    actions[position] = createEntityButtonAction(entity, config.domainColors, config.theme);
                }
            }
        }
    }

    // Add "Back to Default" button at the configured position
    const backButtonPos = getBackButtonPosition(
        config.theme.backButtonPosition,
        config.device.cols,
        config.device.rows
    );
    actions[backButtonPos] = createBackToDefaultAction();

    // Create the profile manifest (goes in Profiles/<encoded-uuid>/manifest.json)
    const profilesFolder = profileFolder.folder("Profiles");
    const encodedFolderId = profileFolderId(mainProfileUuid);
    const profileUuidFolder = profilesFolder?.folder(encodedFolderId);

    if (!profileUuidFolder) {
        throw new Error("Failed to create profile UUID folder in ZIP");
    }

    // Profile manifest - note Controllers is an ARRAY
    const profileManifest = {
        Controllers: [
            {
                Actions: actions,
                Type: "Keypad"
            }
        ]
    };

    profileUuidFolder.file("manifest.json", JSON.stringify(profileManifest, null, 2));

    // Top-level manifest
    const topLevelManifest = {
        Name: config.name,
        Pages: {
            Current: mainProfileUuid,
            Pages: [mainProfileUuid]
        },
        Version: "2.0"
    };

    profileFolder.file("manifest.json", JSON.stringify(topLevelManifest, null, 2));

    // Generate ZIP as base64
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const base64 = zipBuffer.toString("base64");

    return {
        data: base64,
        filename: `${safeFilename}.streamDeckProfile`
    };
}

/**
 * Create an Entity Button action
 */
function createEntityButtonAction(
    entity: EntityData,
    domainColors: Record<string, string>,
    theme: ThemeConfig
): ProfileAction {
    const iconColor = domainColors[entity.domain] || '#888888';
    const friendlyName = entity.friendly_name || entity.entity_id;

    return {
        Name: friendlyName,
        Settings: {
            entityId: entity.entity_id,
            domain: entity.domain,
            friendlyName: friendlyName,
            iconSource: "domain",
            iconColor: iconColor,
            backgroundColor: theme.backgroundColor,
            showTitle: true,
            showState: true
        },
        State: 0,
        States: [
            {
                Title: friendlyName.length > 12 ? friendlyName.substring(0, 11) + '…' : friendlyName,
                TitleAlignment: "bottom",
                ShowTitle: true
            }
        ],
        UUID: "com.deckassistant.entity-button"
    };
}

/**
 * Create a "Back to Default Profile" action
 */
function createBackToDefaultAction(): ProfileAction {
    return {
        Name: "Back",
        Settings: {
            DeviceUUID: 0  // 0 means default profile
        },
        State: 0,
        States: [
            {
                Title: "← Back",
                TitleAlignment: "middle",
                ShowTitle: true
            }
        ],
        UUID: "com.elgato.streamdeck.profile.backtoparent"
    };
}

/**
 * Get grid position for back button based on preference
 */
function getBackButtonPosition(position: string, cols: number, rows: number): string {
    switch (position) {
        case 'top-left':
            return '0,0';
        case 'top-right':
            return `${cols - 1},0`;
        case 'bottom-left':
            return `0,${rows - 1}`;
        case 'bottom-right':
        default:
            return `${cols - 1},${rows - 1}`;
    }
}
