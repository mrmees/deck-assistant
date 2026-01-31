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

// Entity, device, and area data
let allEntities = [];
let allDevices = [];
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
        // Not connected section
        notConnected: document.getElementById("not-connected"),

        // Main content (tabs container)
        mainContent: document.getElementById("main-content"),

        // Tab elements
        tabButtons: document.querySelectorAll(".tab-button"),
        tabEntity: document.getElementById("tab-entity"),
        tabAppearance: document.getElementById("tab-appearance"),

        // Connection status
        statusIndicator: document.getElementById("status-indicator"),
        statusText: document.getElementById("status-text"),

        // Filters
        searchFilter: document.getElementById("search-filter"),
        filterToggle: document.getElementById("filter-toggle"),
        filterSection: document.getElementById("filter-section"),
        filterBadge: document.getElementById("filter-badge"),
        areaFilter: document.getElementById("area-filter"),
        domainFilter: document.getElementById("domain-filter"),
        clearFilters: document.getElementById("clear-filters"),
        activeFilters: document.getElementById("active-filters"),

        // Device and entity selection
        deviceSelect: document.getElementById("device-select"),
        deviceCount: document.getElementById("device-count"),
        entitySelect: document.getElementById("entity-select"),
        entityCount: document.getElementById("entity-count"),
        actionSelect: document.getElementById("action-select"),

        // Custom service
        customServiceSection: document.getElementById("custom-service-section"),
        serviceDomain: document.getElementById("service-domain"),
        serviceName: document.getElementById("service-name"),
        serviceData: document.getElementById("service-data"),

        // Appearance - Icon
        iconSource: document.getElementById("icon-source"),
        mdiIconField: document.getElementById("mdi-icon-field"),
        mdiIcon: document.getElementById("mdi-icon"),
        iconPickerSelected: document.getElementById("icon-picker-selected"),
        iconPickerPreview: document.getElementById("icon-picker-preview"),
        iconPickerDropdown: document.getElementById("icon-picker-dropdown"),
        iconPickerList: document.getElementById("icon-picker-list"),
        iconColorOn: document.getElementById("icon-color-on"),
        iconColorOnText: document.getElementById("icon-color-on-text"),
        iconColorOff: document.getElementById("icon-color-off"),
        iconColorOffText: document.getElementById("icon-color-off-text"),

        // Appearance - Title
        titleSection: document.getElementById("title-section"),
        showTitle: document.getElementById("show-title"),
        titleOptions: document.getElementById("title-options"),
        titleOverride: document.getElementById("title-override"),
        titlePosition: document.getElementById("title-position"),

        // Appearance - State
        showState: document.getElementById("show-state"),
        stateOptions: document.getElementById("state-options"),
        statePosition: document.getElementById("state-position"),

        // Appearance - Background
        backgroundColor: document.getElementById("background-color"),
        backgroundColorText: document.getElementById("background-color-text")
    };
}

/**
 * Set up event listeners for UI interactions
 */
function setupEventListeners() {
    // Tab switching
    elements.tabButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            switchTab(this.getAttribute("data-tab"));
        });
    });

    // Filter toggle button
    elements.filterToggle.addEventListener("click", toggleFilterSection);

    // Clear filters button
    elements.clearFilters.addEventListener("click", clearAllFilters);

    // Filter changes
    elements.searchFilter.addEventListener("input", debounce(function() {
        filterDevices();
    }, 150));
    elements.areaFilter.addEventListener("change", function() {
        filterDevices();
        updateActiveFilters();
    });
    elements.domainFilter.addEventListener("change", function() {
        filterDevices();
        updateActiveFilters();
    });

    // Device selection
    elements.deviceSelect.addEventListener("change", function() {
        populateEntityDropdownForDevice(this.value);
    });

    // Entity selection - also auto-select the device
    elements.entitySelect.addEventListener("change", function() {
        settings.entityId = this.value;

        // Auto-select the device for this entity
        if (this.value) {
            const entity = allEntities.find(function(e) {
                return e.entity_id === settings.entityId;
            });
            if (entity) {
                const deviceId = entity.device_id || "__standalone__";
                if (elements.deviceSelect.value !== deviceId) {
                    elements.deviceSelect.value = deviceId;
                }
            }
        }

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

    // Appearance - Icon source
    elements.iconSource.addEventListener("change", function() {
        settings.appearance.iconSource = this.value;
        toggleMdiIconField();
        saveSettings();
    });

    // Icon picker setup
    setupIconPicker();

    // Appearance - Icon colors
    setupColorInput(elements.iconColorOn, elements.iconColorOnText, function(color) {
        settings.appearance.iconColorOn = color;
        saveSettings();
    });

    setupColorInput(elements.iconColorOff, elements.iconColorOffText, function(color) {
        settings.appearance.iconColorOff = color;
        saveSettings();
    });

    // Appearance - Title
    elements.showTitle.addEventListener("change", function() {
        settings.appearance.showTitle = this.checked;
        toggleTitleOptions();
        saveSettings();
    });

    elements.titleOverride.addEventListener("change", function() {
        settings.appearance.titleOverride = this.value.trim() || undefined;
        saveSettings();
    });

    elements.titlePosition.addEventListener("change", function() {
        settings.appearance.titlePosition = this.value;
        saveSettings();
    });

    // Appearance - State
    elements.showState.addEventListener("change", function() {
        settings.appearance.showState = this.checked;
        toggleStateOptions();
        saveSettings();
    });

    elements.statePosition.addEventListener("change", function() {
        settings.appearance.statePosition = this.value;
        saveSettings();
    });

    // Appearance - Background
    setupColorInput(elements.backgroundColor, elements.backgroundColorText, function(color) {
        settings.appearance.backgroundColor = color;
        saveSettings();
    });
}

/**
 * Set up linked color picker and text input
 */
function setupColorInput(colorInput, textInput, onChange) {
    colorInput.addEventListener("input", function() {
        textInput.value = this.value.toUpperCase();
        onChange(this.value);
    });

    textInput.addEventListener("change", function() {
        const color = this.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            colorInput.value = color;
            this.value = color.toUpperCase();
            onChange(color);
        } else {
            // Invalid color, revert to color picker value
            this.value = colorInput.value.toUpperCase();
        }
    });
}

/**
 * Switch to a different tab
 */
function switchTab(tabName) {
    // Update tab buttons
    elements.tabButtons.forEach(function(button) {
        if (button.getAttribute("data-tab") === tabName) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    });

    // Update tab content
    elements.tabEntity.classList.toggle("active", tabName === "entity");
    elements.tabAppearance.classList.toggle("active", tabName === "appearance");
}

/**
 * Toggle MDI icon field visibility
 */
function toggleMdiIconField() {
    const show = elements.iconSource.value === "mdi";
    elements.mdiIconField.style.display = show ? "block" : "none";
    if (show) {
        populateIconList("");
    }
}

/**
 * Set up the icon picker dropdown
 */
function setupIconPicker() {
    // Toggle dropdown on click
    elements.iconPickerSelected.addEventListener("click", function(e) {
        // Don't toggle if clicking on the input
        if (e.target === elements.mdiIcon) {
            openIconDropdown();
            return;
        }
        toggleIconDropdown();
    });

    // Filter icons as user types
    elements.mdiIcon.addEventListener("input", function() {
        openIconDropdown();
        populateIconList(this.value);
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function(e) {
        if (!elements.iconPickerSelected.contains(e.target) &&
            !elements.iconPickerDropdown.contains(e.target)) {
            closeIconDropdown();
        }
    });

    // Handle keyboard navigation
    elements.mdiIcon.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            closeIconDropdown();
        } else if (e.key === "Enter") {
            e.preventDefault();
            // Select first visible item or use typed value
            const firstItem = elements.iconPickerList.querySelector(".icon-picker-item");
            if (firstItem) {
                selectIcon(firstItem.getAttribute("data-icon"));
            } else if (this.value.trim()) {
                selectIcon(this.value.trim());
            }
            closeIconDropdown();
        }
    });

    // Initial population
    populateIconList("");
}

/**
 * Toggle the icon dropdown
 */
function toggleIconDropdown() {
    if (elements.iconPickerDropdown.classList.contains("open")) {
        closeIconDropdown();
    } else {
        openIconDropdown();
    }
}

/**
 * Open the icon dropdown
 */
function openIconDropdown() {
    elements.iconPickerSelected.classList.add("open");
    elements.iconPickerDropdown.classList.add("open");
}

/**
 * Close the icon dropdown
 */
function closeIconDropdown() {
    elements.iconPickerSelected.classList.remove("open");
    elements.iconPickerDropdown.classList.remove("open");
}

/**
 * Populate the icon list based on search term
 */
function populateIconList(searchTerm) {
    const icons = getFilteredIcons(searchTerm);
    const list = elements.iconPickerList;

    if (icons.length === 0) {
        list.innerHTML = '<div class="icon-picker-empty">No icons found. Type any MDI icon name.</div>';
        return;
    }

    list.innerHTML = icons.map(function(icon) {
        const selected = settings.appearance && settings.appearance.mdiIcon === icon.name ? " selected" : "";
        return '<div class="icon-picker-item' + selected + '" data-icon="' + icon.name + '">' +
            '<svg viewBox="0 0 24 24"><path d="' + icon.path + '" fill="currentColor"/></svg>' +
            '<span>' + icon.name + '</span>' +
            '</div>';
    }).join("");

    // Add click handlers
    list.querySelectorAll(".icon-picker-item").forEach(function(item) {
        item.addEventListener("click", function() {
            selectIcon(this.getAttribute("data-icon"));
            closeIconDropdown();
        });
    });
}

/**
 * Select an icon
 */
function selectIcon(iconName) {
    settings.appearance.mdiIcon = iconName;
    elements.mdiIcon.value = iconName;
    updateIconPreview(iconName);
    saveSettings();
}

/**
 * Update the icon preview
 */
function updateIconPreview(iconName) {
    const icon = getIconByName(iconName);
    const preview = elements.iconPickerPreview;
    const path = preview.querySelector("path");

    if (icon) {
        path.setAttribute("d", icon.path);
        preview.classList.add("has-icon");
    } else if (iconName) {
        // Show a placeholder for unknown icons
        path.setAttribute("d", "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z");
        preview.classList.add("has-icon");
    } else {
        path.setAttribute("d", "");
        preview.classList.remove("has-icon");
    }
}

/**
 * Toggle title options visibility
 */
function toggleTitleOptions() {
    elements.titleOptions.style.display = elements.showTitle.checked ? "block" : "none";
}

/**
 * Toggle state options visibility
 */
function toggleStateOptions() {
    elements.stateOptions.style.display = elements.showState.checked ? "block" : "none";
}

/**
 * Toggle the filter section visibility
 */
function toggleFilterSection() {
    const isCollapsed = elements.filterSection.classList.toggle("collapsed");
    elements.filterToggle.classList.toggle("active", !isCollapsed);
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    elements.searchFilter.value = "";
    elements.areaFilter.value = "";
    elements.domainFilter.value = "";
    filterDevices();
    updateActiveFilters();
}

/**
 * Update active filter chips display
 */
function updateActiveFilters() {
    const chips = [];
    const selectedArea = elements.areaFilter.value;
    const selectedDomain = elements.domainFilter.value;

    if (selectedArea) {
        const areaName = elements.areaFilter.options[elements.areaFilter.selectedIndex].text;
        chips.push({ type: "area", value: selectedArea, label: areaName });
    }

    if (selectedDomain) {
        const domainName = elements.domainFilter.options[elements.domainFilter.selectedIndex].text;
        chips.push({ type: "domain", value: selectedDomain, label: domainName });
    }

    // Update filter badge count
    const filterCount = chips.length;
    if (filterCount > 0) {
        elements.filterBadge.textContent = filterCount;
        elements.filterBadge.style.display = "flex";
    } else {
        elements.filterBadge.style.display = "none";
    }

    // Update chips display
    if (chips.length > 0) {
        elements.activeFilters.innerHTML = chips.map(function(chip) {
            return '<span class="filter-chip">' +
                chip.label +
                '<button type="button" class="filter-chip-remove" data-type="' + chip.type + '">&times;</button>' +
                '</span>';
        }).join("");
        elements.activeFilters.style.display = "flex";

        // Add click handlers for chip removal
        elements.activeFilters.querySelectorAll(".filter-chip-remove").forEach(function(btn) {
            btn.addEventListener("click", function() {
                const type = this.getAttribute("data-type");
                if (type === "area") {
                    elements.areaFilter.value = "";
                } else if (type === "domain") {
                    elements.domainFilter.value = "";
                }
                filterEntities();
                updateActiveFilters();
            });
        });
    } else {
        elements.activeFilters.style.display = "none";
    }
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
    // Apply display options
    applyGlobalDisplayOptions();

    // Check if we have credentials, then ask plugin for connection status
    if (globalSettings.haUrl && globalSettings.haToken) {
        sendToPlugin({ event: "connect" });
    } else {
        showNotConnected();
    }
}

/**
 * Apply global display options from settings
 */
function applyGlobalDisplayOptions() {
    console.log("Applying global display options, disableSdTitles:", globalSettings.disableSdTitles);

    // Hide title section if disabled in global settings
    if (elements.titleSection) {
        elements.titleSection.style.display = globalSettings.disableSdTitles ? "none" : "block";
        console.log("Title section display set to:", elements.titleSection.style.display);
    } else {
        console.log("Title section element not found");
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
        showNotConnected();
    }
}

/**
 * Handle entities received from plugin
 */
function handleEntitiesReceived(payload) {
    allEntities = payload.entities || [];
    allDevices = payload.devices || [];
    allAreas = payload.areas || [];

    populateAreaDropdown();
    filterDevices();
    updateActiveFilters();
    loadSettings();
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
    // Initialize appearance settings with defaults if not present
    if (!settings.appearance) {
        settings.appearance = {
            showTitle: true,
            titlePosition: "bottom",
            showState: true,
            statePosition: "top",
            iconSource: "auto",
            iconColorOn: "#FFD700",
            iconColorOff: "#808080",
            backgroundColor: "#1a1a1a"
        };
    }

    // Entity selection - find its device first
    if (settings.entityId) {
        const entity = allEntities.find(function(e) {
            return e.entity_id === settings.entityId;
        });

        if (entity) {
            // Select the device (or standalone)
            const deviceId = entity.device_id || "__standalone__";
            elements.deviceSelect.value = deviceId;

            // Populate entities for that device
            populateEntityDropdownForDevice(deviceId);

            // Select the entity
            elements.entitySelect.value = settings.entityId;
        }
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

    // Load appearance settings
    loadAppearanceSettings();
}

/**
 * Load appearance settings into UI
 */
function loadAppearanceSettings() {
    const appearance = settings.appearance;

    // Icon settings
    elements.iconSource.value = appearance.iconSource || "auto";
    toggleMdiIconField();

    if (appearance.mdiIcon) {
        elements.mdiIcon.value = appearance.mdiIcon;
        updateIconPreview(appearance.mdiIcon);
    } else {
        updateIconPreview("");
    }

    const iconColorOn = appearance.iconColorOn || "#FFD700";
    elements.iconColorOn.value = iconColorOn;
    elements.iconColorOnText.value = iconColorOn.toUpperCase();

    const iconColorOff = appearance.iconColorOff || "#808080";
    elements.iconColorOff.value = iconColorOff;
    elements.iconColorOffText.value = iconColorOff.toUpperCase();

    // Title settings
    elements.showTitle.checked = appearance.showTitle !== false;
    toggleTitleOptions();

    if (appearance.titleOverride) {
        elements.titleOverride.value = appearance.titleOverride;
    }
    elements.titlePosition.value = appearance.titlePosition || "bottom";

    // State settings
    elements.showState.checked = appearance.showState !== false;
    toggleStateOptions();

    elements.statePosition.value = appearance.statePosition || "top";

    // Background settings
    const bgColor = appearance.backgroundColor || "#1a1a1a";
    elements.backgroundColor.value = bgColor;
    elements.backgroundColorText.value = bgColor.toUpperCase();
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
 * Check if all search words match across entity fields
 * Words can match different fields - e.g., "bedroom light" matches area "bedroom" + domain "light"
 */
function entityMatchesSearch(entity, searchWords) {
    if (searchWords.length === 0) return true;

    // Combine all searchable text for this entity
    const searchableText = [
        entity.friendly_name || "",
        entity.entity_id || "",
        entity.device_name || "",
        entity.area_name || "",
        entity.domain || ""
    ].join(" ").toLowerCase();

    // All words must be found somewhere in the combined text
    return searchWords.every(function(word) {
        return searchableText.includes(word);
    });
}

/**
 * Filter devices based on current filter values
 */
function filterDevices() {
    const searchTerm = elements.searchFilter.value.toLowerCase().trim();
    const searchWords = searchTerm ? searchTerm.split(/\s+/) : [];
    const selectedArea = elements.areaFilter.value;
    const selectedDomain = elements.domainFilter.value;

    // First, filter entities to know which devices have matching entities
    const matchingEntityDeviceIds = new Set();
    let hasStandaloneMatches = false;

    allEntities.forEach(function(entity) {
        // Search matches if ALL words are found across entity fields
        const matchesSearch = entityMatchesSearch(entity, searchWords);
        const matchesArea = !selectedArea || entity.area_id === selectedArea;
        const matchesDomain = !selectedDomain || entity.domain === selectedDomain;

        if (matchesSearch && matchesArea && matchesDomain) {
            if (entity.device_id) {
                matchingEntityDeviceIds.add(entity.device_id);
            } else {
                hasStandaloneMatches = true;
            }
        }
    });

    // Filter devices that have matching entities OR match search directly
    const filteredDevices = allDevices.filter(function(device) {
        // Area filter on device
        if (selectedArea && device.area_id !== selectedArea) {
            return false;
        }

        // Device matches if it has matching entities
        const hasMatchingEntities = matchingEntityDeviceIds.has(device.id);

        if (searchWords.length > 0) {
            // Check if all search words match device name or area name
            const deviceSearchText = [
                device.name || "",
                device.area_name || ""
            ].join(" ").toLowerCase();

            const deviceDirectMatch = searchWords.every(function(word) {
                return deviceSearchText.includes(word);
            });

            // Show device if its name/area matches, or if it has matching entities
            return hasMatchingEntities || deviceDirectMatch;
        }

        // No search term - just need matching entities
        return hasMatchingEntities;
    });

    // Update device dropdown
    populateDeviceDropdown(filteredDevices, hasStandaloneMatches);

    // Update device count
    let count = filteredDevices.length;
    if (hasStandaloneMatches) count++;
    elements.deviceCount.textContent = "(" + count + ")";

    // If a device is selected, show entities for that device
    // Otherwise, show ALL matching entities (allows direct entity selection)
    const selectedDevice = elements.deviceSelect.value;
    if (selectedDevice) {
        populateEntityDropdownForDevice(selectedDevice);
    } else {
        // Show all matching entities across all devices
        const allMatchingEntities = allEntities.filter(function(entity) {
            const matchesSearch = entityMatchesSearch(entity, searchWords);
            const matchesArea = !selectedArea || entity.area_id === selectedArea;
            const matchesDomain = !selectedDomain || entity.domain === selectedDomain;
            return matchesSearch && matchesArea && matchesDomain;
        });
        populateEntityDropdown(allMatchingEntities, true); // show device names
        elements.entitySelect.disabled = false;
        elements.entityCount.textContent = "(" + allMatchingEntities.length + ")";
    }
}

/**
 * Populate device dropdown with filtered devices
 */
function populateDeviceDropdown(devices, hasStandalone) {
    const currentValue = elements.deviceSelect.value;

    // Clear and rebuild
    elements.deviceSelect.innerHTML = '<option value="">Select a device...</option>';

    // Sort devices by name
    const sortedDevices = [...devices].sort(function(a, b) {
        return (a.name || "").localeCompare(b.name || "");
    });

    // Add device options first
    sortedDevices.forEach(function(device) {
        const option = document.createElement("option");
        option.value = device.id;

        let displayText = device.name || device.id;
        if (device.area_name) {
            displayText += " (" + device.area_name + ")";
        }
        displayText += " [" + device.entity_count + "]";

        option.textContent = displayText;
        elements.deviceSelect.appendChild(option);
    });

    // Add standalone option at the end
    if (hasStandalone) {
        const option = document.createElement("option");
        option.value = "__standalone__";
        option.textContent = "Helpers & other (no device)";
        elements.deviceSelect.appendChild(option);
    }

    // Restore selection if still available
    if (currentValue) {
        elements.deviceSelect.value = currentValue;
    }
}

/**
 * Populate entity dropdown for selected device
 */
function populateEntityDropdownForDevice(deviceId) {
    const searchTerm = elements.searchFilter.value.toLowerCase().trim();
    const searchWords = searchTerm ? searchTerm.split(/\s+/) : [];
    const selectedArea = elements.areaFilter.value;
    const selectedDomain = elements.domainFilter.value;

    if (!deviceId) {
        elements.entitySelect.innerHTML = '<option value="">Select a device first...</option>';
        elements.entitySelect.disabled = true;
        elements.entityCount.textContent = "(0)";
        return;
    }

    // Filter entities for this device (or standalone)
    const isStandalone = deviceId === "__standalone__";
    const deviceEntities = allEntities.filter(function(entity) {
        // Match device
        if (isStandalone) {
            if (entity.device_id) return false;
        } else {
            if (entity.device_id !== deviceId) return false;
        }

        // Apply search filter using multi-word matching
        if (!entityMatchesSearch(entity, searchWords)) {
            return false;
        }

        if (selectedArea && entity.area_id !== selectedArea) {
            return false;
        }

        if (selectedDomain && entity.domain !== selectedDomain) {
            return false;
        }

        return true;
    });

    // Populate entity dropdown (don't show device name since we're viewing a specific device)
    populateEntityDropdown(deviceEntities, false);
    elements.entitySelect.disabled = false;
    elements.entityCount.textContent = "(" + deviceEntities.length + ")";
}

/**
 * Populate entity dropdown with filtered entities
 * @param {Array} entities - The entities to show
 * @param {boolean} showDevice - Whether to include device name in display (for "all entities" view)
 */
function populateEntityDropdown(entities, showDevice) {
    // Remember current selection
    const currentValue = elements.entitySelect.value || settings.entityId;

    // Clear all options and rebuild from scratch
    elements.entitySelect.innerHTML = '<option value="">Select an entity...</option>';

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
        // Show device name when viewing all entities (helps identify which device)
        if (showDevice && entity.device_name) {
            displayText += " - " + entity.device_name;
        }
        if (entity.state) {
            displayText += " [" + entity.state + "]";
        }

        option.textContent = displayText;
        elements.entitySelect.appendChild(option);
    });

    // Restore selection if still available in the new list
    if (currentValue) {
        const optionExists = sortedEntities.some(function(e) {
            return e.entity_id === currentValue;
        });
        if (optionExists) {
            elements.entitySelect.value = currentValue;
        }
    }
}

/**
 * Show not connected message
 */
function showNotConnected() {
    elements.notConnected.style.display = "block";
    elements.mainContent.style.display = "none";
}

/**
 * Show main content (tabs)
 */
function showEntitySetup() {
    elements.notConnected.style.display = "none";
    elements.mainContent.style.display = "block";

    // Apply global display options (like hiding title section)
    applyGlobalDisplayOptions();
}

/**
 * Update connection status indicator
 */
function updateConnectionIndicator(connected) {
    const indicator = elements.statusIndicator;
    const text = elements.statusText;

    indicator.classList.remove("connected", "disconnected");

    if (connected) {
        indicator.classList.add("connected");
        text.textContent = "Connected";
    } else {
        indicator.classList.add("disconnected");
        text.textContent = "Disconnected";
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
