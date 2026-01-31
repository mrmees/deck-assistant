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

export interface HAArea {
  area_id: string;
  name: string;
  picture?: string;
}

export interface HADevice {
  id: string;
  name: string;
  area_id?: string;
}

export interface HAEntityRegistryEntry {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  name?: string;
  icon?: string;
  platform: string;
}

export interface HAConfig {
  url: string;
  token: string;
}

export interface ConnectionState {
  connected: boolean;
  error?: string;
}
