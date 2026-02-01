/**
 * Profile Generator
 * Creates .streamDeckProfile files (ZIP archives) for import
 *
 * Based on: https://github.com/data-enabler/streamdeck-profile-generator
 */

import { v4 as uuidv4 } from "uuid";
import JSZip from "jszip";

interface GroupStyle {
    background: string;
    onOff: string;
    information: string;
    trigger: string;
}

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

const DEFAULT_GROUP_STYLE: GroupStyle = {
    background: '#1a1a2e',
    onOff: '#4CAF50',
    information: '#2196F3',
    trigger: '#FF9800'
};

interface EntityData {
    entity_id?: string;
    domain?: string;
    friendly_name?: string;
    area_id?: string;
    type?: 'entity' | 'folder' | 'nav-next' | 'nav-prev' | 'folder-up' | 'empty';
    icon?: string;
    label?: string;
    groupName?: string;
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
    groupStyles?: Record<string, GroupStyle>;
    ungroupedStyle?: GroupStyle;
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
 * Get the category color for an entity based on its domain
 */
function getEntityCategoryColor(domain: string, style: GroupStyle): string {
    if (ENTITY_CATEGORIES.controllable.includes(domain)) {
        return style.onOff;
    }
    if (ENTITY_CATEGORIES.informational.includes(domain)) {
        return style.information;
    }
    if (ENTITY_CATEGORIES.trigger.includes(domain)) {
        return style.trigger;
    }
    return style.onOff; // Default to controllable color
}

/**
 * Get the group style for an entity based on its groupName
 */
function getGroupStyle(
    groupName: string | undefined,
    groupStyles: Record<string, GroupStyle> | undefined,
    ungroupedStyle: GroupStyle | undefined
): GroupStyle {
    if (!groupName || groupName === '__ungrouped__') {
        return ungroupedStyle || DEFAULT_GROUP_STYLE;
    }
    return groupStyles?.[groupName] || DEFAULT_GROUP_STYLE;
}

/**
 * Generate a Stream Deck profile ZIP archive from configuration
 */
export async function generateProfile(config: ProfileConfig): Promise<{ data: string; filename: string }> {
    const safeFilename = config.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');

    // Create ZIP archive
    const zip = new JSZip();

    // Generate UUIDs for each page
    const pageUuids: Record<string, string> = {};
    for (const page of config.pages) {
        pageUuids[page.id] = uuidv4();
    }

    // Use the main page UUID as the profile UUID
    const mainPage = config.pages.find(p => p.type === 'main') || config.pages[0];
    const mainProfileUuid = mainPage ? pageUuids[mainPage.id] : uuidv4();

    // Create the .sdProfile folder
    const profileFolderName = `${mainProfileUuid}.sdProfile`;
    const profileFolder = zip.folder(profileFolderName);

    if (!profileFolder) {
        throw new Error("Failed to create profile folder in ZIP");
    }

    const profilesFolder = profileFolder.folder("Profiles");

    // Build each page
    for (let pageIndex = 0; pageIndex < config.pages.length; pageIndex++) {
        const page = config.pages[pageIndex];
        const pageUuid = pageUuids[page.id];
        const encodedFolderId = profileFolderId(pageUuid);
        const pageFolder = profilesFolder?.folder(encodedFolderId);

        if (!pageFolder) continue;

        const actions: Record<string, ProfileAction> = {};

        // Process each cell in the layout
        for (let row = 0; row < config.device.rows; row++) {
            for (let col = 0; col < config.device.cols; col++) {
                const cell = page.layout[row]?.[col];
                if (!cell) continue;

                const position = `${col},${row}`;

                if (cell.type === 'entity' && cell.entity_id) {
                    actions[position] = createEntityButtonAction(cell, config);
                } else if (cell.type === 'folder') {
                    // Find target folder page
                    const targetPage = config.pages.find(p =>
                        p.type === 'folder-sub' && p.groupName === cell.groupName
                    );
                    if (targetPage) {
                        actions[position] = createNavigationAction(
                            cell.label || cell.groupName || 'Folder',
                            pageUuids[targetPage.id]
                        );
                    }
                } else if (cell.type === 'nav-next') {
                    // Find next page in sequence
                    let nextPage: PageData | undefined;
                    if (page.type === 'folder-sub') {
                        // Navigate within folder
                        const folderPages = config.pages.filter(p =>
                            p.type === 'folder-sub' && p.groupName === page.groupName
                        );
                        const currentIndex = folderPages.indexOf(page);
                        nextPage = folderPages[currentIndex + 1];
                    } else {
                        // Linear navigation (skip folder-sub pages)
                        for (let i = pageIndex + 1; i < config.pages.length; i++) {
                            if (config.pages[i].type !== 'folder-sub') {
                                nextPage = config.pages[i];
                                break;
                            }
                        }
                    }
                    if (nextPage) {
                        actions[position] = createNavigationAction('→', pageUuids[nextPage.id]);
                    }
                } else if (cell.type === 'nav-prev') {
                    // Find previous page in sequence
                    let prevPage: PageData | undefined;
                    if (page.type === 'folder-sub') {
                        // Navigate within folder
                        const folderPages = config.pages.filter(p =>
                            p.type === 'folder-sub' && p.groupName === page.groupName
                        );
                        const currentIndex = folderPages.indexOf(page);
                        prevPage = currentIndex > 0 ? folderPages[currentIndex - 1] : undefined;
                    } else {
                        // Linear navigation (skip folder-sub pages)
                        for (let i = pageIndex - 1; i >= 0; i--) {
                            if (config.pages[i].type !== 'folder-sub') {
                                prevPage = config.pages[i];
                                break;
                            }
                        }
                    }
                    if (prevPage) {
                        actions[position] = createNavigationAction('←', pageUuids[prevPage.id]);
                    }
                } else if (cell.type === 'folder-up') {
                    // Go back to main page
                    if (mainPage) {
                        actions[position] = createNavigationAction('↑', pageUuids[mainPage.id]);
                    }
                }
            }
        }

        // Add "Back to Default" on main page only
        if (page.type === 'main') {
            const backButtonPos = getBackButtonPosition(
                config.theme.backButtonPosition,
                config.device.cols,
                config.device.rows
            );
            // Only add if position isn't already occupied
            if (!actions[backButtonPos]) {
                actions[backButtonPos] = createBackToDefaultAction();
            }
        }

        const pageManifest = {
            Controllers: [{ Actions: actions, Type: "Keypad" }]
        };
        pageFolder.file("manifest.json", JSON.stringify(pageManifest, null, 2));
    }

    // Top-level manifest with all pages
    const topLevelManifest = {
        Name: config.name,
        Pages: {
            Current: mainProfileUuid,
            Pages: Object.values(pageUuids)
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
 * Create a navigation action to switch pages
 */
function createNavigationAction(label: string, targetProfileUuid: string): ProfileAction {
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

/**
 * Create an Entity Button action
 */
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
