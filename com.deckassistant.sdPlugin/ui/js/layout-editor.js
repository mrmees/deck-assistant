/**
 * Style Editor - Alpine.js Component
 * Generates Stream Deck profile files with Home Assistant entity buttons
 *
 * Profile format based on: https://github.com/data-enabler/streamdeck-profile-generator
 */

// Domain color defaults
const DOMAIN_COLORS = {
    light: '#FFEB3B',
    switch: '#4CAF50',
    climate: '#2196F3',
    media_player: '#9C27B0',
    sensor: '#9E9E9E',
    cover: '#FF9800',
    fan: '#00BCD4',
    binary_sensor: '#607D8B',
    automation: '#FF5722',
    script: '#795548',
    scene: '#E91E63',
    input_boolean: '#8BC34A',
    input_number: '#3F51B5',
    input_select: '#009688',
    lock: '#F44336',
    vacuum: '#673AB7',
    camera: '#00BCD4',
};

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

// Bundled MDI icon paths (same as src/icons/mdi-bundled.ts)
const BUNDLED_ICONS = {
    // Lights
    "lightbulb": "M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z",
    "lightbulb-outline": "M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z",
    "ceiling-light": "M8,9H10V6H14V9H16L12,17L8,9M19,12L12,22L5,12L12,2L19,12Z",
    "floor-lamp": "M6,2L10,6V12L6,22H11V18H13V22H18L14,12V6L18,2H13V6H11V2H6Z",
    "lamp": "M8,2H16L20,14H4L8,2M11,15H13V22H11V15M10,22V20H14V22H10Z",
    // Power / Switches
    "power": "M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13V3Z",
    "toggle-switch": "M17,7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7M17,15A3,3 0 0,1 14,12A3,3 0 0,1 17,9A3,3 0 0,1 20,12A3,3 0 0,1 17,15Z",
    "toggle-switch-off": "M17,7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7M7,15A3,3 0 0,1 4,12A3,3 0 0,1 7,9A3,3 0 0,1 10,12A3,3 0 0,1 7,15Z",
    // Climate / Temperature
    "thermometer": "M15,13V5A3,3 0 0,0 12,2A3,3 0 0,0 9,5V13A5,5 0 0,0 7,17A5,5 0 0,0 12,22A5,5 0 0,0 17,17A5,5 0 0,0 15,13M12,4A1,1 0 0,1 13,5V8H11V5A1,1 0 0,1 12,4Z",
    "thermostat": "M16.95,16.95L14.83,14.83C15.55,14.1 16,13.1 16,12C16,11.26 15.79,10.57 15.43,10L17.6,7.81C18.5,9 19,10.43 19,12C19,13.93 18.22,15.68 16.95,16.95M12,5C13.57,5 15,5.5 16.19,6.4L14,8.56C13.43,8.21 12.74,8 12,8A4,4 0 0,0 8,12C8,13.1 8.45,14.1 9.17,14.83L7.05,16.95C5.78,15.68 5,13.93 5,12A7,7 0 0,1 12,5M11,2V4.07C7.38,4.53 4.53,7.38 4.07,11H2V13H4.07C4.53,16.62 7.38,19.47 11,19.93V22H13V19.93C16.62,19.47 19.47,16.62 19.93,13H22V11H19.93C19.47,7.38 16.62,4.53 13,4.07V2H11Z",
    "snowflake": "M20.79,13.95L18.46,14.57L16.46,13.44V10.56L18.46,9.43L20.79,10.05L21.31,8.12L19.54,7.65L20,5.88L18.07,5.36L17.45,7.69L15.45,8.82L13,7.38V5.12L14.71,3.41L13.29,2L12,3.29L10.71,2L9.29,3.41L11,5.12V7.38L8.5,8.82L6.5,7.69L5.92,5.36L4,5.88L4.47,7.65L2.7,8.12L3.22,10.05L5.55,9.43L7.55,10.56V13.45L5.55,14.58L3.22,13.96L2.7,15.89L4.47,16.36L4,18.12L5.93,18.64L6.55,16.31L8.55,15.18L11,16.62V18.88L9.29,20.59L10.71,22L12,20.71L13.29,22L14.7,20.59L13,18.88V16.62L15.5,15.17L17.5,16.3L18.12,18.63L20,18.12L19.53,16.35L21.3,15.88L20.79,13.95M9.5,10.56L12,9.11L14.5,10.56V13.44L12,14.89L9.5,13.44V10.56Z",
    "fire": "M17.66,11.2C17.43,10.9 17.15,10.64 16.89,10.38C16.22,9.78 15.46,9.35 14.82,8.72C13.33,7.26 13,4.85 13.95,3C13,3.23 12.17,3.75 11.46,4.32C8.87,6.4 7.85,10.07 9.07,13.22C9.11,13.32 9.15,13.42 9.15,13.55C9.15,13.77 9,13.97 8.8,14.05C8.57,14.15 8.33,14.09 8.14,13.93C8.08,13.88 8.04,13.83 8,13.76C6.87,12.33 6.69,10.28 7.45,8.64C5.78,10 4.87,12.3 5,14.47C5.06,14.97 5.12,15.47 5.29,15.97C5.43,16.57 5.7,17.17 6,17.7C7.08,19.43 8.95,20.67 10.96,20.92C13.1,21.19 15.39,20.8 17.03,19.32C18.86,17.66 19.5,15 18.56,12.72L18.43,12.46C18.22,12 17.66,11.2 17.66,11.2M14.5,17.5C14.22,17.74 13.76,18 13.4,18.1C12.28,18.5 11.16,17.94 10.5,17.28C11.69,17 12.4,16.12 12.61,15.23C12.78,14.43 12.46,13.77 12.33,13C12.21,12.26 12.23,11.63 12.5,10.94C12.69,11.32 12.89,11.7 13.13,12C13.9,13 15.11,13.44 15.37,14.8C15.41,14.94 15.43,15.08 15.43,15.23C15.46,16.05 15.1,16.95 14.5,17.5H14.5Z",
    "water-percent": "M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z",
    // Fan
    "fan": "M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z",
    // Locks
    "lock": "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z",
    "lock-open": "M12,17C10.89,17 10,16.1 10,15C10,13.89 10.89,13 12,13A2,2 0 0,1 14,15A2,2 0 0,1 12,17M18,20V10H6V20H18M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18Z",
    // Doors / Windows
    "door": "M8,3C6.89,3 6,3.89 6,5V21H18V5C18,3.89 17.11,3 16,3H8M8,5H16V19H8V5M13,11V13H15V11H13Z",
    "window-closed": "M6,3H18A2,2 0 0,1 20,5V19A2,2 0 0,1 18,21H6A2,2 0 0,1 4,19V5A2,2 0 0,1 6,3M6,5V11H11V5H6M13,5V11H18V5H13M6,13V19H11V13H6M13,13V19H18V13H13Z",
    // Garage / Covers
    "garage": "M19,20H17V11H7V20H5V9L12,5L19,9V20M8,12H16V14H8V12M8,15H16V17H8V15M16,18V20H8V18H16Z",
    "blinds": "M20,19V3H4V19H2V21H22V19H20M6,19V17H18V19H6M18,15H6V13H18V15M18,11H6V9H18V11M18,7H6V5H18V7Z",
    // Media
    "play": "M8,5.14V19.14L19,12.14L8,5.14Z",
    "pause": "M14,19H18V5H14M6,19H10V5H6V19Z",
    "stop": "M18,18H6V6H18V18Z",
    "skip-next": "M16,18H18V6H16M6,18L14.5,12L6,6V18Z",
    "skip-previous": "M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z",
    "volume-high": "M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z",
    "speaker": "M12,12A3,3 0 0,0 9,15A3,3 0 0,0 12,18A3,3 0 0,0 15,15A3,3 0 0,0 12,12M12,20A5,5 0 0,1 7,15A5,5 0 0,1 12,10A5,5 0 0,1 17,15A5,5 0 0,1 12,20M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8C10.89,8 10,7.1 10,6C10,4.89 10.89,4 12,4M17,2H7C5.89,2 5,2.89 5,4V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V4C19,2.89 18.1,2 17,2Z",
    // Sensors
    "eye": "M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z",
    "motion-sensor": "M10,0.2C9,0.2 8.2,1 8.2,2C8.2,3 9,3.8 10,3.8C11,3.8 11.8,3 11.8,2C11.8,1 11,0.2 10,0.2M14,5H6V7H7V13.07C5.7,13.4 4.84,14.59 5.03,15.91C5.22,17.23 6.36,18.19 7.69,18.08C8.5,18 9.24,17.55 9.66,16.83L11.93,12.83L14,13.83V21H16V12.7L13.09,11.3L14.04,9.5L17,10.6V5H14Z",
    "water": "M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z",
    // Home
    "home": "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",
    "home-outline": "M12,3L2,12H5V20H19V12H22L12,3M12,7.7L16,11.4V18H14V14H10V18H8V11.4L12,7.7Z",
    // Settings / Automation
    "cog": "M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",
    "script-text": "M17.8,20C17.4,21.2 16.3,22 15,22H5C3.3,22 2,20.7 2,19V18H5L14.2,18C14.6,19.2 15.7,20 17,20H17.8M19,2C20.7,2 22,3.3 22,5V6H20V5C20,4.4 19.6,4 19,4C18.4,4 18,4.4 18,5V18C18,19.1 17.1,20 16,20C14.9,20 14,19.1 14,18V5C14,3.3 12.7,2 11,2H19M11,4C11.6,4 12,4.4 12,5V18C12,18.6 11.6,19 11,19H5C4.4,19 4,18.6 4,18V5C4,4.4 4.4,4 5,4H11M8,15H6V17H8V15M8,7H6V9H8V7M8,11H6V13H8V11Z",
    "palette": "M17.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,9A1.5,1.5 0 0,1 19,10.5A1.5,1.5 0 0,1 17.5,12M14.5,8A1.5,1.5 0 0,1 13,6.5A1.5,1.5 0 0,1 14.5,5A1.5,1.5 0 0,1 16,6.5A1.5,1.5 0 0,1 14.5,8M9.5,8A1.5,1.5 0 0,1 8,6.5A1.5,1.5 0 0,1 9.5,5A1.5,1.5 0 0,1 11,6.5A1.5,1.5 0 0,1 9.5,8M6.5,12A1.5,1.5 0 0,1 5,10.5A1.5,1.5 0 0,1 6.5,9A1.5,1.5 0 0,1 8,10.5A1.5,1.5 0 0,1 6.5,12M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A1.5,1.5 0 0,0 13.5,19.5C13.5,19.11 13.35,18.76 13.11,18.5C12.88,18.23 12.73,17.88 12.73,17.5A1.5,1.5 0 0,1 14.23,16H16A5,5 0 0,0 21,11C21,6.58 16.97,3 12,3Z",
    "robot": "M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z",
    // Misc
    "alert-circle": "M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",
    "vacuum": "M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z",
    "camera": "M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z",
    "television": "M21,17H3V5H21M21,3H3A2,2 0 0,0 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5A2,2 0 0,0 21,3Z",
    "weather-sunny": "M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z",
    // Navigation
    "folder": "M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z",
    "arrow-left": "M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z",
    "help-circle": "M15.07,11.25L14.17,12.17C13.45,12.89 13,13.5 13,15H11V14.5C11,13.39 11.45,12.39 12.17,11.67L13.41,10.41C13.78,10.05 14,9.55 14,9C14,7.89 13.1,7 12,7A2,2 0 0,0 10,9H8A4,4 0 0,1 12,5A4,4 0 0,1 16,9C16,9.88 15.64,10.67 15.07,11.25M13,19H11V17H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z",
};

// In-memory cache for CDN-fetched icons
const iconCache = {};

// Default icon mapping by domain (same as renderer.ts)
function getDefaultIconName(domain) {
    const defaults = {
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
    return defaults[domain] || 'home';
}

// Fetch icon SVG path from CDN
async function fetchIconSvg(iconName) {
    const cleanName = iconName.replace(/^mdi:/, '');

    // 1. Check bundled first
    if (BUNDLED_ICONS[cleanName]) {
        return BUNDLED_ICONS[cleanName];
    }

    // 2. Check cache
    if (iconCache[cleanName]) {
        return iconCache[cleanName];
    }

    // 3. Fetch from CDN
    try {
        const url = `https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/${cleanName}.svg`;
        const response = await fetch(url);
        if (!response.ok) return null;

        const svgText = await response.text();
        const pathMatch = svgText.match(/<path[^>]*d="([^"]+)"/);
        const pathData = pathMatch ? pathMatch[1] : null;

        if (pathData) {
            iconCache[cleanName] = pathData;
        }
        return pathData;
    } catch (e) {
        console.error(`Failed to fetch icon ${cleanName}:`, e);
        return null;
    }
}

function styleEditor() {
    return {
        // Connection state
        parentWindow: null,
        connected: false,
        loading: true,
        status: 'Connecting to Settings...',

        // Device info
        deviceName: 'Unknown Device',
        deviceSize: { cols: 5, rows: 3 },
        deviceModel: 'StreamDeck',
        selectedDeviceId: null,
        connectedDevices: [],

        // Fallback device sizes (used if no devices detected)
        fallbackDevices: [
            { id: 'StreamDeckMini', name: 'Mini (3x2)', model: 'StreamDeckMini', cols: 3, rows: 2 },
            { id: 'StreamDeck', name: 'Standard (5x3)', model: 'StreamDeck', cols: 5, rows: 3 },
            { id: 'StreamDeckXL', name: 'XL (8x4)', model: 'StreamDeckXL', cols: 8, rows: 4 },
            { id: 'StreamDeckPlus', name: '+ (4x2)', model: 'StreamDeckPlus', cols: 4, rows: 2 },
            { id: 'StreamDeckNeo', name: 'Neo (4x2)', model: 'StreamDeckNeo', cols: 4, rows: 2 },
        ],

        // Computed - available devices (connected or fallback)
        get availableDevices() {
            return this.connectedDevices.length > 0 ? this.connectedDevices : this.fallbackDevices;
        },

        // Data from plugin
        entities: [],
        areas: [],
        allEntities: [], // Unfiltered

        // Labels from Home Assistant
        haLabels: [],
        entitiesWithLabels: [],
        dashboardEntities: [], // Entities used in HA dashboards (flat list)
        dashboards: [], // Dashboards with their entities (for grouping)

        // Full registry data for advanced grouping
        floors: [],
        entityRegistry: [],
        devices: [],
        allLabels: [], // All labels, not just deck-assistant ones

        // Icon loading state
        iconPaths: {}, // { "mdi:lightbulb": "M12,2A7,7...", ... }

        // Wizard state - enhanced
        wizardMode: 'new', // 'new' or 'reconfigure'
        isFirstTimeUser: true,
        wizardComplete: false,

        // Filters
        searchFilter: '',
        domainFilter: '',
        areaFilter: '',

        // Computed - unique domains
        get uniqueDomains() {
            return [...new Set(this.allEntities.map(e => e.domain))].sort();
        },

        // Computed - filtered entities
        get filteredEntities() {
            return this.allEntities.filter(e => {
                if (this.searchFilter) {
                    const search = this.searchFilter.toLowerCase();
                    const matchId = e.entity_id.toLowerCase().includes(search);
                    const matchName = (e.friendly_name || '').toLowerCase().includes(search);
                    if (!matchId && !matchName) return false;
                }
                if (this.domainFilter && e.domain !== this.domainFilter) return false;
                if (this.areaFilter && e.area_id !== this.areaFilter) return false;
                return true;
            });
        },

        // User selections
        selectedEntities: [],
        groups: [],
        mode: 'freeform',

        // Pages & Layout
        pages: [],
        currentPage: 0,

        // Grid style computed
        get gridStyle() {
            return {
                display: 'grid',
                gridTemplateColumns: `repeat(${this.deviceSize.cols}, 80px)`,
                gridTemplateRows: `repeat(${this.deviceSize.rows}, 80px)`,
                gap: '8px'
            };
        },

        // UI State
        rightTab: 'groups',
        dropTarget: null,
        showProfileNameModal: false,
        profileName: 'Home Assistant',
        showGeneratedProfileModal: false,
        generatedProfile: null,

        // Theming
        domainColors: { ...DOMAIN_COLORS },
        theme: {
            background: '#1a1a2e',
            backButtonPosition: 'bottom-right', // Legacy, keep for compatibility
            navStartPosition: 'bottom-right',   // NEW: Linear nav ←/→ position
            folderUpPosition: 'bottom-right',   // NEW: Folder up button position
        },

        // Style Editor State
        groupStyles: {}, // { groupName: { background, onOff, information, trigger } }
        ungroupedStyle: {
            background: '#1a1a2e',
            onOff: '#4CAF50',
            information: '#2196F3',
            trigger: '#FF9800'
        },
        currentPreset: 'modern',
        previewPage: 'main', // 'main' or group name (legacy, kept for compatibility)
        ungroupedExpanded: false,
        labelSyncStatus: null, // null, 'syncing', 'synced', 'error'

        // Preview page navigation
        currentPreviewPageIndex: 0,
        previewPages: [],
        previewPageStack: [], // For folder navigation (back to main)

        // Theme Presets
        themePresets: {
            modern: {
                name: 'Modern',
                background: '#1a1a2e',
                onOff: '#4CAF50',
                information: '#2196F3',
                trigger: '#FF9800'
            },
            classic: {
                name: 'Classic',
                background: '#2d2d2d',
                onOff: '#66BB6A',
                information: '#42A5F5',
                trigger: '#FFA726'
            },
            minimal: {
                name: 'Minimal',
                background: '#000000',
                onOff: '#FFFFFF',
                information: '#CCCCCC',
                trigger: '#999999'
            },
            vibrant: {
                name: 'Vibrant',
                background: '#1a1a2e',
                onOff: '#00E676',
                information: '#00B0FF',
                trigger: '#FF6D00'
            }
        },

        // Wizard
        showWizard: false,
        wizardStep: 0,
        wizardEntitySearch: '', // Search filter for entity lists
        wizardShowLinkedOnly: false, // Filter to show only deck-assistant labeled entities (auto-enabled if any exist)
        wizardHideUnavailable: true, // Filter to hide disabled/unavailable entities (default on)
        groupDragIndex: null, // Index of group being dragged
        groupDragOverIndex: null, // Index of group being dragged over
        // Ungrouped drag state
        ungroupedDragIndex: null,
        ungroupedDragOverIndex: null,
        wizardSelections: {
            startChoice: 'wizard', // 'wizard' or 'manual'
            approach: 'groups', // 'groups' or 'simple'
            groupType: 'area', // 'area', 'domain', 'custom'
            currentGroupEntities: [],
            currentGroupName: '',
            groups: [], // Array of { name, entities: [] }
            simpleEntities: [], // For simple flow
            simpleSort: 'area', // Sort order for simple flow
            ungroupedEntities: [], // Entities for main page (outside groups)
            ungroupedSort: 'selection', // 'selection' | 'alpha' | 'domain' | 'area' | 'floor' | 'custom'
            ungroupedOriginalOrder: [], // Preserved selection order for reset
            flatLayoutStyle: 'continuous', // 'continuous' or 'per-line'
            layoutStyle: 'groups-as-folders' // 'groups-as-folders', 'groups-as-pages', 'flat' (legacy, may remove)
        },
        // Group creation sub-steps (for progress display)
        groupCreationSteps: ['group-type', 'group-filter', 'group-entities', 'group-name'],

        wizardSteps: [
            {
                id: 'welcome',
                title: 'Welcome to Deck Assistant',
                subtitle: 'Let\'s set up your Stream Deck with Home Assistant entities.',
                type: 'info'
            },
            {
                id: 'approach',
                title: 'How would you like to organize?',
                subtitle: 'Choose your configuration approach.',
                type: 'choice',
                options: [
                    { id: 'groups', name: 'Define Groups First', description: 'Create organized groups (by room, device type, or custom) then arrange them' },
                    { id: 'simple', name: 'Quick Setup', description: 'Select entities, choose a sort order, and style them' }
                ]
            },
            {
                id: 'group-type',
                title: 'What defines this group?',
                subtitle: 'Choose how to filter entities for this group.',
                type: 'choice',
                options: [] // Dynamically generated based on available HA data
            },
            {
                id: 'group-filter',
                title: 'Select Filter',
                subtitle: 'Choose which area or device type.',
                type: 'choice'
            },
            {
                id: 'group-entities',
                title: 'Select Entities',
                subtitle: 'Choose entities for this group.',
                type: 'multiselect'
            },
            {
                id: 'group-name',
                title: 'Name This Group',
                subtitle: 'Give your group a descriptive name.',
                type: 'input'
            },
            {
                id: 'group-complete',
                title: 'Group Created!',
                subtitle: 'What would you like to do next?',
                type: 'choice',
                options: [
                    { id: 'another', name: 'Add Another Group', description: 'Create another group of entities' },
                    { id: 'ungrouped', name: 'Add Ungrouped Entities', description: 'Add individual entities for the main page' },
                    { id: 'done', name: 'Done — Configure Layout', description: 'Set how each group is displayed' }
                ]
            },
            {
                id: 'ungrouped-entities',
                title: 'Ungrouped Entities',
                subtitle: 'Select entities to display directly on the main page.',
                type: 'multiselect'
            },
            {
                id: 'group-layout',
                title: 'Group Display Options',
                subtitle: 'Choose how each group appears on your Stream Deck.',
                type: 'group-config'
            },
            {
                id: 'flat-layout',
                title: 'Flat Layout Style',
                subtitle: 'How should flat groups be arranged on the main page?',
                type: 'choice',
                options: [
                    { id: 'continuous', name: 'Continuous', description: 'Fill space left-to-right, top-to-bottom' },
                    { id: 'per-line', name: 'Per Line', description: 'Each group starts on a new row' }
                ]
            },
            {
                id: 'simple-entities',
                title: 'Select Entities',
                subtitle: 'Choose all entities you want on your Stream Deck.',
                type: 'multiselect'
            },
            {
                id: 'simple-sort',
                title: 'Sort Order',
                subtitle: 'How should entities be ordered on your Stream Deck?',
                type: 'choice',
                options: [] // Dynamically generated
            },
            {
                id: 'layout',
                title: 'Page Layout',
                subtitle: 'How should groups appear on your Stream Deck?',
                type: 'choice',
                options: [
                    { id: 'groups-as-folders', name: 'Groups as Folders', description: 'Main page with folder buttons, each group on its own sub-page' },
                    { id: 'groups-as-pages', name: 'Groups as Pages', description: 'Each group gets its own top-level page' },
                    { id: 'flat', name: 'All on One Page', description: 'No grouping, all entities together' }
                ]
            },
            {
                id: 'confirm',
                title: 'Ready to Generate',
                subtitle: 'Review your configuration.',
                type: 'confirm'
            }
        ],

        // ========== Initialization ==========

        init() {
            this.initializePages();
            this.connectToParent();
        },

        initializePages() {
            // Create initial empty page with correct grid size
            this.pages = [{
                id: this.generateId(),
                name: 'Page 1',
                layout: this.createEmptyLayout()
            }];
        },

        updateDeviceSize() {
            // Find the selected device from available devices
            const device = this.availableDevices.find(d => d.id === this.selectedDeviceId);
            if (device) {
                this.deviceSize = { cols: device.cols, rows: device.rows };
                this.deviceModel = device.model;
                this.deviceName = device.name;
                this.initializePages();
            }
        },

        selectDevice(deviceId) {
            this.selectedDeviceId = deviceId;
            this.updateDeviceSize();
        },

        createEmptyLayout() {
            const layout = [];
            for (let row = 0; row < this.deviceSize.rows; row++) {
                layout.push(new Array(this.deviceSize.cols).fill(null));
            }
            return layout;
        },

        generateId() {
            return 'id-' + Math.random().toString(36).substr(2, 9);
        },

        // ========== Parent Window Communication ==========

        connectToParent() {
            this.parentWindow = window.opener;

            if (!this.parentWindow) {
                this.status = 'No parent window found. Please open from Settings.';
                this.loading = false;
                return;
            }

            // Listen for messages from parent
            window.addEventListener('message', (event) => {
                console.log('Style Editor received message:', event.data);
                this.handleParentMessage(event.data);
            });

            // Tell parent we're ready
            this.status = 'Connecting to Settings window...';
            this.parentWindow.postMessage({ type: 'styleEditorReady' }, '*');

            // Request initial data after parent confirms connection
            setTimeout(() => {
                this.status = 'Requesting data...';
                this.sendToPlugin({ event: 'getDeviceInfo' });
                this.sendToPlugin({ event: 'getEntities' });
                this.sendToPlugin({ event: 'getAreas' });
                this.sendToPlugin({ event: 'getFloors' });
                this.sendToPlugin({ event: 'getLabels' });
                this.sendToPlugin({ event: 'getDashboardEntities' });
                this.sendToPlugin({ event: 'getDashboards' });
                this.sendToPlugin({ event: 'getFullRegistry' });
            }, 300);

            // Retry if no response after 2 seconds
            setTimeout(() => {
                if (this.loading && this.allEntities.length === 0) {
                    this.status = 'Retrying data request...';
                    this.sendToPlugin({ event: 'getDeviceInfo' });
                    this.sendToPlugin({ event: 'getEntities' });
                    this.sendToPlugin({ event: 'getAreas' });
                    this.sendToPlugin({ event: 'getFloors' });
                    this.sendToPlugin({ event: 'getLabels' });
                    this.sendToPlugin({ event: 'getDashboardEntities' });
                    this.sendToPlugin({ event: 'getDashboards' });
                    this.sendToPlugin({ event: 'getFullRegistry' });
                }
            }, 2000);

            // Show timeout error after 5 seconds
            setTimeout(() => {
                if (this.loading && this.allEntities.length === 0) {
                    this.status = 'Timeout. Make sure Settings window is open and connected to Home Assistant.';
                }
            }, 5000);
        },

        handleParentMessage(message) {
            if (!message || !message.type) return;

            console.log('Handling parent message:', message.type);

            if (message.type === 'connectionInfo') {
                this.connected = message.connected;
                this.status = this.connected ? 'Connected, requesting data...' : 'Settings not connected';
            } else if (message.type === 'pluginMessage') {
                console.log('Plugin message received:', message.payload?.event);
                this.handlePluginMessage(message.payload);
            }
        },

        sendToPlugin(payload) {
            if (!this.parentWindow) return;

            this.parentWindow.postMessage({
                type: 'sendToPlugin',
                payload: payload
            }, '*');
        },

        handlePluginMessage(payload) {
            console.log('Received from plugin:', payload);

            switch (payload.event) {
                case 'deviceInfo':
                    // Store connected devices
                    if (payload.devices && payload.devices.length > 0) {
                        this.connectedDevices = payload.devices;
                        // Auto-select the first connected device
                        if (!this.selectedDeviceId) {
                            this.selectedDeviceId = payload.devices[0].id;
                        }
                    }

                    // Set device info from first device or payload
                    this.deviceName = payload.name || 'Stream Deck';
                    this.deviceModel = payload.model || 'StreamDeck';

                    if (payload.cols && payload.rows) {
                        this.deviceSize = { cols: payload.cols, rows: payload.rows };
                        // Reinitialize pages with new size
                        this.initializePages();
                    }
                    this.status = 'Loading entities...';
                    break;

                case 'entitiesData':
                    this.allEntities = payload.entities || [];
                    this.connected = true;
                    this.loading = false;
                    this.status = 'Ready';
                    // Check if wizard should auto-start
                    this.checkAutoStartWizard();
                    break;

                case 'areasData':
                    this.areas = payload.areas || [];
                    break;

                case 'labelsData':
                    this.haLabels = payload.labels || [];
                    this.entitiesWithLabels = payload.entitiesWithLabels || [];
                    // Check if this is a first-time user (no deck-assistant labels exist)
                    this.isFirstTimeUser = this.entitiesWithLabels.length === 0;
                    // Auto-enable deck-assistant filter if any labeled entities exist
                    if (this.entitiesWithLabels.length > 0) {
                        this.wizardShowLinkedOnly = true;
                    }
                    // Check if wizard should auto-start
                    this.checkAutoStartWizard();
                    break;

                case 'labelCreated':
                    // Refresh labels after creating
                    this.sendToPlugin({ event: 'getLabels' });
                    break;

                case 'labelsAssigned':
                    // Refresh labels after assignment
                    this.sendToPlugin({ event: 'getLabels' });
                    break;

                case 'dashboardEntitiesData':
                    this.dashboardEntities = payload.entities || [];
                    console.log(`Loaded ${this.dashboardEntities.length} entities from HA dashboards`);
                    break;

                case 'dashboardsData':
                    this.dashboards = payload.dashboards || [];
                    console.log(`Loaded ${this.dashboards.length} dashboards with entities`);
                    break;

                case 'floorsData':
                    this.floors = payload.floors || [];
                    console.log(`Loaded ${this.floors.length} floors`);
                    break;

                case 'fullRegistryData':
                    this.entityRegistry = payload.entityRegistry || [];
                    this.devices = payload.devices || [];
                    this.allLabels = payload.labels || [];
                    console.log(`Loaded registry: ${this.entityRegistry.length} entities, ${this.devices.length} devices, ${this.allLabels.length} labels`);
                    break;

                case 'profileGenerated':
                    this.showProfileNameModal = false;
                    this.generatedProfile = {
                        filename: payload.filename,
                        filePath: payload.filePath,
                        content: payload.jsonContent
                    };
                    this.showGeneratedProfileModal = true;
                    this.status = 'Profile generated!';
                    break;


                case 'error':
                    alert('Error: ' + payload.message);
                    break;
            }
        },

        // ========== Entity Selection ==========

        isSelected(entityId) {
            return this.selectedEntities.includes(entityId);
        },

        toggleSelection(entityId) {
            const index = this.selectedEntities.indexOf(entityId);
            if (index === -1) {
                this.selectedEntities.push(entityId);
            } else {
                this.selectedEntities.splice(index, 1);
            }
        },

        selectAllVisible() {
            for (const entity of this.filteredEntities) {
                if (!this.selectedEntities.includes(entity.entity_id)) {
                    this.selectedEntities.push(entity.entity_id);
                }
            }
        },

        clearSelection() {
            this.selectedEntities = [];
            this.groups = [];
        },

        filterEntities() {
            // Filtering is reactive via computed property
        },

        getEntityById(entityId) {
            return this.allEntities.find(e => e.entity_id === entityId);
        },

        getEntityName(entityId) {
            const entity = this.getEntityById(entityId);
            return entity?.friendly_name || entityId;
        },

        // ========== Grid & Layout ==========

        getEntityAt(pageIndex, col, row) {
            const page = this.pages[pageIndex];
            if (!page || !page.layout[row]) return null;
            return page.layout[row][col];
        },

        getEntityStyle(entity) {
            if (!entity) return {};
            const color = this.domainColors[entity.domain] || '#888888';
            return {
                borderTop: `3px solid ${color}`
            };
        },

        getEntityIcon(entity) {
            if (!entity) return '';
            return DOMAIN_ICONS[entity.domain] || '📦';
        },

        getEntityLabel(entity) {
            if (!entity) return '';
            const name = entity.friendly_name || entity.entity_id;
            // Truncate long names
            return name.length > 10 ? name.substring(0, 9) + '…' : name;
        },

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
                    return groupStyle.onOff || DEFAULT_CATEGORY_COLORS.onOff;
                case 'informational':
                    return groupStyle.information || DEFAULT_CATEGORY_COLORS.information;
                case 'trigger':
                    return groupStyle.trigger || DEFAULT_CATEGORY_COLORS.trigger;
                default:
                    return groupStyle.onOff || DEFAULT_CATEGORY_COLORS.onOff;
            }
        },

        handleCellClick(col, row) {
            const entity = this.getEntityAt(this.currentPage, col, row);
            if (entity) {
                // Remove entity from cell
                this.pages[this.currentPage].layout[row][col] = null;
            }
        },

        addPage() {
            this.pages.push({
                id: this.generateId(),
                name: `Page ${this.pages.length + 1}`,
                layout: this.createEmptyLayout()
            });
            this.currentPage = this.pages.length - 1;
        },

        hasAnyEntitiesPlaced() {
            for (const page of this.pages) {
                for (const row of page.layout) {
                    for (const cell of row) {
                        if (cell) return true;
                    }
                }
            }
            return false;
        },

        // ========== Drag and Drop ==========

        handleDragStart(event, entity) {
            event.dataTransfer.setData('text/plain', JSON.stringify(entity));
            event.dataTransfer.effectAllowed = 'move';
        },

        handleDragOver(event, col, row) {
            event.preventDefault();
            this.dropTarget = { col, row };
        },

        handleDragLeave() {
            this.dropTarget = null;
        },

        handleDrop(event, col, row) {
            event.preventDefault();
            this.dropTarget = null;

            try {
                const entity = JSON.parse(event.dataTransfer.getData('text/plain'));
                this.pages[this.currentPage].layout[row][col] = entity;

                // Auto-select if not already selected
                if (!this.selectedEntities.includes(entity.entity_id)) {
                    this.selectedEntities.push(entity.entity_id);
                }
            } catch (e) {
                console.error('Drop error:', e);
            }
        },

        // ========== Grouping ==========

        autoGroup() {
            const groups = [];
            const byArea = {};

            // Group selected entities by area
            for (const entityId of this.selectedEntities) {
                const entity = this.getEntityById(entityId);
                if (!entity) continue;

                const areaId = entity.area_id || 'other';
                if (!byArea[areaId]) {
                    byArea[areaId] = [];
                }
                byArea[areaId].push(entityId);
            }

            // Create group objects
            for (const [areaId, entityIds] of Object.entries(byArea)) {
                const area = this.areas.find(a => a.area_id === areaId);
                groups.push({
                    id: this.generateId(),
                    name: area?.name || 'Other',
                    type: 'folder',
                    entities: entityIds,
                    expanded: false
                });
            }

            this.groups = groups;
            this.autoLayout();
        },

        autoLayout() {
            // Clear existing layout
            this.pages = [];

            const cellsPerPage = this.deviceSize.cols * this.deviceSize.rows;

            if (this.groups.length === 0) {
                // No groups - just lay out selected entities
                this.layoutEntitiesOnPages(this.selectedEntities.map(id => this.getEntityById(id)).filter(Boolean));
            } else if (this.groups.every(g => g.type === 'page')) {
                // All groups are pages - one page per group
                for (const group of this.groups) {
                    const entities = group.entities.map(id => this.getEntityById(id)).filter(Boolean);
                    this.layoutEntitiesOnPages(entities, group.name);
                }
            } else {
                // Mix of folders and pages - main page with folder buttons
                const mainPage = {
                    id: this.generateId(),
                    name: 'Main',
                    layout: this.createEmptyLayout()
                };
                this.pages.push(mainPage);

                let mainPosition = 0;
                for (const group of this.groups) {
                    if (group.type === 'folder') {
                        // Add folder button to main page
                        const row = Math.floor(mainPosition / this.deviceSize.cols);
                        const col = mainPosition % this.deviceSize.cols;
                        if (row < this.deviceSize.rows) {
                            mainPage.layout[row][col] = {
                                isFolder: true,
                                name: group.name,
                                targetPageId: null // Will be set after creating sub-page
                            };
                        }
                        mainPosition++;

                        // Create sub-page for folder contents
                        const entities = group.entities.map(id => this.getEntityById(id)).filter(Boolean);
                        const subPages = this.createPagesForEntities(entities, group.name);
                        if (subPages.length > 0) {
                            mainPage.layout[Math.floor((mainPosition - 1) / this.deviceSize.cols)][(mainPosition - 1) % this.deviceSize.cols].targetPageId = subPages[0].id;
                            this.pages.push(...subPages);
                        }
                    } else {
                        // Page type - add directly
                        const entities = group.entities.map(id => this.getEntityById(id)).filter(Boolean);
                        const groupPages = this.createPagesForEntities(entities, group.name);
                        this.pages.push(...groupPages);
                    }
                }
            }

            if (this.pages.length === 0) {
                this.initializePages();
            }

            this.currentPage = 0;
        },

        layoutEntitiesOnPages(entities, baseName = 'Page') {
            const pages = this.createPagesForEntities(entities, baseName);
            this.pages.push(...pages);
        },

        createPagesForEntities(entities, baseName) {
            const pages = [];
            const cellsPerPage = this.deviceSize.cols * this.deviceSize.rows - 1; // Reserve one for back/nav
            let currentEntities = [...entities];
            let pageNum = 1;

            while (currentEntities.length > 0) {
                const pageEntities = currentEntities.splice(0, cellsPerPage);
                const page = {
                    id: this.generateId(),
                    name: pages.length === 0 ? baseName : `${baseName} ${pageNum}`,
                    layout: this.createEmptyLayout()
                };

                let position = 0;
                for (const entity of pageEntities) {
                    const row = Math.floor(position / this.deviceSize.cols);
                    const col = position % this.deviceSize.cols;
                    page.layout[row][col] = entity;
                    position++;
                }

                pages.push(page);
                pageNum++;
            }

            return pages;
        },

        // ========== Wizard ==========

        /**
         * Check if wizard should auto-start
         * Called after entitiesData is received
         */
        checkAutoStartWizard() {
            // Always show the start choice when data is loaded (unless wizard already showing)
            if (!this.loading &&
                !this.showWizard &&
                !this.wizardComplete &&
                this.allEntities.length > 0) {
                // Small delay to let UI settle
                setTimeout(() => {
                    this.startWizard();
                }, 300);
            }
        },

        startWizard() {
            this.showWizard = true;

            // If groups already exist, skip to group-complete to add more or configure
            if (this.wizardSelections.groups && this.wizardSelections.groups.length > 0) {
                // Reset only the current group fields, keep existing groups
                this.wizardSelections.currentGroupEntities = [];
                this.wizardSelections.currentGroupName = '';
                this.wizardSelections.groupFilter = null;
                this.goToWizardStep('group-complete');
                return;
            }

            // Fresh start - reset everything
            this.wizardStep = 0;
            this.wizardSelections = {
                startChoice: 'wizard',
                approach: 'groups',
                groupType: 'area',
                groupFilter: null, // Selected area or domain for filtering
                currentGroupEntities: [],
                currentGroupName: '',
                groups: [], // Array of { name, entities: [], displayType: 'folder'|'page'|'flat' }
                simpleEntities: [],
                simpleSort: 'area',
                ungroupedEntities: [],
                flatLayoutStyle: 'continuous',
                layoutStyle: 'groups-as-folders'
            };
        },

        /**
         * Get wizard step by ID
         */
        getWizardStepIndex(stepId) {
            return this.wizardSteps.findIndex(s => s.id === stepId);
        },

        /**
         * Go to a specific wizard step by ID
         */
        goToWizardStep(stepId) {
            const index = this.getWizardStepIndex(stepId);
            if (index !== -1) {
                this.wizardStep = index;
                // Clear entity search when changing steps (keep filter preferences)
                this.wizardEntitySearch = '';
                // Reset "show only" filters but keep "hide" filters as they're usually desired
                this.wizardShowLinkedOnly = false;
            }
        },

        /**
         * Check if currently in the group creation sub-loop
         */
        isInGroupCreationLoop() {
            const currentStepId = this.wizardSteps[this.wizardStep]?.id;
            return this.groupCreationSteps.includes(currentStepId);
        },

        /**
         * Get the main wizard path steps based on selected approach
         */
        getMainWizardPath() {
            const approach = this.wizardSelections.approach;

            if (approach === 'simple') {
                return [
                    { id: 'welcome', label: 'Welcome' },
                    { id: 'approach', label: 'Approach' },
                    { id: 'simple-entities', label: 'Entities' },
                    { id: 'simple-sort', label: 'Sort' }
                ];
            } else if (approach === 'groups') {
                const path = [
                    { id: 'welcome', label: 'Welcome' },
                    { id: 'approach', label: 'Approach' },
                    { id: 'groups-loop', label: 'Groups', isLoop: true }
                ];

                // Add ungrouped step if we're past group creation or have ungrouped entities
                const currentStepId = this.wizardSteps[this.wizardStep]?.id;
                if (currentStepId === 'ungrouped-entities' ||
                    currentStepId === 'group-layout' ||
                    (this.wizardSelections.ungroupedEntities?.length > 0)) {
                    path.push({ id: 'ungrouped-entities', label: 'Ungrouped' });
                }

                path.push({ id: 'group-layout', label: 'Layout' });
                return path;
            }

            // Before approach selected
            return [
                { id: 'welcome', label: 'Welcome' },
                { id: 'approach', label: 'Approach' },
                { id: 'configure', label: 'Configure' },
                { id: 'finish', label: 'Finish' }
            ];
        },

        /**
         * Get current position in the main wizard path
         */
        getMainWizardProgress() {
            const path = this.getMainWizardPath();
            const currentStepId = this.wizardSteps[this.wizardStep]?.id;

            // Map current step to main path position
            if (currentStepId === 'welcome') return 0;
            if (currentStepId === 'approach') return 1;

            // Simple path
            if (this.wizardSelections.approach === 'simple') {
                if (currentStepId === 'simple-entities') return 2;
                if (currentStepId === 'simple-sort') return 3;
            }

            // Groups path
            if (this.wizardSelections.approach === 'groups') {
                // In group creation loop
                if (this.isInGroupCreationLoop() || currentStepId === 'group-complete') {
                    return 2; // "Groups" step
                }
                if (currentStepId === 'ungrouped-entities') {
                    return path.findIndex(p => p.id === 'ungrouped-entities');
                }
                if (currentStepId === 'group-layout' || currentStepId === 'flat-layout') {
                    return path.length - 1; // Last step
                }
            }

            return 0;
        },

        /**
         * Get progress within the group creation sub-loop
         */
        getGroupCreationProgress() {
            if (!this.isInGroupCreationLoop()) return null;

            const currentStepId = this.wizardSteps[this.wizardStep]?.id;
            const stepIndex = this.groupCreationSteps.indexOf(currentStepId);

            return {
                current: stepIndex + 1,
                total: this.groupCreationSteps.length,
                groupNumber: (this.wizardSelections.groups?.length || 0) + 1
            };
        },

        getWizardOptions() {
            const currentStep = this.wizardSteps[this.wizardStep];

            switch (currentStep.id) {
                case 'welcome':
                    return [];

                case 'approach':
                case 'group-complete':
                case 'layout':
                    return currentStep.options;

                case 'group-type':
                    return this.getAvailableGroupTypes();

                case 'group-filter':
                    return this.getGroupFilterOptions();

                case 'group-entities':
                    // Filter entities based on groupType and groupFilter, then apply search
                    return this.filterEntitiesBySearch(this.getFilteredEntitiesForGroup()).map(e => ({
                        id: e.entity_id,
                        name: e.friendly_name || e.entity_id,
                        subtitle: `${this.formatDomainName(e.domain)} • ${this.getAreaName(e.area_id) || 'No area'}`
                    }));

                case 'simple-entities':
                    // Show all entities for simple flow, filtered by search
                    return this.filterEntitiesBySearch(this.allEntities).map(e => ({
                        id: e.entity_id,
                        name: e.friendly_name || e.entity_id,
                        subtitle: `${this.formatDomainName(e.domain)} • ${this.getAreaName(e.area_id) || 'No area'}`
                    }));

                case 'simple-sort':
                    return this.getSimpleSortOptions();

                case 'ungrouped-entities':
                    // Show all entities not already in a group, filtered by search
                    return this.filterEntitiesBySearch(this.getAvailableUngroupedEntities()).map(e => ({
                        id: e.entity_id,
                        name: e.friendly_name || e.entity_id,
                        subtitle: `${this.formatDomainName(e.domain)} • ${this.getAreaName(e.area_id) || 'No area'}`
                    }));

                case 'flat-layout':
                    return currentStep.options;

                case 'confirm':
                    return [];

                default:
                    return [];
            }
        },

        /**
         * Get total entity count before filters are applied (for multiselect steps)
         */
        getWizardTotalCount() {
            const currentStep = this.wizardSteps[this.wizardStep];

            switch (currentStep.id) {
                case 'group-entities':
                    // Total entities matching the group type/filter (before search/toggles)
                    return this.getFilteredEntitiesForGroup().length;

                case 'simple-entities':
                    // Total entities available
                    return this.allEntities.length;

                case 'ungrouped-entities':
                    // Total entities not in any group
                    return this.getAvailableUngroupedEntities().length;

                default:
                    return 0;
            }
        },

        /**
         * Get entities that are not already assigned to a group
         */
        getAvailableUngroupedEntities() {
            const groupedEntityIds = new Set();
            for (const group of this.wizardSelections.groups) {
                for (const entityId of group.entities) {
                    groupedEntityIds.add(entityId);
                }
            }
            return this.allEntities.filter(e => !groupedEntityIds.has(e.entity_id));
        },

        /**
         * Check if any groups have flat display type
         */
        hasAnyFlatGroups() {
            return this.wizardSelections.groups.some(g => g.displayType === 'flat');
        },

        /**
         * Filter wizard options (for choice steps) by search term
         */
        filterWizardOptions(options) {
            const search = this.wizardEntitySearch.toLowerCase().trim();
            if (!search) return options;

            return options.filter(opt => {
                if (opt.name && opt.name.toLowerCase().includes(search)) return true;
                if (opt.description && opt.description.toLowerCase().includes(search)) return true;
                if (opt.id && opt.id.toLowerCase().includes(search)) return true;
                return false;
            });
        },

        /**
         * Filter entities by search term and filter toggles
         */
        filterEntitiesBySearch(entities) {
            let filtered = entities;

            // Filter to only deck-assistant linked entities if toggle is on
            if (this.wizardShowLinkedOnly) {
                const linkedEntityIds = this.entitiesWithLabels.map(e => e.entity_id);
                filtered = filtered.filter(e => linkedEntityIds.includes(e.entity_id));
            }

            // Hide disabled and unavailable entities
            if (this.wizardHideUnavailable) {
                const disabledEntityIds = this.entityRegistry
                    .filter(r => r.disabled_by)
                    .map(r => r.entity_id);
                filtered = filtered.filter(e =>
                    !disabledEntityIds.includes(e.entity_id) &&
                    e.state !== 'unavailable' &&
                    e.state !== 'unknown'
                );
            }

            // Apply search filter
            const search = this.wizardEntitySearch.toLowerCase().trim();
            if (search) {
                filtered = filtered.filter(e => {
                    // Search in entity ID
                    if (e.entity_id.toLowerCase().includes(search)) return true;
                    // Search in friendly name
                    if ((e.friendly_name || '').toLowerCase().includes(search)) return true;
                    // Search in domain (formatted)
                    if (this.formatDomainName(e.domain).toLowerCase().includes(search)) return true;
                    // Search in area name
                    const areaName = this.getAreaName(e.area_id) || '';
                    if (areaName.toLowerCase().includes(search)) return true;
                    return false;
                });
            }

            return filtered;
        },

        /**
         * Get available group types based on what's in the user's HA installation
         */
        getAvailableGroupTypes() {
            const options = [];

            // Always available: area, domain, custom
            if (this.areas.length > 0) {
                options.push({ id: 'area', name: 'By Area/Room', description: 'Select entities from a Home Assistant area' });
            }

            // Floor - only if floors exist
            if (this.floors.length > 0) {
                options.push({ id: 'floor', name: 'By Floor', description: 'Select entities from all areas on a floor' });
            }

            // Domain - always available if we have entities
            if (this.allEntities.length > 0) {
                options.push({ id: 'domain', name: 'By Device Type', description: 'Select entities by type (lights, switches, climate, etc.)' });
            }

            // Device class - only if some entities have device_class
            const hasDeviceClasses = this.allEntities.some(e => e.device_class);
            if (hasDeviceClasses) {
                options.push({ id: 'device_class', name: 'By Device Class', description: 'Select sensors by class (motion, door, temperature, etc.)' });
            }

            // Label - only if non-deck-assistant labels exist
            const nonDaLabels = this.allLabels.filter(l => !l.name.startsWith('deck-assistant'));
            if (nonDaLabels.length > 0) {
                options.push({ id: 'label', name: 'By Label', description: 'Select entities with a specific Home Assistant label' });
            }

            // Platform - only if entity registry has platform data
            const platforms = [...new Set(this.entityRegistry.map(e => e.platform).filter(p => p))];
            if (platforms.length > 0) {
                options.push({ id: 'platform', name: 'By Integration', description: 'Select entities from a specific integration (Hue, Z-Wave, etc.)' });
            }

            // Manufacturer - only if devices have manufacturer data
            const manufacturers = [...new Set(this.devices.map(d => d.manufacturer).filter(m => m))];
            if (manufacturers.length > 0) {
                options.push({ id: 'manufacturer', name: 'By Manufacturer', description: 'Select entities from devices by a specific manufacturer' });
            }

            // Device - only if devices exist
            if (this.devices.length > 0) {
                options.push({ id: 'device', name: 'By Device', description: 'Select all entities from a specific physical device' });
            }

            // Dashboard - only if dashboards with entities exist
            if (this.dashboards.length > 0) {
                options.push({ id: 'dashboard', name: 'By Dashboard', description: 'Select entities that appear on a specific HA dashboard' });
            }

            // Custom is always available
            options.push({ id: 'custom', name: 'Custom Selection', description: 'Pick any entities you want' });

            return options;
        },

        /**
         * Get filter options based on current group type
         */
        getGroupFilterOptions() {
            const groupType = this.wizardSelections.groupType;

            switch (groupType) {
                case 'area': {
                    const areaOptions = this.areas.map(a => ({ id: a.area_id, name: a.name }));
                    const hasUnassigned = this.allEntities.some(e => !e.area_id);
                    if (hasUnassigned) {
                        areaOptions.push({ id: '__unassigned__', name: 'Unassigned (no area)' });
                    }
                    return areaOptions;
                }

                case 'floor': {
                    const floorOptions = this.floors.map(f => ({
                        id: f.floor_id,
                        name: f.name,
                        description: f.level !== undefined ? `Level ${f.level}` : undefined
                    }));
                    // Add option for areas without floors
                    const areasWithoutFloor = this.areas.filter(a => !a.floor_id);
                    if (areasWithoutFloor.length > 0) {
                        floorOptions.push({ id: '__no_floor__', name: 'No Floor Assigned' });
                    }
                    return floorOptions;
                }

                case 'domain': {
                    const domains = [...new Set(this.allEntities.map(e => e.domain))].sort();
                    return domains.map(d => ({ id: d, name: this.formatDomainName(d) }));
                }

                case 'device_class': {
                    // Get unique device classes from entities
                    const deviceClasses = [...new Set(
                        this.allEntities
                            .map(e => e.device_class)
                            .filter(dc => dc)
                    )].sort();
                    return deviceClasses.map(dc => ({
                        id: dc,
                        name: this.formatDeviceClassName(dc)
                    }));
                }

                case 'label': {
                    // Show all labels except deck-assistant ones
                    const nonDaLabels = this.allLabels.filter(l => !l.name.startsWith('deck-assistant'));
                    return nonDaLabels.map(l => ({
                        id: l.label_id,
                        name: l.name,
                        description: l.color ? `Color: ${l.color}` : undefined
                    }));
                }

                case 'platform': {
                    // Get unique platforms from entity registry
                    const platforms = [...new Set(
                        this.entityRegistry.map(e => e.platform)
                    )].sort();
                    return platforms.map(p => ({
                        id: p,
                        name: this.formatPlatformName(p)
                    }));
                }

                case 'manufacturer': {
                    // Get unique manufacturers from devices
                    const manufacturers = [...new Set(
                        this.devices
                            .map(d => d.manufacturer)
                            .filter(m => m)
                    )].sort();
                    return manufacturers.map(m => ({ id: m, name: m }));
                }

                case 'device': {
                    // Show all devices with entity counts
                    return this.devices.map(d => {
                        const entityCount = this.entityRegistry.filter(e => e.device_id === d.id).length;
                        return {
                            id: d.id,
                            name: d.name,
                            description: `${entityCount} entities` + (d.manufacturer ? ` • ${d.manufacturer}` : '')
                        };
                    }).sort((a, b) => a.name.localeCompare(b.name));
                }

                case 'dashboard': {
                    // Show all dashboards with entity counts
                    return this.dashboards.map(d => ({
                        id: d.id,
                        name: d.name,
                        description: `${d.entities.length} entities`
                    }));
                }

                default:
                    return [];
            }
        },

        /**
         * Get entities filtered for current group creation
         */
        getFilteredEntitiesForGroup() {
            const { groupType, groupFilter } = this.wizardSelections;

            if (groupType === 'custom') {
                return this.allEntities;
            }

            if (!groupFilter) return [];

            switch (groupType) {
                case 'area':
                    return this.allEntities.filter(e => {
                        if (groupFilter === '__unassigned__') return !e.area_id;
                        return e.area_id === groupFilter;
                    });

                case 'floor': {
                    // Get all areas on this floor
                    const areasOnFloor = this.areas
                        .filter(a => {
                            if (groupFilter === '__no_floor__') return !a.floor_id;
                            return a.floor_id === groupFilter;
                        })
                        .map(a => a.area_id);
                    return this.allEntities.filter(e => areasOnFloor.includes(e.area_id));
                }

                case 'domain':
                    return this.allEntities.filter(e => e.domain === groupFilter);

                case 'device_class':
                    return this.allEntities.filter(e => e.device_class === groupFilter);

                case 'label': {
                    // Find entities with this label
                    const entitiesWithLabel = this.entityRegistry
                        .filter(e => e.labels && e.labels.includes(groupFilter))
                        .map(e => e.entity_id);
                    return this.allEntities.filter(e => entitiesWithLabel.includes(e.entity_id));
                }

                case 'platform': {
                    // Find entities from this platform
                    const entitiesFromPlatform = this.entityRegistry
                        .filter(e => e.platform === groupFilter)
                        .map(e => e.entity_id);
                    return this.allEntities.filter(e => entitiesFromPlatform.includes(e.entity_id));
                }

                case 'manufacturer': {
                    // Find devices by manufacturer, then their entities
                    const deviceIds = this.devices
                        .filter(d => d.manufacturer === groupFilter)
                        .map(d => d.id);
                    const entityIds = this.entityRegistry
                        .filter(e => deviceIds.includes(e.device_id))
                        .map(e => e.entity_id);
                    return this.allEntities.filter(e => entityIds.includes(e.entity_id));
                }

                case 'device': {
                    // Find entities belonging to this device
                    const entityIds = this.entityRegistry
                        .filter(e => e.device_id === groupFilter)
                        .map(e => e.entity_id);
                    return this.allEntities.filter(e => entityIds.includes(e.entity_id));
                }

                case 'dashboard': {
                    // Find entities on this dashboard
                    const dashboard = this.dashboards.find(d => d.id === groupFilter);
                    if (!dashboard) return [];
                    return this.allEntities.filter(e => dashboard.entities.includes(e.entity_id));
                }

                default:
                    return [];
            }
        },

        /**
         * Get available sort options for Quick Setup based on selected entities
         */
        getSimpleSortOptions() {
            const options = [
                { id: 'name', name: 'By Name', description: 'Alphabetical order by friendly name' },
                { id: 'entity_id', name: 'By Entity ID', description: 'Alphabetical order by entity ID' },
                { id: 'domain', name: 'By Device Type', description: 'Group lights together, switches together, etc.' }
            ];

            // Add area option if any selected entities have areas
            const selectedEntities = this.wizardSelections.simpleEntities;
            const hasAreas = selectedEntities.some(id => {
                const entity = this.getEntityById(id);
                return entity && entity.area_id;
            });
            if (hasAreas) {
                options.unshift({ id: 'area', name: 'By Area', description: 'Group entities by room/area' });
            }

            // Add floor option if floors exist and selected entities have floor associations
            if (this.floors.length > 0) {
                const areasWithFloors = this.areas.filter(a => a.floor_id).map(a => a.area_id);
                const hasFloorEntities = selectedEntities.some(id => {
                    const entity = this.getEntityById(id);
                    return entity && areasWithFloors.includes(entity.area_id);
                });
                if (hasFloorEntities) {
                    options.splice(1, 0, { id: 'floor', name: 'By Floor', description: 'Group entities by floor level' });
                }
            }

            return options;
        },

        /**
         * Sort entities based on sort type
         */
        sortEntities(entityIds, sortType) {
            const entities = entityIds.map(id => this.getEntityById(id)).filter(Boolean);

            switch (sortType) {
                case 'name':
                    entities.sort((a, b) => {
                        const nameA = (a.friendly_name || a.entity_id).toLowerCase();
                        const nameB = (b.friendly_name || b.entity_id).toLowerCase();
                        return nameA.localeCompare(nameB);
                    });
                    break;

                case 'entity_id':
                    entities.sort((a, b) => a.entity_id.localeCompare(b.entity_id));
                    break;

                case 'domain':
                    entities.sort((a, b) => {
                        const domainCompare = a.domain.localeCompare(b.domain);
                        if (domainCompare !== 0) return domainCompare;
                        const nameA = (a.friendly_name || a.entity_id).toLowerCase();
                        const nameB = (b.friendly_name || b.entity_id).toLowerCase();
                        return nameA.localeCompare(nameB);
                    });
                    break;

                case 'area':
                    entities.sort((a, b) => {
                        const areaA = this.getAreaName(a.area_id) || 'zzz'; // Put no-area at end
                        const areaB = this.getAreaName(b.area_id) || 'zzz';
                        const areaCompare = areaA.localeCompare(areaB);
                        if (areaCompare !== 0) return areaCompare;
                        const nameA = (a.friendly_name || a.entity_id).toLowerCase();
                        const nameB = (b.friendly_name || b.entity_id).toLowerCase();
                        return nameA.localeCompare(nameB);
                    });
                    break;

                case 'floor':
                    entities.sort((a, b) => {
                        const floorA = this.getFloorForEntity(a) || { level: 999, name: 'zzz' };
                        const floorB = this.getFloorForEntity(b) || { level: 999, name: 'zzz' };
                        // Sort by level first, then by floor name, then by entity name
                        if (floorA.level !== floorB.level) return floorA.level - floorB.level;
                        const floorCompare = floorA.name.localeCompare(floorB.name);
                        if (floorCompare !== 0) return floorCompare;
                        const nameA = (a.friendly_name || a.entity_id).toLowerCase();
                        const nameB = (b.friendly_name || b.entity_id).toLowerCase();
                        return nameA.localeCompare(nameB);
                    });
                    break;
            }

            return entities.map(e => e.entity_id);
        },

        /**
         * Get floor info for an entity (via its area)
         */
        getFloorForEntity(entity) {
            if (!entity || !entity.area_id) return null;
            const area = this.areas.find(a => a.area_id === entity.area_id);
            if (!area || !area.floor_id) return null;
            return this.floors.find(f => f.floor_id === area.floor_id);
        },

        formatDomainName(domain) {
            const names = {
                light: 'Lights',
                switch: 'Switches',
                climate: 'Climate/HVAC',
                media_player: 'Media Players',
                sensor: 'Sensors',
                binary_sensor: 'Binary Sensors',
                cover: 'Covers/Blinds',
                fan: 'Fans',
                lock: 'Locks',
                vacuum: 'Vacuums',
                camera: 'Cameras',
                automation: 'Automations',
                script: 'Scripts',
                scene: 'Scenes',
                input_boolean: 'Input Booleans',
                input_number: 'Input Numbers',
                input_select: 'Input Selects'
            };
            return names[domain] || domain.charAt(0).toUpperCase() + domain.slice(1).replace(/_/g, ' ');
        },

        /**
         * Format a device class name for display (e.g., "battery_charging" -> "Battery Charging")
         */
        formatDeviceClassName(deviceClass) {
            if (!deviceClass) return 'Unknown';
            // Simple formatting: capitalize and replace underscores
            return deviceClass
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        },

        /**
         * Format a platform/integration name for display
         */
        formatPlatformName(platform) {
            if (!platform) return 'Unknown';
            // Simple formatting: capitalize and replace underscores
            return platform
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        },

        /**
         * Suggest a group name based on group type and filter selection
         */
        suggestGroupName(groupType, filterId) {
            switch (groupType) {
                case 'area': {
                    if (filterId === '__unassigned__') return 'Unassigned';
                    const area = this.areas.find(a => a.area_id === filterId);
                    return area ? area.name : 'Unknown Area';
                }

                case 'floor': {
                    if (filterId === '__no_floor__') return 'No Floor';
                    const floor = this.floors.find(f => f.floor_id === filterId);
                    return floor ? floor.name : 'Unknown Floor';
                }

                case 'domain':
                    return this.formatDomainName(filterId);

                case 'device_class':
                    return this.formatDeviceClassName(filterId);

                case 'label': {
                    const label = this.allLabels.find(l => l.label_id === filterId);
                    return label ? label.name : 'Labeled';
                }

                case 'platform':
                    return this.formatPlatformName(filterId);

                case 'manufacturer':
                    return filterId; // Manufacturer names are already human-readable

                case 'device': {
                    const device = this.devices.find(d => d.id === filterId);
                    return device ? device.name : 'Unknown Device';
                }

                case 'dashboard': {
                    const dashboard = this.dashboards.find(d => d.id === filterId);
                    return dashboard ? dashboard.name : 'Unknown Dashboard';
                }

                default:
                    return '';
            }
        },

        isWizardOptionSelected(optionId) {
            const currentStep = this.wizardSteps[this.wizardStep];

            switch (currentStep.id) {
                case 'start-choice':
                    return this.wizardSelections.startChoice === optionId;
                case 'approach':
                    return this.wizardSelections.approach === optionId;
                case 'group-type':
                    return this.wizardSelections.groupType === optionId;
                case 'group-filter':
                    return this.wizardSelections.groupFilter === optionId;
                case 'group-entities':
                    return this.wizardSelections.currentGroupEntities.includes(optionId);
                case 'group-complete':
                    return false; // No persistent selection
                case 'simple-entities':
                    return this.wizardSelections.simpleEntities.includes(optionId);
                case 'simple-sort':
                    return this.wizardSelections.simpleSort === optionId;
                case 'ungrouped-entities':
                    return this.wizardSelections.ungroupedEntities.includes(optionId);
                case 'flat-layout':
                    return this.wizardSelections.flatLayoutStyle === optionId;
                case 'layout':
                    return this.wizardSelections.layoutStyle === optionId;
                default:
                    return false;
            }
        },

        toggleWizardOption(optionId) {
            const currentStep = this.wizardSteps[this.wizardStep];

            switch (currentStep.id) {
                case 'start-choice':
                    this.wizardSelections.startChoice = optionId;
                    break;
                case 'approach':
                    this.wizardSelections.approach = optionId;
                    break;
                case 'group-type':
                    this.wizardSelections.groupType = optionId;
                    // Reset filter when type changes
                    this.wizardSelections.groupFilter = null;
                    break;
                case 'group-filter':
                    this.wizardSelections.groupFilter = optionId;
                    // Auto-suggest group name based on filter and type
                    this.wizardSelections.currentGroupName = this.suggestGroupName(this.wizardSelections.groupType, optionId);
                    break;
                case 'group-entities':
                    this.toggleArrayItem(this.wizardSelections.currentGroupEntities, optionId);
                    break;
                case 'simple-entities':
                    this.toggleArrayItem(this.wizardSelections.simpleEntities, optionId);
                    break;
                case 'simple-sort':
                    this.wizardSelections.simpleSort = optionId;
                    break;
                case 'ungrouped-entities':
                    this.toggleArrayItem(this.wizardSelections.ungroupedEntities, optionId);
                    break;
                case 'flat-layout':
                    this.wizardSelections.flatLayoutStyle = optionId;
                    break;
                case 'layout':
                    this.wizardSelections.layoutStyle = optionId;
                    break;
            }
        },

        /**
         * Toggle an item in an array (add if not present, remove if present)
         */
        toggleArrayItem(arr, item) {
            const index = arr.indexOf(item);
            if (index === -1) {
                arr.push(item);
            } else {
                arr.splice(index, 1);
            }
        },

        wizardBack() {
            const currentStep = this.wizardSteps[this.wizardStep];

            if (this.wizardStep === 0) {
                this.showWizard = false;
                return;
            }

            // Handle back navigation based on current step
            switch (currentStep.id) {
                case 'approach':
                    // Back to welcome
                    this.goToWizardStep('welcome');
                    break;
                case 'group-type':
                    // Back to approach
                    this.goToWizardStep('approach');
                    break;
                case 'group-filter':
                    // Back to group-type
                    this.goToWizardStep('group-type');
                    break;
                case 'group-entities':
                    // Back depends on group type
                    if (this.wizardSelections.groupType === 'custom') {
                        this.goToWizardStep('group-type');
                    } else {
                        this.goToWizardStep('group-filter');
                    }
                    break;
                case 'group-name':
                    this.goToWizardStep('group-entities');
                    break;
                case 'group-complete':
                    this.goToWizardStep('group-name');
                    break;
                case 'simple-entities':
                    this.goToWizardStep('approach');
                    break;
                case 'simple-sort':
                    this.goToWizardStep('simple-entities');
                    break;
                case 'ungrouped-entities':
                    this.goToWizardStep('group-complete');
                    break;
                case 'group-layout':
                    // Back to ungrouped-entities if we came from there, otherwise group-complete
                    if (this.wizardSelections.ungroupedEntities.length > 0) {
                        this.goToWizardStep('ungrouped-entities');
                    } else {
                        this.goToWizardStep('group-complete');
                    }
                    break;
                case 'flat-layout':
                    this.goToWizardStep('group-layout');
                    break;
                case 'confirm':
                    if (this.wizardSelections.approach === 'simple') {
                        this.goToWizardStep('simple-sort');
                    } else if (this.hasAnyFlatGroups()) {
                        this.goToWizardStep('flat-layout');
                    } else {
                        this.goToWizardStep('group-layout');
                    }
                    break;
                default:
                    this.wizardStep--;
            }
        },

        async wizardNext() {
            const currentStep = this.wizardSteps[this.wizardStep];

            switch (currentStep.id) {
                case 'welcome':
                    this.goToWizardStep('approach');
                    break;

                case 'approach':
                    if (this.wizardSelections.approach === 'groups') {
                        this.goToWizardStep('group-type');
                    } else {
                        this.goToWizardStep('simple-entities');
                    }
                    break;

                case 'group-type':
                    if (this.wizardSelections.groupType === 'custom') {
                        // Skip filter step for custom selection
                        this.wizardSelections.groupFilter = null;
                        this.wizardSelections.currentGroupName = '';
                        this.goToWizardStep('group-entities');
                    } else {
                        this.goToWizardStep('group-filter');
                    }
                    break;

                case 'group-filter':
                    if (!this.wizardSelections.groupFilter) {
                        alert('Please select an option');
                        return;
                    }
                    this.goToWizardStep('group-entities');
                    break;

                case 'group-entities':
                    if (this.wizardSelections.currentGroupEntities.length === 0) {
                        alert('Please select at least one entity');
                        return;
                    }
                    this.goToWizardStep('group-name');
                    break;

                case 'group-name':
                    if (!this.wizardSelections.currentGroupName.trim()) {
                        alert('Please enter a group name');
                        return;
                    }
                    // Save the current group with default display type
                    this.wizardSelections.groups.push({
                        name: this.wizardSelections.currentGroupName.trim(),
                        entities: [...this.wizardSelections.currentGroupEntities],
                        displayType: 'folder', // Default to folder, user can change in group-layout step
                        expanded: false // For Style Editor collapsible UI
                    });
                    // Reset for next group
                    this.wizardSelections.currentGroupEntities = [];
                    this.wizardSelections.currentGroupName = '';
                    this.wizardSelections.groupFilter = null;
                    this.goToWizardStep('group-complete');
                    break;

                case 'group-complete':
                    // This is handled by toggleWizardOption selecting 'another' or 'done'
                    // We need to check what was last selected
                    break;

                case 'simple-entities':
                    if (this.wizardSelections.simpleEntities.length === 0) {
                        alert('Please select at least one entity');
                        return;
                    }
                    this.goToWizardStep('simple-sort');
                    break;

                case 'simple-sort':
                    // Quick setup is done - finish and load to editor
                    await this.finishQuickSetup();
                    break;

                case 'ungrouped-entities':
                    // Proceed to group layout configuration
                    this.goToWizardStep('group-layout');
                    break;

                case 'group-layout':
                    // Go directly to Style Editor (skip confirm step)
                    await this.finishWizard();
                    break;

                case 'flat-layout':
                    // Go directly to Style Editor (skip confirm step)
                    await this.finishWizard();
                    break;

                case 'confirm':
                    // Legacy - should not reach here
                    await this.finishWizard();
                    break;

                default:
                    this.wizardStep++;
            }
        },

        /**
         * Handle group-complete step choices
         */
        handleGroupCompleteChoice(choice) {
            if (choice === 'another') {
                this.goToWizardStep('group-type');
            } else if (choice === 'ungrouped') {
                this.goToWizardStep('ungrouped-entities');
            } else {
                this.goToWizardStep('group-layout');
            }
        },

        /**
         * Update a group's display type
         */
        setGroupDisplayType(groupIndex, displayType) {
            if (this.wizardSelections.groups[groupIndex]) {
                this.wizardSelections.groups[groupIndex].displayType = displayType;
            }
        },

        /**
         * Handle group drag start
         */
        handleGroupDragStart(event, index) {
            this.groupDragIndex = index;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', index.toString());
        },

        /**
         * Handle group drag end
         */
        handleGroupDragEnd() {
            this.groupDragIndex = null;
            this.groupDragOverIndex = null;
        },

        /**
         * Handle group drag over
         */
        handleGroupDragOver(event, index) {
            if (this.groupDragIndex !== null && this.groupDragIndex !== index) {
                this.groupDragOverIndex = index;
            }
        },

        /**
         * Handle group drag leave
         */
        handleGroupDragLeave() {
            this.groupDragOverIndex = null;
        },

        /**
         * Handle group drop - reorder groups
         */
        handleGroupDrop(event, targetIndex) {
            event.preventDefault();
            const sourceIndex = this.groupDragIndex;

            if (sourceIndex !== null && sourceIndex !== targetIndex) {
                // Remove the group from its original position
                const [movedGroup] = this.wizardSelections.groups.splice(sourceIndex, 1);
                // Insert it at the new position
                this.wizardSelections.groups.splice(targetIndex, 0, movedGroup);
            }

            this.groupDragIndex = null;
            this.groupDragOverIndex = null;
        },

        /**
         * Finish Quick Setup flow - sort entities and load to Style Editor
         */
        async finishQuickSetup() {
            const { simpleEntities, simpleSort } = this.wizardSelections;

            // Sort the entities
            const sortedEntityIds = this.sortEntities(simpleEntities, simpleSort);

            // Set sorted entities as ungrouped entities for Style Editor
            this.wizardSelections.ungroupedEntities = sortedEntityIds;
            this.wizardSelections.ungroupedOriginalOrder = [...sortedEntityIds]; // Preserve original order
            this.wizardSelections.groups = []; // No groups in quick setup

            // Initialize ungrouped style with current preset
            const preset = this.themePresets[this.currentPreset];
            this.ungroupedStyle = {
                background: preset.background,
                onOff: preset.onOff,
                information: preset.information,
                trigger: preset.trigger
            };

            // Close wizard and show Style Editor
            this.showWizard = false;
            this.wizardComplete = true;
            this.previewPage = 'main';

            // Build preview pages and preload icons
            this.refreshPreviewPages();
        },

        async finishWizard() {
            const { approach, groups, simpleEntities } = this.wizardSelections;

            if (approach === 'groups') {
                // Groups are already in wizardSelections.groups with displayType set
                // Initialize styles for each group
                for (const group of groups) {
                    if (!this.groupStyles[group.name]) {
                        const preset = this.themePresets[this.currentPreset];
                        this.groupStyles[group.name] = {
                            background: preset.background,
                            onOff: preset.onOff,
                            information: preset.information,
                            trigger: preset.trigger
                        };
                    }
                }
                // Labels are NOT automatically synced to HA - user can do this optionally
            } else {
                // Simple flow - create a single flat group with all entities
                this.wizardSelections.ungroupedEntities = simpleEntities;
                this.wizardSelections.ungroupedOriginalOrder = [...simpleEntities]; // Preserve original order
            }

            // Close wizard and show Style Editor
            this.showWizard = false;
            this.wizardComplete = true;
            this.previewPage = 'main';

            // Build preview pages and preload icons
            this.refreshPreviewPages();

            // User can now customize styles and click "Generate Profile" when ready
        },

        /**
         * Add deck-assistant labels to Home Assistant (optional, user-triggered)
         */
        async addLabelsToHomeAssistant() {
            const groups = this.wizardSelections.groups || [];
            if (groups.length === 0) {
                alert('No groups to add labels for');
                return;
            }

            this.labelSyncStatus = 'syncing';

            try {
                // Build label assignments from groups
                const labelAssignments = [];

                for (const group of groups) {
                    const groupSlug = this.slugify(group.name);
                    const labelString = this.buildLabelString([groupSlug]);

                    for (const entityId of group.entities) {
                        labelAssignments.push({
                            entityId: entityId,
                            label: labelString
                        });
                    }
                }

                // Get unique labels we need to create
                const uniqueLabels = [...new Set(labelAssignments.map(a => a.label))];

                // Only create labels that don't already exist
                const existingLabelNames = this.haLabels.map(l => l.name);
                const labelsToCreate = uniqueLabels.filter(name => !existingLabelNames.includes(name));

                for (const labelName of labelsToCreate) {
                    this.createLabel(labelName);
                }

                // Wait a moment for labels to be created (if any)
                if (labelsToCreate.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Refresh labels from HA
                    this.sendToPlugin({ event: 'getLabels' });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Get current entity label assignments to avoid duplicates
                const entityLabelMap = {};
                for (const entry of this.entitiesWithLabels) {
                    entityLabelMap[entry.entity_id] = entry.labels || [];
                }

                // Assign labels to entities (only if not already assigned)
                for (const assignment of labelAssignments) {
                    const label = this.haLabels.find(l => l.name === assignment.label);
                    if (label) {
                        // Check if entity already has this label (compare using label_id, not name)
                        const existingLabelIds = entityLabelMap[assignment.entityId] || [];
                        if (!existingLabelIds.includes(label.label_id)) {
                            this.assignLabelsToEntity(assignment.entityId, [label.label_id]);
                        }
                    }
                }

                this.labelSyncStatus = 'synced';
                setTimeout(() => {
                    this.labelSyncStatus = null;
                }, 3000);
            } catch (error) {
                this.labelSyncStatus = 'error';
                console.error('Failed to add labels:', error);
                setTimeout(() => {
                    this.labelSyncStatus = null;
                }, 3000);
            }
        },

        getAreaName(areaId) {
            if (!areaId) return null;
            const area = this.areas.find(a => a.area_id === areaId);
            return area ? area.name : null;
        },

        // ========== Icon Loading ==========

        /**
         * Load an icon path asynchronously
         */
        async loadIcon(iconName) {
            if (!iconName) return;
            if (this.iconPaths[iconName]) return; // Already loaded or loading

            this.iconPaths[iconName] = 'loading';
            const pathData = await fetchIconSvg(iconName);
            this.iconPaths[iconName] = pathData || 'error';
        },

        /**
         * Get the loaded icon path (or null if not loaded)
         */
        getIconPath(iconName) {
            const path = this.iconPaths[iconName];
            if (!path || path === 'loading' || path === 'error') return null;
            return path;
        },

        /**
         * Check if an icon is still loading
         */
        isIconLoading(iconName) {
            return this.iconPaths[iconName] === 'loading';
        },

        /**
         * Get the icon name for an entity (from HA or domain default)
         */
        getEntityIconName(entity) {
            if (entity.icon) return entity.icon;
            return `mdi:${getDefaultIconName(entity.domain)}`;
        },

        slugify(text) {
            return text
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
        },

        // ========== Profile Generation ==========

        generateProfile() {
            try {
                if (!this.profileName.trim()) return;

                // Build pages from Style Editor state
                const pages = this.buildPagesFromStyleEditor();

                // Create a clean copy of config (removes Alpine.js proxies)
                const config = JSON.parse(JSON.stringify({
                    name: this.profileName.trim(),
                    device: {
                        model: this.deviceModel,
                        cols: this.deviceSize.cols,
                        rows: this.deviceSize.rows
                    },
                    pages: pages,
                    theme: this.theme,
                    domainColors: this.domainColors,
                    groupStyles: this.groupStyles,
                    ungroupedStyle: this.ungroupedStyle,
                    blankTitles: true // Tell generator to leave Stream Deck titles blank
                }));

                this.sendToPlugin({
                    event: 'generateProfile',
                    config: config
                });

                // Show feedback that we're generating
                this.status = 'Generating profile...';
            } catch (e) {
                alert('Error in generateProfile: ' + e.message);
            }
        },

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

            let remainingItems = [...linearItems];
            let pageIndex = 0;
            let isMain = true;

            // First pass: determine if we need overflow pages
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
                    const isLastGroup = pageGroupItems.indexOf(pageGroupItems.find(p => p.group === group)) === pageGroupItems.length - 1;
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
                if (needsNext && folderNav.next) {
                    page.layout[folderNav.next.row][folderNav.next.col] = {
                        type: 'nav-next',
                        icon: 'mdi:arrow-right',
                        label: '→'
                    };
                }

                // Need prev if not first folder page
                if (pageIndex > 0 && folderNav.prev) {
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

        /**
         * Get back button position based on theme setting
         */
        getBackButtonPosition() {
            const pos = this.theme.backButtonPosition;
            const maxRow = this.deviceSize.rows - 1;
            const maxCol = this.deviceSize.cols - 1;

            switch (pos) {
                case 'bottom-left':
                    return { row: maxRow, col: 0 };
                case 'top-right':
                    return { row: 0, col: maxCol };
                case 'top-left':
                    return { row: 0, col: 0 };
                case 'bottom-right':
                default:
                    return { row: maxRow, col: maxCol };
            }
        },

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
            const lastCol = this.deviceSize.cols - 1;

            // Check for conflicts - folder up takes priority
            let prev = navPositions.prev;
            let next = navPositions.next;

            // If folder up conflicts with next, shift nav inward
            if (folderUp.row === next.row && folderUp.col === next.col) {
                // Shift both prev and next one position inward
                if (this.theme.navStartPosition.includes('right')) {
                    next = { row: next.row, col: next.col - 1 };
                    prev = prev.col > 0 ? { row: prev.row, col: prev.col - 1 } : null;
                } else {
                    next = { row: next.row, col: next.col + 1 };
                    prev = prev.col < lastCol ? { row: prev.row, col: prev.col + 1 } : null;
                }
            }
            // If folder up conflicts with prev, shift nav inward
            else if (folderUp.row === prev.row && folderUp.col === prev.col) {
                if (this.theme.navStartPosition.includes('right')) {
                    next = { row: next.row, col: next.col - 1 };
                    prev = prev.col > 0 ? { row: prev.row, col: prev.col - 1 } : null;
                } else {
                    next = { row: next.row, col: next.col + 1 };
                    prev = prev.col < lastCol ? { row: prev.row, col: prev.col + 1 } : null;
                }
            }

            return { folderUp, prev, next };
        },

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
                this.preloadPreviewIcons();
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

        /**
         * Calculate which page an ungrouped entity will be on
         * Accounts for folder buttons and nav buttons taking slots
         */
        getEntityPageNumber(ungroupedIndex) {
            const groups = this.wizardSelections.groups || [];
            const folderCount = groups.filter(g => g.displayType === 'folder').length;
            const flatCount = groups.filter(g => g.displayType === 'flat')
                .reduce((sum, g) => sum + g.entities.length, 0);

            const cellsPerPage = this.deviceSize.cols * this.deviceSize.rows;
            // Reserve 1 slot for nav on main page (->), 2 for overflow pages (<- ->)
            const mainAvailable = cellsPerPage - 1 - folderCount - flatCount;
            const overflowAvailable = cellsPerPage - 2;

            if (ungroupedIndex < mainAvailable) {
                return 1; // Main page
            }

            const remaining = ungroupedIndex - mainAvailable;
            return 2 + Math.floor(remaining / overflowAvailable);
        },

        // ========== Label Helpers ==========

        /**
         * Build a deck-assistant label string from hierarchy array
         */
        buildLabelString(hierarchy) {
            return 'deck-assistant:' + hierarchy.join(':');
        },

        /**
         * Parse a deck-assistant label into hierarchy array
         */
        parseLabelHierarchy(label) {
            if (!label.startsWith('deck-assistant:')) return [];
            return label.substring('deck-assistant:'.length).split(':');
        },

        /**
         * Get existing label assignments for an entity
         */
        getEntityLabels(entityId) {
            const entry = this.entitiesWithLabels.find(e => e.entity_id === entityId);
            return entry ? entry.labels : [];
        },

        /**
         * Create a label in Home Assistant
         */
        createLabel(labelName) {
            this.sendToPlugin({
                event: 'createLabel',
                name: labelName
            });
        },

        /**
         * Assign labels to an entity
         */
        assignLabelsToEntity(entityId, labelIds) {
            this.sendToPlugin({
                event: 'assignLabels',
                entityId: entityId,
                labelIds: labelIds
            });
        },

        // ========== Style Editor ==========

        /**
         * Computed style for the preview grid
         */
        get previewGridStyle() {
            return {
                display: 'grid',
                gridTemplateColumns: `repeat(${this.deviceSize.cols}, 72px)`,
                gridTemplateRows: `repeat(${this.deviceSize.rows}, 72px)`,
                gap: '4px'
            };
        },

        /**
         * Toggle group expanded state
         */
        toggleGroupExpanded(index) {
            if (this.wizardSelections.groups[index]) {
                this.wizardSelections.groups[index].expanded = !this.wizardSelections.groups[index].expanded;
            }
        },

        /**
         * Get style for a group, creating default if not exists
         */
        getGroupStyle(groupName) {
            const style = this.groupStyles[groupName];
            if (style) return style;
            return {
                background: '#1a1a2e',
                onOff: '#4CAF50',
                information: '#2196F3',
                trigger: '#FF9800'
            };
        },

        /**
         * Set a style property for a group
         */
        setGroupStyleProp(groupName, prop, value) {
            if (!this.groupStyles[groupName]) {
                this.groupStyles[groupName] = this.getGroupStyle(groupName);
            }
            this.groupStyles[groupName][prop] = value;
        },

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
         * Handle preview button click for navigation
         */
        handlePreviewNavigation(button) {
            if (!button || !button.type) return;

            if (button.type === 'nav-next') {
                // Find next page in linear sequence
                const currentPage = this.previewPages[this.currentPreviewPageIndex];
                if (!currentPage) return;

                // For folder sub-pages, navigate within folder
                if (currentPage.type === 'folder-sub') {
                    const folderPages = this.previewPages.filter(p =>
                        p.type === 'folder-sub' && p.groupName === currentPage.groupName
                    );
                    const currentFolderIndex = folderPages.indexOf(currentPage);
                    if (currentFolderIndex < folderPages.length - 1) {
                        this.currentPreviewPageIndex = this.previewPages.indexOf(folderPages[currentFolderIndex + 1]);
                    }
                } else {
                    // Linear navigation
                    if (this.currentPreviewPageIndex < this.previewPages.length - 1) {
                        // Skip folder sub-pages
                        let nextIndex = this.currentPreviewPageIndex + 1;
                        while (nextIndex < this.previewPages.length &&
                               this.previewPages[nextIndex].type === 'folder-sub') {
                            nextIndex++;
                        }
                        if (nextIndex < this.previewPages.length) {
                            this.currentPreviewPageIndex = nextIndex;
                        }
                    }
                }
                this.preloadPreviewIcons();
            } else if (button.type === 'nav-prev') {
                const currentPage = this.previewPages[this.currentPreviewPageIndex];
                if (!currentPage) return;

                // For folder sub-pages, navigate within folder
                if (currentPage.type === 'folder-sub') {
                    const folderPages = this.previewPages.filter(p =>
                        p.type === 'folder-sub' && p.groupName === currentPage.groupName
                    );
                    const currentFolderIndex = folderPages.indexOf(currentPage);
                    if (currentFolderIndex > 0) {
                        this.currentPreviewPageIndex = this.previewPages.indexOf(folderPages[currentFolderIndex - 1]);
                    }
                } else {
                    // Linear navigation - go back skipping folder sub-pages
                    let prevIndex = this.currentPreviewPageIndex - 1;
                    while (prevIndex >= 0 && this.previewPages[prevIndex].type === 'folder-sub') {
                        prevIndex--;
                    }
                    if (prevIndex >= 0) {
                        this.currentPreviewPageIndex = prevIndex;
                    }
                }
                this.preloadPreviewIcons();
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
                            backgroundColor: cell.style?.background || this.ungroupedStyle.background,
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

        /**
         * Get empty preview buttons
         */
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

        /**
         * OLD Get buttons to display in preview based on current page (kept for reference)
         */
        getPreviewButtonsOld() {
            const buttons = [];
            const totalCells = this.deviceSize.cols * this.deviceSize.rows;

            if (this.previewPage === 'main') {
                // Main page: show folders for groups + ungrouped entities
                const groups = this.wizardSelections.groups || [];
                const ungrouped = this.wizardSelections.ungroupedEntities || [];

                // Add folder buttons for groups (except flat ones which show entities directly)
                for (const group of groups) {
                    if (group.displayType === 'folder') {
                        const style = this.getGroupStyle(group.name);
                        buttons.push({
                            type: 'folder',
                            label: group.name,
                            icon: 'mdi:folder',
                            groupName: group.name,
                            backgroundColor: style.background,
                            iconColor: '#FFFFFF',
                            textColor: '#FFFFFF'
                        });
                    } else if (group.displayType === 'flat') {
                        // Flat groups show entities on main page
                        const style = this.getGroupStyle(group.name);
                        for (const entityId of group.entities) {
                            const entity = this.getEntityById(entityId);
                            if (entity) {
                                buttons.push({
                                    type: 'entity',
                                    label: this.getEntityLabel(entity),
                                    icon: this.getEntityIconName(entity),
                                    entityId: entityId,
                                    backgroundColor: style.background,
                                    iconColor: this.getEntityCategoryColor(entity, style),
                                    textColor: '#FFFFFF'
                                });
                            }
                        }
                    }
                    // 'page' type groups don't show on main page
                }

                // Add ungrouped entities
                for (const entityId of ungrouped) {
                    const entity = this.getEntityById(entityId);
                    if (entity) {
                        buttons.push({
                            type: 'entity',
                            label: this.getEntityLabel(entity),
                            icon: this.getEntityIconName(entity),
                            entityId: entityId,
                            backgroundColor: this.ungroupedStyle.background,
                            iconColor: this.getEntityCategoryColor(entity, this.ungroupedStyle),
                            textColor: '#FFFFFF'
                        });
                    }
                }
            } else {
                // Sub-page: show entities for the selected group
                const group = this.wizardSelections.groups.find(g => g.name === this.previewPage);
                if (group) {
                    const style = this.getGroupStyle(group.name);
                    for (const entityId of group.entities) {
                        const entity = this.getEntityById(entityId);
                        if (entity) {
                            buttons.push({
                                type: 'entity',
                                label: this.getEntityLabel(entity),
                                icon: this.getEntityIconName(entity),
                                entityId: entityId,
                                backgroundColor: style.background,
                                iconColor: this.getEntityCategoryColor(entity, style),
                                textColor: '#FFFFFF'
                            });
                        }
                    }
                }

                // Add back button
                const preset = this.themePresets[this.currentPreset];
                buttons.push({
                    type: 'back',
                    label: 'Back',
                    icon: 'mdi:arrow-left',
                    backgroundColor: preset.background,
                    iconColor: '#FFFFFF',
                    textColor: '#FFFFFF'
                });
            }

            // Pad with empty cells to fill the grid
            while (buttons.length < totalCells) {
                buttons.push({
                    type: 'empty',
                    label: '',
                    icon: '',
                    backgroundColor: '#2a2a2a',
                    iconColor: '#666',
                    textColor: '#666'
                });
            }

            // Truncate if too many
            return buttons.slice(0, totalCells);
        },

        /**
         * Get style for a preview button
         */
        getPreviewButtonStyle(button) {
            const isClickable = ['folder', 'folder-up', 'nav-prev', 'nav-next', 'back'].includes(button.type);
            return {
                backgroundColor: button.backgroundColor,
                cursor: isClickable ? 'pointer' : 'default'
            };
        },

        /**
         * Handle click on a preview button
         */
        handlePreviewButtonClick(button) {
            // Handle navigation button types
            if (['folder', 'folder-up', 'nav-prev', 'nav-next'].includes(button.type)) {
                this.handlePreviewNavigation(button);
                return;
            }
            // Legacy back button support
            if (button.type === 'back') {
                this.previewPage = 'main';
                this.preloadPreviewIcons();
            }
        },

        /**
         * Preload icons for all buttons in the current preview
         */
        preloadPreviewIcons() {
            const buttons = this.getPreviewButtons();
            for (const button of buttons) {
                if (button.icon && button.icon.startsWith('mdi:')) {
                    this.loadIcon(button.icon);
                }
            }
        },

        /**
         * Apply a theme preset to a specific group
         */
        applyPreset(presetName, groupName) {
            const preset = this.themePresets[presetName];
            if (!preset) return;

            if (groupName === 'ungrouped') {
                this.ungroupedStyle = {
                    background: preset.background,
                    onOff: preset.onOff,
                    information: preset.information,
                    trigger: preset.trigger
                };
            } else {
                this.groupStyles[groupName] = {
                    background: preset.background,
                    onOff: preset.onOff,
                    information: preset.information,
                    trigger: preset.trigger
                };
            }
        }
    };
}
