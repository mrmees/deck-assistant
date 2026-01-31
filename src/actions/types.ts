import type { JsonValue } from "@elgato/streamdeck";

export interface EntityButtonSettings {
  entityId: string;
  action: "toggle" | "turn_on" | "turn_off" | "call_service" | "none";
  serviceData?: {
    domain: string;
    service: string;
    data?: JsonValue;
  };
  appearance: {
    showTitle: boolean;
    titleOverride?: string;
    titlePosition: "top" | "bottom";
    showState: boolean;
    statePosition: "top" | "bottom";
    iconSource: "auto" | "mdi" | "custom";
    mdiIcon?: string;
    customIconPath?: string;
    iconColorOn: string;
    iconColorOff: string;
    backgroundColor: string;
    backgroundColorOn?: string;
    backgroundColorOff?: string;
  };
  // Index signature for JsonObject compatibility
  [key: string]: JsonValue;
}

export const defaultEntityButtonSettings: EntityButtonSettings = {
  entityId: "",
  action: "toggle",
  appearance: {
    showTitle: true,
    titlePosition: "bottom",
    showState: true,
    statePosition: "top",
    iconSource: "auto",
    iconColorOn: "#FFD700",
    iconColorOff: "#808080",
    backgroundColor: "#1a1a1a",
  },
};
