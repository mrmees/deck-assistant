/**
 * Settings Property Inspector
 * Handles plugin configuration UI
 */

// Global variables for Stream Deck connection
let websocket = null;
let uuid = null;
let actionInfo = null;
let globalSettings = {};

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
        statusIndicator: document.getElementById("status-indicator"),
        statusText: document.getElementById("status-text"),
        haUrl: document.getElementById("ha-url"),
        haToken: document.getElementById("ha-token"),
        connectBtn: document.getElementById("connect-btn"),
        disconnectBtn: document.getElementById("disconnect-btn"),
        connectionError: document.getElementById("connection-error"),
        disableSdTitles: document.getElementById("disable-sd-titles")
    };
}

/**
 * Set up event listeners for UI interactions
 */
function setupEventListeners() {
    elements.connectBtn.addEventListener("click", handleConnect);
    elements.disconnectBtn.addEventListener("click", handleDisconnect);

    // Display options
    elements.disableSdTitles.addEventListener("change", function() {
        globalSettings.disableSdTitles = this.checked;
        saveGlobalSettings();
    });
}

/**
 * Stream Deck SDK connection function
 * Called automatically by Stream Deck when the PI loads
 */
function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
    uuid = inPropertyInspectorUUID;
    actionInfo = JSON.parse(inActionInfo);

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

    // Display options
    elements.disableSdTitles.checked = globalSettings.disableSdTitles || false;

    // Request current connection status from plugin
    sendToPlugin({ event: "getStatus" });
}

/**
 * Handle messages from the plugin
 */
function handlePluginMessage(payload) {
    switch (payload.event) {
        case "connectionStatus":
            updateConnectionStatus(payload.connected, payload.error);
            break;
    }
}

/**
 * Update the connection status display
 */
function updateConnectionStatus(connected, error) {
    const indicator = elements.statusIndicator;
    const text = elements.statusText;

    indicator.classList.remove("connected", "disconnected", "connecting");

    if (connected) {
        indicator.classList.add("connected");
        text.textContent = "Connected";
        elements.connectBtn.style.display = "none";
        elements.disconnectBtn.style.display = "inline-block";
        hideError();
    } else {
        indicator.classList.add("disconnected");
        text.textContent = "Disconnected";
        elements.connectBtn.style.display = "inline-block";
        elements.disconnectBtn.style.display = "none";
        if (error) {
            showError(error);
        }
    }
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
    updateConnectionStatus("connecting");
    elements.statusIndicator.classList.remove("connected", "disconnected");
    elements.statusIndicator.classList.add("connecting");
    elements.statusText.textContent = "Connecting...";

    // Save global settings
    globalSettings.haUrl = url;
    globalSettings.haToken = token;
    saveGlobalSettings();

    // Tell plugin to connect
    sendToPlugin({ event: "connect" });
}

/**
 * Handle disconnect button click
 */
function handleDisconnect() {
    sendToPlugin({ event: "disconnect" });
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
