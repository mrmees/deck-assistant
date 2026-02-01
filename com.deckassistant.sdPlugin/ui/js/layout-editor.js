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
        wizardEntitySearch: '', // Search filter for entity lists
        wizardShowLinkedOnly: false, // Filter to show only deck-assistant labeled entities
        wizardSelections: {
            approach: 'groups', // 'groups' or 'simple'
            groupType: 'area', // 'area', 'domain', 'custom'
            currentGroupEntities: [],
            currentGroupName: '',
            groups: [], // Array of { name, entities: [] }
            simpleEntities: [], // For simple flow
            layoutStyle: 'groups-as-folders' // 'groups-as-folders', 'groups-as-pages', 'flat'
        },
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
                    { id: 'simple', name: 'Quick Setup', description: 'Just select entities and auto-organize by area' }
                ]
            },
            {
                id: 'group-type',
                title: 'What defines this group?',
                subtitle: 'Choose how to filter entities for this group.',
                type: 'choice',
                options: [
                    { id: 'area', name: 'By Area/Room', description: 'Select all entities from a specific area' },
                    { id: 'domain', name: 'By Device Type', description: 'Select all lights, switches, etc.' },
                    { id: 'custom', name: 'Custom Selection', description: 'Pick any entities you want' }
                ]
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
                subtitle: 'Would you like to create another group?',
                type: 'choice',
                options: [
                    { id: 'another', name: 'Add Another Group', description: 'Create another group of entities' },
                    { id: 'done', name: 'Done Adding Groups', description: 'Proceed to layout configuration' }
                ]
            },
            {
                id: 'simple-entities',
                title: 'Select Entities',
                subtitle: 'Choose all entities you want on your Stream Deck.',
                type: 'multiselect'
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

        /**
         * Check if wizard should auto-start for first-time users
         * Called after both entitiesData and labelsData are received
         */
        checkAutoStartWizard() {
            console.log('checkAutoStartWizard:', {
                loading: this.loading,
                isFirstTimeUser: this.isFirstTimeUser,
                showWizard: this.showWizard,
                wizardComplete: this.wizardComplete,
                entitiesCount: this.allEntities.length
            });

            // Need all data loaded, must be first-time user, wizard not already showing/completed
            if (!this.loading &&
                this.isFirstTimeUser &&
                !this.showWizard &&
                !this.wizardComplete &&
                this.allEntities.length > 0) {
                console.log('Auto-starting wizard for first-time user');
                // Small delay to let UI settle
                setTimeout(() => {
                    this.startWizard();
                }, 300);
            }
        },

        startWizard() {
            this.showWizard = true;
            this.wizardStep = 0;
            this.wizardSelections = {
                approach: 'groups',
                groupType: 'area',
                groupFilter: null, // Selected area or domain for filtering
                currentGroupEntities: [],
                currentGroupName: '',
                groups: [],
                simpleEntities: [],
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
                // Clear entity search and filter when changing steps
                this.wizardEntitySearch = '';
                this.wizardShowLinkedOnly = false;
            }
        },

        getWizardOptions() {
            const currentStep = this.wizardSteps[this.wizardStep];

            switch (currentStep.id) {
                case 'welcome':
                    return [];

                case 'approach':
                case 'group-type':
                case 'group-complete':
                case 'layout':
                    return currentStep.options;

                case 'group-filter':
                    // Show areas or domains based on groupType
                    if (this.wizardSelections.groupType === 'area') {
                        const areaOptions = this.areas.map(a => ({ id: a.area_id, name: a.name }));
                        const hasUnassigned = this.allEntities.some(e => !e.area_id);
                        if (hasUnassigned) {
                            areaOptions.push({ id: '__unassigned__', name: 'Unassigned (no area)' });
                        }
                        return areaOptions;
                    } else if (this.wizardSelections.groupType === 'domain') {
                        const domains = [...new Set(this.allEntities.map(e => e.domain))].sort();
                        return domains.map(d => ({ id: d, name: this.formatDomainName(d) }));
                    }
                    return [];

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

                case 'confirm':
                    return [];

                default:
                    return [];
            }
        },

        /**
         * Filter entities by search term and linked-only toggle
         */
        filterEntitiesBySearch(entities) {
            let filtered = entities;

            // Filter to only deck-assistant linked entities if toggle is on
            if (this.wizardShowLinkedOnly) {
                const linkedEntityIds = this.entitiesWithLabels.map(e => e.entity_id);
                filtered = filtered.filter(e => linkedEntityIds.includes(e.entity_id));
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
         * Get entities filtered for current group creation
         */
        getFilteredEntitiesForGroup() {
            const { groupType, groupFilter } = this.wizardSelections;

            if (groupType === 'custom') {
                // Show all entities for custom selection
                return this.allEntities;
            } else if (groupType === 'area') {
                if (!groupFilter) return [];
                return this.allEntities.filter(e => {
                    if (groupFilter === '__unassigned__') return !e.area_id;
                    return e.area_id === groupFilter;
                });
            } else if (groupType === 'domain') {
                if (!groupFilter) return [];
                return this.allEntities.filter(e => e.domain === groupFilter);
            }
            return [];
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

        isWizardOptionSelected(optionId) {
            const currentStep = this.wizardSteps[this.wizardStep];

            switch (currentStep.id) {
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
                case 'layout':
                    return this.wizardSelections.layoutStyle === optionId;
                default:
                    return false;
            }
        },

        toggleWizardOption(optionId) {
            const currentStep = this.wizardSteps[this.wizardStep];

            switch (currentStep.id) {
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
                    // Auto-suggest group name based on filter
                    if (this.wizardSelections.groupType === 'area') {
                        const area = this.areas.find(a => a.area_id === optionId);
                        this.wizardSelections.currentGroupName = area ? area.name : 'Unassigned';
                    } else if (this.wizardSelections.groupType === 'domain') {
                        this.wizardSelections.currentGroupName = this.formatDomainName(optionId);
                    }
                    break;
                case 'group-entities':
                    this.toggleArrayItem(this.wizardSelections.currentGroupEntities, optionId);
                    break;
                case 'simple-entities':
                    this.toggleArrayItem(this.wizardSelections.simpleEntities, optionId);
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
                case 'layout':
                    // Back depends on approach
                    if (this.wizardSelections.approach === 'simple') {
                        this.goToWizardStep('simple-entities');
                    } else {
                        this.goToWizardStep('group-complete');
                    }
                    break;
                case 'confirm':
                    this.goToWizardStep('layout');
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
                    // Save the current group
                    this.wizardSelections.groups.push({
                        name: this.wizardSelections.currentGroupName.trim(),
                        entities: [...this.wizardSelections.currentGroupEntities]
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
                    this.goToWizardStep('layout');
                    break;

                case 'layout':
                    this.goToWizardStep('confirm');
                    break;

                case 'confirm':
                    // Final step - save and finish
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
            } else {
                this.goToWizardStep('layout');
            }
        },

        async finishWizard() {
            const { approach, groups, simpleEntities, layoutStyle } = this.wizardSelections;

            // Build groups for layout
            let finalGroups = [];

            if (approach === 'groups') {
                // Use the groups that were created
                finalGroups = groups.map(g => ({
                    id: this.generateId(),
                    name: g.name,
                    type: layoutStyle === 'groups-as-pages' ? 'page' : 'folder',
                    entities: g.entities,
                    expanded: false
                }));
            } else {
                // Simple flow - auto-group by area
                const byArea = {};
                for (const entityId of simpleEntities) {
                    const entity = this.getEntityById(entityId);
                    if (!entity) continue;
                    const areaId = entity.area_id || '__unassigned__';
                    if (!byArea[areaId]) {
                        byArea[areaId] = [];
                    }
                    byArea[areaId].push(entityId);
                }

                for (const [areaId, entityIds] of Object.entries(byArea)) {
                    const areaName = areaId === '__unassigned__'
                        ? 'Other'
                        : (this.getAreaName(areaId) || 'Unknown');
                    finalGroups.push({
                        id: this.generateId(),
                        name: areaName,
                        type: layoutStyle === 'groups-as-pages' ? 'page' : 'folder',
                        entities: entityIds,
                        expanded: false
                    });
                }
            }

            // Save labels to Home Assistant
            await this.saveGroupLabels(finalGroups);

            // Set up the layout editor state
            this.groups = finalGroups;
            this.selectedEntities = finalGroups.flatMap(g => g.entities);

            // Close wizard and show layout
            this.showWizard = false;
            this.wizardComplete = true;
            this.mode = 'freeform';
            this.autoLayout();

            // Offer to generate profile
            if (this.selectedEntities.length > 0) {
                this.showProfileNameModal = true;
            }
        },

        async saveGroupLabels(groups) {
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

            // Create unique labels first
            const uniqueLabels = [...new Set(labelAssignments.map(a => a.label))];
            for (const labelName of uniqueLabels) {
                this.createLabel(labelName);
            }

            // Wait a moment for labels to be created
            await new Promise(resolve => setTimeout(resolve, 500));

            // Store assignments for processing
            this.pendingLabelAssignments = labelAssignments;

            // Trigger assignment after labels are created
            setTimeout(() => {
                this.processPendingLabelAssignments();
            }, 1000);
        },

        processPendingLabelAssignments() {
            if (!this.pendingLabelAssignments) return;

            for (const assignment of this.pendingLabelAssignments) {
                // Find the label ID by name
                const label = this.haLabels.find(l => l.name === assignment.label);
                if (label) {
                    this.assignLabelsToEntity(assignment.entityId, [label.label_id]);
                }
            }

            this.pendingLabelAssignments = null;
        },

        getAreaName(areaId) {
            if (!areaId) return null;
            const area = this.areas.find(a => a.area_id === areaId);
            return area ? area.name : null;
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
