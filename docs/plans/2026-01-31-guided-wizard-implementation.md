# Guided Configuration Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a first-time user guided wizard that helps users select and organize Home Assistant entities using HA labels for persistent, stateless configuration storage.

**Architecture:** Wizard UI in Layout Editor (Alpine.js) communicates with plugin backend to read/write HA labels. Labels use format `deck-assistant:level1:level2:...` for hierarchical grouping. Plugin stores no state - labels in HA are the source of truth.

**Tech Stack:** Alpine.js frontend, TypeScript plugin backend, Home Assistant WebSocket API (label_registry, entity_registry)

---

## Summary

The wizard guides first-time users through:
1. Selecting areas/rooms they want to control
2. Selecting entity types (domains) within those areas
3. Reviewing and confirming entity selection
4. Assigning hierarchical labels to entities in Home Assistant
5. Optionally generating a profile immediately

Labels follow format: `deck-assistant:group1:group2:...` with infinite depth supported.

---

## Task 1: Add Label Types to Home Assistant Module

**Files:**
- Modify: `src/homeassistant/types.ts`

**Step 1: Add HALabel interface**

Add after the existing interfaces:

```typescript
export interface HALabel {
  label_id: string;
  name: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface HAEntityRegistryEntry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  name?: string;
  icon?: string;
  platform: string;
  labels?: string[];  // Add this field
}
```

**Step 2: Commit**

```bash
git add src/homeassistant/types.ts
git commit -m "feat: add HALabel type and labels field to entity registry"
```

---

## Task 2: Add Label CRUD Methods to Connection Module

**Files:**
- Modify: `src/homeassistant/connection.ts`

**Step 1: Add label storage and fetch method**

Add private field after `entityRegistry`:

```typescript
private labels: HALabel[] = [];
```

Add fetch call in `connect()` after the existing Promise.all:

```typescript
await this.fetchLabels();
```

Add fetch method after `fetchEntityRegistry()`:

```typescript
/**
 * Fetch labels from Home Assistant
 */
private async fetchLabels(): Promise<void> {
  if (!this.connection) {
    return;
  }

  try {
    const labels = await this.connection.sendMessagePromise<HALabel[]>({
      type: "config/label_registry/list",
    });
    this.labels = labels || [];
  } catch (error) {
    console.error("Failed to fetch labels:", error);
    this.labels = [];
  }
}
```

**Step 2: Add getter for labels**

```typescript
/**
 * Get all labels
 */
getLabels(): HALabel[] {
  return [...this.labels];
}
```

**Step 3: Add createLabel method**

```typescript
/**
 * Create a new label in Home Assistant
 */
async createLabel(labelId: string, name: string): Promise<HALabel | null> {
  if (!this.connection) {
    throw new Error("Not connected to Home Assistant");
  }

  try {
    const result = await this.connection.sendMessagePromise<HALabel>({
      type: "config/label_registry/create",
      name: name,
    });

    // Refresh labels cache
    await this.fetchLabels();

    return result;
  } catch (error) {
    console.error("Failed to create label:", error);
    throw error;
  }
}
```

**Step 4: Add assignLabelToEntity method**

```typescript
/**
 * Assign labels to an entity
 */
async assignLabelsToEntity(entityId: string, labelIds: string[]): Promise<void> {
  if (!this.connection) {
    throw new Error("Not connected to Home Assistant");
  }

  try {
    await this.connection.sendMessagePromise({
      type: "config/entity_registry/update",
      entity_id: entityId,
      labels: labelIds,
    });

    // Refresh entity registry cache
    await this.fetchEntityRegistry();
  } catch (error) {
    console.error(`Failed to assign labels to ${entityId}:`, error);
    throw error;
  }
}
```

**Step 5: Add getEntitiesWithDeckAssistantLabels method**

```typescript
/**
 * Get entities that have deck-assistant labels
 */
getEntitiesWithDeckAssistantLabels(): Array<{
  entity_id: string;
  labels: string[];
  hierarchy: string[][];
}> {
  const results: Array<{
    entity_id: string;
    labels: string[];
    hierarchy: string[][];
  }> = [];

  for (const entry of this.entityRegistry) {
    if (!entry.labels || entry.labels.length === 0) continue;

    const daLabels = entry.labels.filter(l => l.startsWith("deck-assistant:"));
    if (daLabels.length === 0) continue;

    const hierarchy = daLabels.map(label => {
      const parts = label.split(":");
      return parts.slice(1); // Remove "deck-assistant" prefix
    });

    results.push({
      entity_id: entry.entity_id,
      labels: daLabels,
      hierarchy,
    });
  }

  return results;
}
```

**Step 6: Reset labels in disconnect()**

Add to disconnect() method:

```typescript
this.labels = [];
```

**Step 7: Commit**

```bash
git add src/homeassistant/connection.ts
git commit -m "feat: add label CRUD methods to HA connection"
```

---

## Task 3: Add Label Event Handlers to Settings Action

**Files:**
- Modify: `src/actions/settings.ts`

**Step 1: Import HALabel type**

Add to imports:

```typescript
import { ConnectionState, HALabel } from "../homeassistant/types.js";
```

**Step 2: Add getLabels handler in onSendToPlugin**

Add in the switch/if chain after `getAreas`:

```typescript
} else if (event === "getLabels") {
  // Layout Editor requesting labels
  await this.handleGetLabels();
}
```

**Step 3: Add createLabel handler**

```typescript
} else if (event === "createLabel") {
  const name = payload?.name as string;
  if (name) {
    await this.handleCreateLabel(name);
  }
}
```

**Step 4: Add assignLabels handler**

```typescript
} else if (event === "assignLabels") {
  const entityId = payload?.entityId as string;
  const labelIds = payload?.labelIds as string[];
  if (entityId && labelIds) {
    await this.handleAssignLabels(entityId, labelIds);
  }
}
```

**Step 5: Implement handleGetLabels**

```typescript
/**
 * Handle getLabels request from Layout Editor
 */
private async handleGetLabels(): Promise<void> {
  if (!haConnection.isConnected()) {
    await streamDeck.ui.current?.sendToPropertyInspector({
      event: "labelsData",
      labels: [],
      entitiesWithLabels: [],
    });
    return;
  }

  try {
    const labels = haConnection.getLabels();
    const entitiesWithLabels = haConnection.getEntitiesWithDeckAssistantLabels();

    // Filter to only deck-assistant labels
    const daLabels = labels.filter(l => l.name.startsWith("deck-assistant:"));

    await streamDeck.ui.current?.sendToPropertyInspector({
      event: "labelsData",
      labels: daLabels,
      entitiesWithLabels: entitiesWithLabels,
    });
  } catch (error) {
    logger.error(`Failed to get labels: ${error}`);
    await streamDeck.ui.current?.sendToPropertyInspector({
      event: "labelsData",
      labels: [],
      entitiesWithLabels: [],
    });
  }
}
```

**Step 6: Implement handleCreateLabel**

```typescript
/**
 * Handle createLabel request from Layout Editor
 */
private async handleCreateLabel(name: string): Promise<void> {
  if (!haConnection.isConnected()) {
    await streamDeck.ui.current?.sendToPropertyInspector({
      event: "error",
      message: "Not connected to Home Assistant",
    });
    return;
  }

  try {
    const label = await haConnection.createLabel(name, name);

    await streamDeck.ui.current?.sendToPropertyInspector({
      event: "labelCreated",
      label: label,
    });
  } catch (error) {
    logger.error(`Failed to create label: ${error}`);
    await streamDeck.ui.current?.sendToPropertyInspector({
      event: "error",
      message: `Failed to create label: ${error}`,
    });
  }
}
```

**Step 7: Implement handleAssignLabels**

```typescript
/**
 * Handle assignLabels request from Layout Editor
 */
private async handleAssignLabels(entityId: string, labelIds: string[]): Promise<void> {
  if (!haConnection.isConnected()) {
    await streamDeck.ui.current?.sendToPropertyInspector({
      event: "error",
      message: "Not connected to Home Assistant",
    });
    return;
  }

  try {
    await haConnection.assignLabelsToEntity(entityId, labelIds);

    await streamDeck.ui.current?.sendToPropertyInspector({
      event: "labelsAssigned",
      entityId: entityId,
      labelIds: labelIds,
    });
  } catch (error) {
    logger.error(`Failed to assign labels: ${error}`);
    await streamDeck.ui.current?.sendToPropertyInspector({
      event: "error",
      message: `Failed to assign labels: ${error}`,
    });
  }
}
```

**Step 8: Commit**

```bash
git add src/actions/settings.ts
git commit -m "feat: add label event handlers to Settings action"
```

---

## Task 4: Update Layout Editor JS - Add Label State and Methods

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Add label-related state**

Add after existing state properties (around line 84):

```javascript
// Labels from Home Assistant
haLabels: [],
entitiesWithLabels: [],

// Wizard state - enhanced
wizardMode: 'new', // 'new' or 'reconfigure'
isFirstTimeUser: true,
wizardComplete: false,
```

**Step 2: Add label request to init**

In `connectToParent()`, add after the existing getAreas request (around line 227):

```javascript
this.sendToPlugin({ event: 'getLabels' });
```

**Step 3: Add label message handlers in handlePluginMessage**

Add cases after `areasData`:

```javascript
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
```

**Step 4: Add helper methods for labels**

Add after the `syncLabels()` method:

```javascript
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
```

**Step 5: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: add label state and methods to layout editor"
```

---

## Task 5: Implement Enhanced Wizard Flow in JS

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Update wizardSteps array**

Replace existing wizardSteps:

```javascript
wizardSteps: [
    {
        id: 'welcome',
        title: 'Welcome to Deck Assistant',
        subtitle: 'Let\'s set up your Stream Deck with Home Assistant entities.',
        type: 'info'
    },
    {
        id: 'areas',
        title: 'Select Areas',
        subtitle: 'Which rooms do you want to control?',
        type: 'multiselect'
    },
    {
        id: 'domains',
        title: 'Select Device Types',
        subtitle: 'What kinds of devices in those areas?',
        type: 'multiselect'
    },
    {
        id: 'entities',
        title: 'Select Entities',
        subtitle: 'Choose the specific devices to include.',
        type: 'multiselect'
    },
    {
        id: 'grouping',
        title: 'Organize Layout',
        subtitle: 'How should entities be grouped?',
        type: 'choice',
        options: [
            { id: 'by-area', name: 'By Room/Area', description: 'Group entities by their Home Assistant area' },
            { id: 'by-domain', name: 'By Device Type', description: 'Group lights together, switches together, etc.' },
            { id: 'flat', name: 'No Grouping', description: 'All entities on a single page' }
        ]
    },
    {
        id: 'confirm',
        title: 'Ready to Configure',
        subtitle: 'We\'ll save these preferences to Home Assistant labels.',
        type: 'confirm'
    }
],
```

**Step 2: Add grouping selection state**

Add to wizardSelections:

```javascript
wizardSelections: {
    areas: [],
    domains: [],
    entities: [],
    grouping: 'by-area'  // Add this
},
```

**Step 3: Update getWizardOptions method**

Replace the existing method:

```javascript
getWizardOptions() {
    const currentStep = this.wizardSteps[this.wizardStep];

    switch (currentStep.id) {
        case 'welcome':
            return [];

        case 'areas':
            // Include "Unassigned" for entities without area
            const areaOptions = this.areas.map(a => ({ id: a.area_id, name: a.name }));
            const hasUnassigned = this.allEntities.some(e => !e.area_id);
            if (hasUnassigned) {
                areaOptions.push({ id: '__unassigned__', name: 'Unassigned (no area)' });
            }
            return areaOptions;

        case 'domains':
            // Only show domains that exist in selected areas
            const selectedAreas = this.wizardSelections.areas;
            const relevantEntities = this.allEntities.filter(e => {
                if (selectedAreas.length === 0) return true;
                if (selectedAreas.includes('__unassigned__') && !e.area_id) return true;
                return selectedAreas.includes(e.area_id);
            });
            const domains = [...new Set(relevantEntities.map(e => e.domain))].sort();
            return domains.map(d => ({ id: d, name: this.formatDomainName(d) }));

        case 'entities':
            // Filter by selected areas and domains
            return this.allEntities
                .filter(e => {
                    // Area filter
                    if (this.wizardSelections.areas.length > 0) {
                        if (this.wizardSelections.areas.includes('__unassigned__') && !e.area_id) {
                            // Allow unassigned
                        } else if (!this.wizardSelections.areas.includes(e.area_id)) {
                            return false;
                        }
                    }
                    // Domain filter
                    if (this.wizardSelections.domains.length > 0 &&
                        !this.wizardSelections.domains.includes(e.domain)) {
                        return false;
                    }
                    return true;
                })
                .map(e => ({
                    id: e.entity_id,
                    name: e.friendly_name || e.entity_id,
                    subtitle: e.entity_id
                }));

        case 'grouping':
            return currentStep.options;

        case 'confirm':
            return [];

        default:
            return [];
    }
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
```

**Step 4: Update isWizardOptionSelected method**

```javascript
isWizardOptionSelected(optionId) {
    const currentStep = this.wizardSteps[this.wizardStep];

    switch (currentStep.id) {
        case 'areas':
            return this.wizardSelections.areas.includes(optionId);
        case 'domains':
            return this.wizardSelections.domains.includes(optionId);
        case 'entities':
            return this.wizardSelections.entities.includes(optionId);
        case 'grouping':
            return this.wizardSelections.grouping === optionId;
        default:
            return false;
    }
},
```

**Step 5: Update toggleWizardOption method**

```javascript
toggleWizardOption(optionId) {
    const currentStep = this.wizardSteps[this.wizardStep];

    if (currentStep.id === 'grouping') {
        // Single selection for grouping
        this.wizardSelections.grouping = optionId;
        return;
    }

    let arr;
    switch (currentStep.id) {
        case 'areas':
            arr = this.wizardSelections.areas;
            break;
        case 'domains':
            arr = this.wizardSelections.domains;
            break;
        case 'entities':
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
```

**Step 6: Update wizardNext to handle finish**

Replace existing wizardNext:

```javascript
async wizardNext() {
    const currentStep = this.wizardSteps[this.wizardStep];

    if (this.wizardStep === this.wizardSteps.length - 1) {
        // Final step - save labels and finish
        await this.saveWizardLabels();
        this.selectedEntities = [...this.wizardSelections.entities];
        this.showWizard = false;
        this.wizardComplete = true;
        this.mode = 'freeform';
        this.autoGroup();

        // Offer to generate profile
        if (this.selectedEntities.length > 0) {
            this.showProfileNameModal = true;
        }
    } else {
        // Auto-select all entities when moving to entities step if none selected
        if (currentStep.id === 'domains' && this.wizardSelections.entities.length === 0) {
            const options = this.getWizardOptions();
            // Pre-select commonly used domains
            if (this.wizardSelections.domains.length === 0) {
                const commonDomains = ['light', 'switch', 'climate', 'media_player', 'cover', 'fan', 'scene'];
                this.wizardSelections.domains = commonDomains.filter(d =>
                    this.allEntities.some(e => e.domain === d)
                );
            }
        }

        this.wizardStep++;
    }
},
```

**Step 7: Add saveWizardLabels method**

```javascript
async saveWizardLabels() {
    const grouping = this.wizardSelections.grouping;
    const entities = this.wizardSelections.entities;

    // Build label assignments based on grouping choice
    const labelAssignments = [];

    for (const entityId of entities) {
        const entity = this.getEntityById(entityId);
        if (!entity) continue;

        let hierarchy;

        switch (grouping) {
            case 'by-area':
                const areaName = this.getAreaName(entity.area_id) || 'unassigned';
                hierarchy = [this.slugify(areaName)];
                break;

            case 'by-domain':
                hierarchy = [entity.domain];
                break;

            case 'flat':
            default:
                hierarchy = ['main'];
                break;
        }

        const labelString = this.buildLabelString(hierarchy);
        labelAssignments.push({
            entityId: entityId,
            label: labelString
        });
    }

    // Create unique labels first
    const uniqueLabels = [...new Set(labelAssignments.map(a => a.label))];
    for (const labelName of uniqueLabels) {
        this.createLabel(labelName);
    }

    // Wait a moment for labels to be created, then assign
    await new Promise(resolve => setTimeout(resolve, 500));

    // Assign labels to entities
    for (const assignment of labelAssignments) {
        // Get the label_id from haLabels (refresh first)
        this.sendToPlugin({ event: 'getLabels' });
    }

    // Note: Label assignment will happen after labels are created
    // For now, store the intended assignments
    this.pendingLabelAssignments = labelAssignments;

    // Trigger assignment after a delay
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
```

**Step 8: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js
git commit -m "feat: implement enhanced wizard flow with label saving"
```

---

## Task 6: Update Wizard UI in HTML

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/layout-editor.html`

**Step 1: Replace the wizard overlay template**

Find the existing `<!-- Wizard Overlay -->` section (around line 309) and replace it:

```html
<!-- Wizard Overlay -->
<template x-if="showWizard">
    <div class="wizard-overlay">
        <div class="wizard">
            <div class="wizard-step">
                <!-- Progress Dots -->
                <div class="wizard-progress">
                    <template x-for="(step, index) in wizardSteps" :key="index">
                        <div class="wizard-dot"
                             :class="{
                                 active: wizardStep === index,
                                 completed: wizardStep > index
                             }">
                        </div>
                    </template>
                </div>

                <div class="wizard-title" x-text="wizardSteps[wizardStep].title"></div>
                <div class="wizard-subtitle" x-text="wizardSteps[wizardStep].subtitle"></div>

                <!-- Welcome Step -->
                <template x-if="wizardSteps[wizardStep].id === 'welcome'">
                    <div class="wizard-welcome">
                        <p>This wizard will help you:</p>
                        <ul>
                            <li>Select which areas and devices to control</li>
                            <li>Organize them into groups</li>
                            <li>Save preferences to Home Assistant labels</li>
                            <li>Generate a Stream Deck profile</li>
                        </ul>
                        <p class="wizard-note">Your preferences are stored as labels in Home Assistant, so they persist across sessions.</p>
                    </div>
                </template>

                <!-- Multi-select Steps (Areas, Domains, Entities) -->
                <template x-if="wizardSteps[wizardStep].type === 'multiselect'">
                    <div class="wizard-options wizard-scrollable">
                        <template x-for="option in getWizardOptions()" :key="option.id">
                            <div class="wizard-option"
                                 :class="{ selected: isWizardOptionSelected(option.id) }"
                                 @click="toggleWizardOption(option.id)">
                                <input type="checkbox" :checked="isWizardOptionSelected(option.id)">
                                <div class="wizard-option-content">
                                    <span class="wizard-option-name" x-text="option.name"></span>
                                    <span class="wizard-option-subtitle" x-text="option.subtitle" x-show="option.subtitle"></span>
                                </div>
                            </div>
                        </template>
                    </div>
                </template>

                <!-- Choice Step (Grouping) -->
                <template x-if="wizardSteps[wizardStep].type === 'choice'">
                    <div class="wizard-options">
                        <template x-for="option in getWizardOptions()" :key="option.id">
                            <div class="wizard-option wizard-option-large"
                                 :class="{ selected: isWizardOptionSelected(option.id) }"
                                 @click="toggleWizardOption(option.id)">
                                <input type="radio" :checked="isWizardOptionSelected(option.id)" :name="'grouping'">
                                <div class="wizard-option-content">
                                    <span class="wizard-option-name" x-text="option.name"></span>
                                    <span class="wizard-option-description" x-text="option.description"></span>
                                </div>
                            </div>
                        </template>
                    </div>
                </template>

                <!-- Confirm Step -->
                <template x-if="wizardSteps[wizardStep].id === 'confirm'">
                    <div class="wizard-confirm">
                        <div class="wizard-summary">
                            <div class="wizard-summary-item">
                                <span class="wizard-summary-label">Areas:</span>
                                <span class="wizard-summary-value" x-text="wizardSelections.areas.length || 'All'"></span>
                            </div>
                            <div class="wizard-summary-item">
                                <span class="wizard-summary-label">Device Types:</span>
                                <span class="wizard-summary-value" x-text="wizardSelections.domains.length || 'All'"></span>
                            </div>
                            <div class="wizard-summary-item">
                                <span class="wizard-summary-label">Entities:</span>
                                <span class="wizard-summary-value" x-text="wizardSelections.entities.length"></span>
                            </div>
                            <div class="wizard-summary-item">
                                <span class="wizard-summary-label">Grouping:</span>
                                <span class="wizard-summary-value" x-text="wizardSelections.grouping === 'by-area' ? 'By Room' : wizardSelections.grouping === 'by-domain' ? 'By Type' : 'None'"></span>
                            </div>
                        </div>
                        <p class="wizard-note">Click "Finish" to save these labels to Home Assistant and generate your profile.</p>
                    </div>
                </template>

                <!-- Selection count for multi-select steps -->
                <template x-if="wizardSteps[wizardStep].type === 'multiselect'">
                    <div class="wizard-selection-count">
                        <span x-show="wizardSteps[wizardStep].id === 'areas'" x-text="`${wizardSelections.areas.length} areas selected`"></span>
                        <span x-show="wizardSteps[wizardStep].id === 'domains'" x-text="`${wizardSelections.domains.length} types selected`"></span>
                        <span x-show="wizardSteps[wizardStep].id === 'entities'" x-text="`${wizardSelections.entities.length} entities selected`"></span>
                    </div>
                </template>

                <div class="wizard-actions">
                    <button class="btn btn-secondary" @click="wizardBack()">
                        <span x-text="wizardStep === 0 ? 'Cancel' : 'Back'"></span>
                    </button>
                    <button class="btn btn-primary" @click="wizardNext()">
                        <span x-text="wizardStep === wizardSteps.length - 1 ? 'Finish' : 'Next'"></span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
```

**Step 2: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/layout-editor.html
git commit -m "feat: update wizard HTML with new step types"
```

---

## Task 7: Add Wizard CSS Styles

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/css/layout-editor.css`

**Step 1: Add/update wizard styles**

Add or update the wizard section in CSS:

```css
/* ========== Wizard Overlay ========== */

.wizard-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.wizard {
    background: #2a2a2a;
    border-radius: 12px;
    padding: 32px;
    width: 500px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.wizard-step {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.wizard-progress {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;
}

.wizard-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #444;
    transition: all 0.2s;
}

.wizard-dot.active {
    background: #0078D4;
    transform: scale(1.2);
}

.wizard-dot.completed {
    background: #4CAF50;
}

.wizard-title {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
    text-align: center;
}

.wizard-subtitle {
    font-size: 13px;
    color: #888;
    text-align: center;
    margin-bottom: 8px;
}

/* Welcome step */
.wizard-welcome {
    padding: 16px;
    background: #333;
    border-radius: 8px;
}

.wizard-welcome p {
    margin: 0 0 12px 0;
    color: #ccc;
}

.wizard-welcome ul {
    margin: 0;
    padding-left: 20px;
    color: #aaa;
}

.wizard-welcome li {
    margin: 8px 0;
}

.wizard-note {
    font-size: 12px;
    color: #888;
    font-style: italic;
    margin-top: 12px;
}

/* Options list */
.wizard-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.wizard-scrollable {
    max-height: 300px;
    overflow-y: auto;
    padding-right: 8px;
}

.wizard-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #333;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
}

.wizard-option:hover {
    background: #3a3a3a;
}

.wizard-option.selected {
    border-color: #0078D4;
    background: rgba(0, 120, 212, 0.1);
}

.wizard-option input[type="checkbox"],
.wizard-option input[type="radio"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.wizard-option-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
}

.wizard-option-name {
    color: #fff;
    font-size: 14px;
}

.wizard-option-subtitle {
    color: #888;
    font-size: 11px;
}

.wizard-option-description {
    color: #aaa;
    font-size: 12px;
}

.wizard-option-large {
    padding: 16px;
}

/* Confirm step */
.wizard-confirm {
    padding: 16px;
}

.wizard-summary {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #333;
    padding: 16px;
    border-radius: 8px;
}

.wizard-summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.wizard-summary-label {
    color: #888;
    font-size: 13px;
}

.wizard-summary-value {
    color: #fff;
    font-size: 13px;
    font-weight: 500;
}

/* Selection count */
.wizard-selection-count {
    text-align: center;
    font-size: 12px;
    color: #888;
    padding: 8px 0;
}

/* Actions */
.wizard-actions {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #444;
}

.wizard-actions .btn {
    flex: 1;
}
```

**Step 2: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/css/layout-editor.css
git commit -m "feat: add wizard CSS styles"
```

---

## Task 8: Add First-Time User Detection and Auto-Start

**Files:**
- Modify: `com.deckassistant.sdPlugin/ui/js/layout-editor.js`

**Step 1: Add auto-start wizard logic**

Update the `labelsData` case in handlePluginMessage to auto-start wizard:

```javascript
case 'labelsData':
    this.haLabels = payload.labels || [];
    this.entitiesWithLabels = payload.entitiesWithLabels || [];
    // Check if this is a first-time user (no deck-assistant labels exist)
    this.isFirstTimeUser = this.entitiesWithLabels.length === 0;

    // Auto-start wizard for first-time users after all data is loaded
    if (this.isFirstTimeUser && !this.loading && !this.showWizard && !this.wizardComplete) {
        // Small delay to let UI settle
        setTimeout(() => {
            this.startWizard();
        }, 500);
    }
    break;
```

**Step 2: Add "Reconfigure" button to header**

In layout-editor.html, update the header section:

```html
<header class="header">
    <h1>Deck Assistant - Layout Editor</h1>
    <div class="device-info">
        <button class="btn btn-secondary btn-small"
                @click="startWizard()"
                x-show="!showWizard && wizardComplete"
                style="margin-right: 12px;">
            Reconfigure
        </button>
        <select class="filter-select" x-model="selectedDeviceId" @change="updateDeviceSize()" style="margin-right: 8px;">
            <template x-for="device in availableDevices" :key="device.id">
                <option :value="device.id" x-text="device.name + ' (' + device.cols + 'x' + device.rows + ')'"></option>
            </template>
        </select>
        <span class="connection-status" :class="connected ? 'connected' : 'disconnected'"></span>
    </div>
</header>
```

**Step 3: Add btn-small style to CSS**

```css
.btn-small {
    padding: 4px 12px;
    font-size: 12px;
}
```

**Step 4: Commit**

```bash
git add com.deckassistant.sdPlugin/ui/js/layout-editor.js com.deckassistant.sdPlugin/ui/layout-editor.html com.deckassistant.sdPlugin/ui/css/layout-editor.css
git commit -m "feat: add first-time user detection and reconfigure button"
```

---

## Task 9: Test Complete Flow

**Step 1: Build the plugin**

```bash
npm run build
```

**Step 2: Manual testing checklist**

1. Open Stream Deck software
2. Add Settings action to deck
3. Configure Home Assistant connection
4. Click "Open Layout Editor"
5. Verify wizard auto-starts (first time user)
6. Complete wizard steps:
   - Welcome screen displays
   - Area selection works
   - Domain selection filters correctly
   - Entity selection shows filtered list
   - Grouping choice works
   - Confirm shows summary
7. Finish wizard and verify:
   - Labels created in Home Assistant
   - Labels assigned to entities
   - Profile name modal appears
   - Profile generates successfully
8. Close and reopen Layout Editor
9. Verify wizard does NOT auto-start (labels exist)
10. Click "Reconfigure" button
11. Verify wizard starts again

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete guided configuration wizard implementation"
```

---

## Summary

This implementation:

1. **Backend (Tasks 1-3):** Adds label types, CRUD methods, and event handlers
2. **Frontend State (Tasks 4-5):** Adds label state and enhanced wizard logic
3. **Frontend UI (Tasks 6-7):** Updates HTML/CSS for new wizard flow
4. **First-time UX (Task 8):** Auto-starts wizard for new users, adds reconfigure option
5. **Testing (Task 9):** Verifies complete flow works end-to-end

Labels use format `deck-assistant:level1:level2:...` with infinite depth supported. The plugin remains stateless - Home Assistant labels are the source of truth.
