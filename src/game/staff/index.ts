export { StaffFeature } from "@/game/staff/StaffFeature";

export { StaffChoiceComponent } from "@/game/staff/components/StaffChoiceComponent";
export type { StaffChoiceData } from "@/game/staff/components/StaffChoiceComponent";

export { StaffState } from "@/game/staff/states/StaffState";
export type { StaffRequest } from "@/game/staff/states/StaffState";

export { StaffSystem } from "@/game/staff/systems/StaffSystem";
export type { StaffTarget } from "@/game/staff/systems/StaffSystem";
export { StaffChoiceSystem } from "@/game/staff/systems/StaffChoiceSystem";

export { STAFF_MENU, STAFF_MENU_WIDTH, staffRequest } from "@/game/staff/model/StaffMenus";
export { staffCommands, StaffCommand, StaffNextTargetCommand, StaffPrevTargetCommand, StaffConfirmCommand, StaffCancelCommand } from "@/game/staff/commands/StaffCommands";
export type { StaffCommandContext } from "@/game/staff/commands/StaffCommands";
