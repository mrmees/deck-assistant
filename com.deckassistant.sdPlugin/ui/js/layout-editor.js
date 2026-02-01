/**
 * Layout Editor - Alpine.js Component
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

// Domain icons (unicode for display in preview)
const DOMAIN_ICONS = {
    light: '💡',
    switch: '🔌',
    climate: '🌡️',
    media_player: '🎵',
    sensor: '📊',
    cover: '🪟',
    fan: '🌀',
    binary_sensor: '⚡',
    automation: '⚙️',
    script: '📜',
    scene: '🎬',
    input_boolean: '☑️',
    input_number: '🔢',
    input_select: '📋',
    lock: '🔒',
    vacuum: '🧹',
    camera: '📷',
};

function layoutEditor() {
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

        // Wizard state - enhanced
        wizardMode: 'new', // 'new' or 'reconfigure'
        isFirstTimeUser: true,
        wizardComplete: false,
        pendingLabelAssignments: null,

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
            backgroundColor: '#1C1C1C',
            backButtonPosition: 'bottom-right'
        },

        // Wizard
        showWizard: false,
        wizardStep: 0,
        wizardSelections: {
            areas: [],
            domains: [],
            entities: []
        },
        wizardSteps: [
            { title: 'Select Areas', subtitle: 'Which rooms do you want to control?' },
            { title: 'Select Types', subtitle: 'What kinds of devices?' },
            { title: 'Select Entities', subtitle: 'Pick specific entities' }
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
                console.log('Layout Editor received message:', event.data);
                this.handleParentMessage(event.data);
            });

            // Tell parent we're ready
            this.status = 'Connecting to Settings window...';
            this.parentWindow.postMessage({ type: 'layoutEditorReady' }, '*');

            // Request initial data after parent confirms connection
            setTimeout(() => {
                this.status = 'Requesting data...';
                this.sendToPlugin({ event: 'getDeviceInfo' });
                this.sendToPlugin({ event: 'getEntities' });
                this.sendToPlugin({ event: 'getAreas' });
                this.sendToPlugin({ event: 'getLabels' });
            }, 300);

            // Retry if no response after 2 seconds
            setTimeout(() => {
                if (this.loading && this.allEntities.length === 0) {
                    this.status = 'Retrying data request...';
                    this.sendToPlugin({ event: 'getDeviceInfo' });
                    this.sendToPlugin({ event: 'getEntities' });
                    this.sendToPlugin({ event: 'getAreas' });
                    this.sendToPlugin({ event: 'getLabels' });
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
                    break;

                case 'areasData':
                    this.areas = payload.areas || [];
                    break;

                case 'labelsData':
                    this.haLabels = payload.labels || [];
                    this.entitiesWithLabels = payload.entitiesWithLabels || [];
                    // Check if this is a first-time user (no deck-assistant labels exist)
                    this.isFirstTimeUser = this.entitiesWithLabels.length === 0;
                    break;

                case 'labelCreated':
                    // Refresh labels after creating
                    this.sendToPlugin({ event: 'getLabels' });
                    break;

                case 'labelsAssigned':
                    // Refresh labels after assignment
                    this.sendToPlugin({ event: 'getLabels' });
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

                case 'labelsSynced':
                    alert('Labels synced to Home Assistant!');
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

        startWizard() {
            this.showWizard = true;
            this.wizardStep = 0;
            this.wizardSelections = {
                areas: [],
                domains: [],
                entities: []
            };
        },

        getWizardOptions() {
            switch (this.wizardStep) {
                case 0: // Areas
                    return this.areas.map(a => ({ id: a.area_id, name: a.name }));
                case 1: // Domains
                    return this.uniqueDomains.map(d => ({ id: d, name: d }));
                case 2: // Entities
                    return this.allEntities
                        .filter(e => {
                            if (this.wizardSelections.areas.length > 0 && !this.wizardSelections.areas.includes(e.area_id)) {
                                return false;
                            }
                            if (this.wizardSelections.domains.length > 0 && !this.wizardSelections.domains.includes(e.domain)) {
                                return false;
                            }
                            return true;
                        })
                        .map(e => ({ id: e.entity_id, name: e.friendly_name || e.entity_id }));
                default:
                    return [];
            }
        },

        isWizardOptionSelected(optionId) {
            switch (this.wizardStep) {
                case 0:
                    return this.wizardSelections.areas.includes(optionId);
                case 1:
                    return this.wizardSelections.domains.includes(optionId);
                case 2:
                    return this.wizardSelections.entities.includes(optionId);
                default:
                    return false;
            }
        },

        toggleWizardOption(optionId) {
            let arr;
            switch (this.wizardStep) {
                case 0:
                    arr = this.wizardSelections.areas;
                    break;
                case 1:
                    arr = this.wizardSelections.domains;
                    break;
                case 2:
                    arr = this.wizardSelections.entities;
                    break;
                default:
                    return;
            }

            const index = arr.indexOf(optionId);
            if (index === -1) {
                arr.push(optionId);
            } else {
                arr.splice(index, 1);
            }
        },

        wizardBack() {
            if (this.wizardStep === 0) {
                this.showWizard = false;
            } else {
                this.wizardStep--;
            }
        },

        wizardNext() {
            if (this.wizardStep === this.wizardSteps.length - 1) {
                // Finish wizard
                this.selectedEntities = [...this.wizardSelections.entities];
                this.showWizard = false;
                this.mode = 'freeform';
                this.autoGroup();
            } else {
                this.wizardStep++;
            }
        },

        // ========== Profile Generation ==========

        generateProfile() {
            try {
                if (!this.profileName.trim()) return;

                // Create a clean copy of config (removes Alpine.js proxies)
                const config = JSON.parse(JSON.stringify({
                    name: this.profileName.trim(),
                    device: {
                        model: this.deviceModel,
                        cols: this.deviceSize.cols,
                        rows: this.deviceSize.rows
                    },
                    pages: this.pages,
                    theme: this.theme,
                    domainColors: this.domainColors
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


        // ========== Label Sync ==========

        syncLabels() {
            const labelData = [];
            let order = 0;

            for (const group of this.groups) {
                for (const entityId of group.entities) {
                    labelData.push({
                        entityId: entityId,
                        label: `streamdeck:${group.name.toLowerCase().replace(/\s+/g, '-')}:${order}`
                    });
                    order++;
                }
            }

            // If no groups, just use selection order
            if (labelData.length === 0) {
                for (let i = 0; i < this.selectedEntities.length; i++) {
                    labelData.push({
                        entityId: this.selectedEntities[i],
                        label: `streamdeck:main:${i}`
                    });
                }
            }

            this.sendToPlugin({
                event: 'syncLabels',
                labels: labelData
            });
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
        }
    };
}
