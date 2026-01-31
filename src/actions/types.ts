export interface EntityButtonSettings {
  entityId: string;
  action: "toggle" | "turn_on" | "turn_off" | "call_service" | "none";
  serviceData?: {
    domain: string;
    service: string;
    data?: object;
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
