/**
 * Entity Button Property Inspector
 * Handles configuration UI for the Entity Button action
 */

// Global variables for Stream Deck connection
let websocket = null;
let uuid = null;
let actionInfo = null;
let settings = {};
let globalSettings = {};

// Entity and area data
let allEntities = [];
let allAreas = [];
let isConnected = false;

// DOM elements (cached after load)
let elements = {};

/**
 * Initialize the Property Inspector when the page loads
 */
document.addEventListener("DOMContentLoaded", function() {
    cacheElements();
    setupEventListeners();
});

/**
 * Cache DOM elements for performance
 */
function cacheElements() {
    elements = {
        // Connection section
        connectionSetup: document.getElementById("connection-setup"),
        haUrl: document.getElementById("ha-url"),
        haToken: document.getElementById("ha-token"),
        connectBtn: document.getElementById("connect-btn"),
        connectionError: document.getElementById("connection-error"),

        // Entity section
        entitySetup: document.getElementById("entity-setup"),
        statusIndicator: document.getElementById("status-indicator"),
        statusText: document.getElementById("status-text"),
        editConnection: document.getElementById("edit-connection"),

        // Filters
        searchFilter: document.getElementById("search-filter"),
        areaFilter: document.getElementById("area-filter"),
        domainFilter: document.getElementById("domain-filter"),

        // Entity selection
        entitySelect: document.getElementById("entity-select"),
        entityCount: document.getElementById("entity-count"),
        actionSelect: document.getElementById("action-select"),

        // Custom service
        customServiceSection: document.getElementById("custom-service-section"),
        serviceDomain: document.getElementById("service-domain"),
        serviceName: document.getElementById("service-name"),
        serviceData: document.getElementById("service-data")
    };
}

/**
 * Set up event listeners for UI interactions
 */
function setupEventListeners() {
    // Connect button
    elements.connectBtn.addEventListener("click", handleConnect);

    // Edit connection link
    elements.editConnection.addEventListener("click", function(e) {
        e.preventDefault();
        showConnectionSetup();
    });

    // Filter changes
    elements.searchFilter.addEventListener("input", debounce(filterEntities, 150));
    elements.areaFilter.addEventListener("change", filterEntities);
    elements.domainFilter.addEventListener("change", filterEntities);

    // Entity selection
    elements.entitySelect.addEventListener("change", function() {
        settings.entityId = this.value;
        saveSettings();
    });

    // Action selection
    elements.actionSelect.addEventListener("change", function() {
        settings.action = this.value;
        toggleCustomServiceSection();
        saveSettings();
    });

    // Custom service fields
    elements.serviceDomain.addEventListener("change", saveServiceData);
    elements.serviceName.addEventListener("change", saveServiceData);
    elements.serviceData.addEventListener("change", saveServiceData);
}

/**
 * Stream Deck SDK connection function
 * Called automatically by Stream Deck when the PI loads
 */
function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
    uuid = inPropertyInspectorUUID;
    actionInfo = JSON.parse(inActionInfo);
    settings = actionInfo.payload.settings || {};

    // Connect to Stream Deck
    websocket = new WebSocket("ws://127.0.0.1:" + inPort);

    websocket.onopen = function() {
        // Register the Property Inspector
        const registerMessage = {
            event: inRegisterEvent,
            uuid: uuid
        };
        websocket.send(JSON.stringify(registerMessage));

        // Request global settings
        const getGlobalSettingsMessage = {
            event: "getGlobalSettings",
            context: uuid
        };
        websocket.send(JSON.stringify(getGlobalSettingsMessage));
    };

    websocket.onmessage = function(evt) {
        const message = JSON.parse(evt.data);
        handleMessage(message);
    };

    websocket.onerror = function(error) {
        console.error("WebSocket error:", error);
    };

    websocket.onclose = function() {
        console.log("WebSocket connection closed");
    };
}

/**
 * Handle incoming messages from Stream Deck
 */
function handleMessage(message) {
    switch (message.event) {
        case "didReceiveGlobalSettings":
            globalSettings = message.payload.settings || {};
            handleGlobalSettings();
            break;

        case "didReceiveSettings":
            settings = message.payload.settings || {};
            loadSettings();
            break;

        case "sendToPropertyInspector":
            handlePluginMessage(message.payload);
            break;
    }
}

/**
 * Handle global settings received from Stream Deck
 */
function handleGlobalSettings() {
    // Populate connection fields with saved values
    if (globalSettings.haUrl) {
        elements.haUrl.value = globalSettings.haUrl;
    }
    if (globalSettings.haToken) {
        elements.haToken.value = globalSettings.haToken;
    }

    // Check if we have credentials, then ask plugin for connection status
    if (globalSettings.haUrl && globalSettings.haToken) {
        sendToPlugin({ event: "connect" });
    } else {
        showConnectionSetup();
    }
}

/**
 * Handle messages from the plugin
 */
function handlePluginMessage(payload) {
    switch (payload.event) {
        case "connectionStatus":
            handleConnectionStatus(payload);
            break;

        case "entities":
            handleEntitiesReceived(payload);
            break;
    }
}

/**
 * Handle connection status update from plugin
 */
function handleConnectionStatus(payload) {
    isConnected = payload.connected;

    if (isConnected) {
        showEntitySetup();
        updateConnectionIndicator(true);
    } else {
        showConnectionSetup();
        if (payload.error) {
            showError(payload.error);
        }
    }
}

/**
 * Handle entities received from plugin
 */
function handleEntitiesReceived(payload) {
    allEntities = payload.entities || [];
    allAreas = payload.areas || [];

    populateAreaDropdown();
    filterEntities();
    loadSettings();
}

/**
 * Handle connect button click
 */
function handleConnect() {
    const url = elements.haUrl.value.trim();
    const token = elements.haToken.value.trim();

    if (!url || !token) {
        showError("Please enter both URL and access token");
        return;
    }

    // Validate URL format
    if (!isValidUrl(url)) {
        showError("Please enter a valid URL (e.g., http://192.168.1.254:8123)");
        return;
    }

    hideError();
    updateConnectionIndicator("connecting");

    // Save global settings
    globalSettings.haUrl = url;
    globalSettings.haToken = token;
    saveGlobalSettings();

    // Tell plugin to connect
    sendToPlugin({ event: "connect" });
}

/**
 * Save settings to Stream Deck
 */
function saveSettings() {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
    }

    const message = {
        event: "setSettings",
        context: uuid,
        payload: settings
    };
    websocket.send(JSON.stringify(message));
}

/**
 * Save global settings to Stream Deck
 */
function saveGlobalSettings() {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
    }

    const message = {
        event: "setGlobalSettings",
        context: uuid,
        payload: globalSettings
    };
    websocket.send(JSON.stringify(message));
}

/**
 * Send message to plugin
 */
function sendToPlugin(payload) {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
    }

    const message = {
        event: "sendToPlugin",
        action: actionInfo.action,
        context: uuid,
        payload: payload
    };
    websocket.send(JSON.stringify(message));
}

/**
 * Load settings into UI
 */
function loadSettings() {
    // Entity selection
    if (settings.entityId) {
        elements.entitySelect.value = settings.entityId;
    }

    // Action selection
    if (settings.action) {
        elements.actionSelect.value = settings.action;
        toggleCustomServiceSection();
    }

    // Custom service data
    if (settings.serviceData) {
        elements.serviceDomain.value = settings.serviceData.domain || "";
        elements.serviceName.value = settings.serviceData.service || "";
        if (settings.serviceData.data) {
            elements.serviceData.value = JSON.stringify(settings.serviceData.data, null, 2);
        }
    }
}

/**
 * Save service data settings
 */
function saveServiceData() {
    const domain = elements.serviceDomain.value.trim();
    const service = elements.serviceName.value.trim();
    let data = null;

    const dataText = elements.serviceData.value.trim();
    if (dataText) {
        try {
            data = JSON.parse(dataText);
        } catch (e) {
            // Invalid JSON, ignore for now
            console.warn("Invalid JSON in service data:", e);
        }
    }

    settings.serviceData = {
        domain: domain,
        service: service,
        data: data
    };
    saveSettings();
}

/**
 * Toggle custom service section visibility
 */
function toggleCustomServiceSection() {
    const isCustomService = settings.action === "call_service";
    elements.customServiceSection.style.display = isCustomService ? "block" : "none";
}

/**
 * Populate area dropdown with available areas
 */
function populateAreaDropdown() {
    // Clear existing options except first
    while (elements.areaFilter.options.length > 1) {
        elements.areaFilter.remove(1);
    }

    // Sort areas alphabetically
    const sortedAreas = [...allAreas].sort((a, b) => a.name.localeCompare(b.name));

    // Add area options
    sortedAreas.forEach(function(area) {
        const option = document.createElement("option");
        option.value = area.area_id;
        option.textContent = area.name;
        elements.areaFilter.appendChild(option);
    });
}

/**
 * Filter entities based on current filter values
 */
function filterEntities() {
    const searchTerm = elements.searchFilter.value.toLowerCase().trim();
    const selectedArea = elements.areaFilter.value;
    const selectedDomain = elements.domainFilter.value;

    // Filter entities
    const filteredEntities = allEntities.filter(function(entity) {
        // Search filter (matches entity_id or friendly_name)
        if (searchTerm) {
            const name = (entity.friendly_name || "").toLowerCase();
            const id = entity.entity_id.toLowerCase();
            if (!name.includes(searchTerm) && !id.includes(searchTerm)) {
                return false;
            }
        }

        // Area filter
        if (selectedArea && entity.area_id !== selectedArea) {
            return false;
        }

        // Domain filter
        if (selectedDomain && entity.domain !== selectedDomain) {
            return false;
        }

        return true;
    });

    // Update entity dropdown
    populateEntityDropdown(filteredEntities);

    // Update count
    elements.entityCount.textContent = "(" + filteredEntities.length + ")";
}

/**
 * Populate entity dropdown with filtered entities
 */
function populateEntityDropdown(entities) {
    // Remember current selection
    const currentValue = elements.entitySelect.value || settings.entityId;

    // Clear existing options except first
    while (elements.entitySelect.options.length > 1) {
        elements.entitySelect.remove(1);
    }

    // Sort entities by friendly name
    const sortedEntities = [...entities].sort(function(a, b) {
        const nameA = a.friendly_name || a.entity_id;
        const nameB = b.friendly_name || b.entity_id;
        return nameA.localeCompare(nameB);
    });

    // Add entity options
    sortedEntities.forEach(function(entity) {
        const option = document.createElement("option");
        option.value = entity.entity_id;

        // Build display text: friendly_name (entity_id) [state]
        let displayText = entity.friendly_name || entity.entity_id;
        if (entity.friendly_name && entity.friendly_name !== entity.entity_id) {
            displayText += " (" + entity.entity_id.split(".")[1] + ")";
        }
        if (entity.state) {
            displayText += " [" + entity.state + "]";
        }

        option.textContent = displayText;
        elements.entitySelect.appendChild(option);
    });

    // Restore selection if still available
    if (currentValue) {
        elements.entitySelect.value = currentValue;
        // If value wasn't found, it will be empty string which is fine
    }
}

/**
 * Show connection setup section
 */
function showConnectionSetup() {
    elements.connectionSetup.style.display = "block";
    elements.entitySetup.style.display = "none";
}

/**
 * Show entity setup section
 */
function showEntitySetup() {
    elements.connectionSetup.style.display = "none";
    elements.entitySetup.style.display = "block";
}

/**
 * Update connection status indicator
 */
function updateConnectionIndicator(status) {
    const indicator = elements.statusIndicator;
    const text = elements.statusText;

    indicator.classList.remove("connected", "disconnected", "connecting");

    if (status === true || status === "connected") {
        indicator.classList.add("connected");
        text.textContent = "Connected";
    } else if (status === "connecting") {
        indicator.classList.add("connecting");
        text.textContent = "Connecting...";
    } else {
        indicator.classList.add("disconnected");
        text.textContent = "Disconnected";
    }
}

/**
 * Show error message
 */
function showError(message) {
    elements.connectionError.textContent = message;
    elements.connectionError.classList.add("visible");
}

/**
 * Hide error message
 */
function hideError() {
    elements.connectionError.classList.remove("visible");
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

/**
 * Debounce function for performance
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}
