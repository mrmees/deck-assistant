export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    icon?: string;
    device_class?: string;
    unit_of_measurement?: string;
    [key: string]: unknown;
  };
  last_changed: string;
  last_updated: string;
}

export interface HAFloor {
  floor_id: string;
  name: string;
  level?: number;
  icon?: string;
}

export interface HAArea {
  area_id: string;
  name: string;
  picture?: string;
  floor_id?: string;
}

export interface HADevice {
  id: string;
  name: string;
  name_by_user?: string;
  area_id?: string;
  manufacturer?: string;
  model?: string;
  labels?: string[];
}

export interface HAEntityRegistryEntry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  name?: string;
  icon?: string;
  platform: string;
  labels?: string[];
  disabled_by?: string | null;
  hidden_by?: string | null;
  entity_category?: string | null; // "config" | "diagnostic" | null (primary)
}

export interface HALabel {
  label_id: string;
  name: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface HAConfig {
  url: string;
  token: string;
}

export interface ConnectionState {
  connected: boolean;
  error?: string;
}
