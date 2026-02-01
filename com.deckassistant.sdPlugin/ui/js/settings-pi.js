/**
 * Settings Property Inspector
 * Handles plugin configuration UI
 */

// Global variables for Stream Deck connection
let websocket = null;
let uuid = null;
let actionInfo = null;
let globalSettings = {};

// Store connection parameters for opening editor
let connectionParams = {
    port: null,
    registerEvent: null
};

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
        disableSdTitles: document.getElementById("disable-sd-titles"),
        openEditorBtn: document.getElementById("open-editor-btn"),
        editorWindowSize: document.getElementById("editor-window-size"),
        windowSizeMessage: document.getElementById("window-size-message")
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

    // Layout editor
    elements.openEditorBtn.addEventListener("click", openStyleEditor);

    // Editor window size
    elements.editorWindowSize.addEventListener("change", handleWindowSizeChange);
}

/**
 * Handle editor window size change
 */
function handleWindowSizeChange() {
    const sizeValue = elements.editorWindowSize.value;
    const [width, height] = sizeValue.split("x").map(Number);

    // Save preference to global settings
    globalSettings.editorWindowSize = sizeValue;
    saveGlobalSettings();

    // Tell plugin to update the manifest
    sendToPlugin({
        event: "updateWindowSize",
        width: width,
        height: height
    });

    // Show confirmation message
    elements.windowSizeMessage.style.display = "block";
}

// Reference to the Style Editor window
let styleEditorWindow = null;

/**
 * Open the style editor in a new window
 */
function openStyleEditor() {
    if (!connectionParams.port) {
        showError("Connection parameters not available");
        return;
    }

    // Build the editor URL
    const editorUrl = new URL("layout-editor.html", window.location.href);

    // Open in a new window (larger size for style editing)
    styleEditorWindow = window.open(editorUrl.toString(), "DeckAssistantStyleEditor", "width=1600,height=1000,menubar=no,toolbar=no,resizable=yes");

    // Listen for messages from the Style Editor
    window.addEventListener("message", handleStyleEditorMessage);
}

/**
 * Handle messages from the Style Editor window
 */
function handleStyleEditorMessage(event) {
    const message = event.data;
    if (!message || !message.type) {
        return;
    }

    // Only handle messages from our Style Editor
    if (message.type === "styleEditorReady") {
        console.log("Style Editor ready, sending connection info");
        // Style Editor is ready, send connection status
        if (styleEditorWindow && !styleEditorWindow.closed) {
            styleEditorWindow.postMessage({
                type: "connectionInfo",
                connected: websocket && websocket.readyState === WebSocket.OPEN,
                haConnected: true
            }, "*");
        }
    } else if (message.type === "sendToPlugin") {
        console.log("Forwarding to plugin:", message.payload);
        // Forward message to plugin
        sendToPlugin(message.payload);
    }
}

/**
 * Forward plugin responses to Style Editor
 */
function forwardToStyleEditor(payload) {
    if (styleEditorWindow && !styleEditorWindow.closed) {
        styleEditorWindow.postMessage({
            type: "pluginMessage",
            payload: payload
        }, "*");
    }
}

/**
 * Stream Deck SDK connection function
 * Called automatically by Stream Deck when the PI loads
 */
function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
    uuid = inPropertyInspectorUUID;
    actionInfo = JSON.parse(inActionInfo);

    // Store connection parameters for editor
    connectionParams.port = inPort;
    connectionParams.registerEvent = inRegisterEvent;

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

    // Editor window size
    if (globalSettings.editorWindowSize) {
        elements.editorWindowSize.value = globalSettings.editorWindowSize;
    }

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

        // Forward Style Editor related messages
        case "deviceInfo":
        case "entitiesData":
        case "areasData":
        case "floorsData":
        case "labelsData":
        case "dashboardEntitiesData":
        case "dashboardsData":
        case "fullRegistryData":
        case "profileGenerated":
        case "labelsSynced":
        case "labelCreated":
        case "labelsAssigned":
        case "error":
            forwardToStyleEditor(payload);
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
