export { OptionsFeature } from "@/game/options/OptionsFeature";

export { OptionsComponent } from "@/game/options/components/OptionsComponent";
export type { OptionsData } from "@/game/options/components/OptionsComponent";

export { OptionsState } from "@/game/options/states/OptionsState";
export type { OptionsRequest } from "@/game/options/states/OptionsState";

export { OptionsSystem } from "@/game/options/systems/OptionsSystem";
export { OptionsRenderSystem } from "@/game/options/systems/OptionsRenderSystem";

export { gameSettings, option, optionEnabled, textRevealDelay, syncGameOptions, adoptFullscreen, wantsFullscreen, OPTIONS_STORAGE_KEY } from "@/game/options/GameSettings";

export { OptionId, OptionSection, gameOptions, channelVolumeId, volumeChannelOf, localeName, TEXT_SPEED_DELAYS, DEFAULT_VOLUME, DEFAULT_TEXT_SPEED } from "@/game/options/model/GameOptions";

export { optionsPanel, optionsHeight, OPTIONS_WIDTH, OPTIONS_VALUE_WIDTH } from "@/game/options/model/OptionsScreen";
