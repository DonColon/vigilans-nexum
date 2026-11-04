import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { chapterCardCommands } from "@/game/campaign/commands/ChapterCardCommands";
import { saveSlotCommands } from "@/game/campaign/commands/SaveSlotCommands";
import { CampaignComponent } from "@/game/campaign/components/CampaignComponent";
import { ChapterCardComponent } from "@/game/campaign/components/ChapterCardComponent";
import { SaveSlotComponent } from "@/game/campaign/components/SaveSlotComponent";
import { TitleComponent } from "@/game/campaign/components/TitleComponent";
import { ChapterCardState } from "@/game/campaign/states/ChapterCardState";
import { SaveSlotState } from "@/game/campaign/states/SaveSlotState";
import { TitleState } from "@/game/campaign/states/TitleState";
import { CampaignFlowSystem } from "@/game/campaign/systems/CampaignFlowSystem";
import { CampaignRenderSystem } from "@/game/campaign/systems/CampaignRenderSystem";
import { CampaignSystem } from "@/game/campaign/systems/CampaignSystem";

/**
 * The game around the battles: the title screen, the chapters in order, and
 * the save that carries the player's army from one to the next. The campaign
 * sheet (`src/assets/data/campaign`) lists the chapters, each a scenario on a
 * map; a run begins at the first from the title screen's "New Game", or is
 * taken up where a slot left it with "Continue" - either way from the save
 * slot list, which shows each slot's chapter, playtime, date and a picture
 * of the screen it was saved from. A won battle records the
 * survivors and the convoy, writes the run and puts the next chapter's card
 * up; a lost one is started over by the objective feature; the units that
 * fell in a won battle stay fallen.
 *
 * The feature is the wiring; [[CampaignFlowSystem]] is the flow.
 * [[CampaignSystem]] runs the screens, keeps the run's playtime and enters
 * the battle from the chapter card; [[CampaignRenderSystem]] draws them.
 */
export class CampaignFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [CampaignComponent, TitleComponent, SaveSlotComponent, ChapterCardComponent],
			states: [TitleState, SaveSlotState, ChapterCardState],
			commands: [...chapterCardCommands, ...saveSlotCommands],
			systems: [
				// Event-driven: the run from the title to the last chapter.
				{ system: CampaignFlowSystem },
				// Alongside MenuSystem and the other screens in the update phase.
				{ system: CampaignSystem, priority: 10 },
				// On the background layer just above GridRenderSystem (10), which owns
				// and clears it; the title and the card never share the screen with a map.
				{ system: CampaignRenderSystem, priority: 11 }
			],
			...config
		});
	}
}
