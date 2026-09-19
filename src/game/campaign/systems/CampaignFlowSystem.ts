import { AssetStorage } from "@/core/assets/AssetStorage";
import { LocalDatabase } from "@/core/database/LocalDatabase";
import { Repository } from "@/core/database/Repository";
import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { Display } from "@/core/graphics/Display";
import { i18n, I18nService } from "@/core/i18n/I18n";
import { localizedText } from "@/core/i18n/LocalizedText";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MenuCancelledEvent, MenuConfirmedEvent, ObjectiveAcknowledgedEvent, UnitDiedEvent } from "@/game.events";
import { CAMPAIGN_SLOT, CampaignComponent, CampaignData } from "@/game/campaign/components/CampaignComponent";
import { TitleComponent } from "@/game/campaign/components/TitleComponent";
import { CAMPAIGN_ASSET, CampaignChapter, CampaignDocument, chapterAfter, chapterById, chapterNumber, parseCampaign } from "@/game/campaign/content/Campaigns";
import { rested, rosterOf } from "@/game/campaign/rules/Roster";
import { ChapterCardState } from "@/game/campaign/states/ChapterCardState";
import { TitleState } from "@/game/campaign/states/TitleState";
import { TITLE_MENU_ID, TITLE_ROW_KEY, titleMenuPosition, TitleRow, titleRows } from "@/game/campaign/view/TitleScreen";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { mapAsset } from "@/game/map/content/Scenario";
import { Outcome } from "@/game/objective/components/ObjectiveComponent";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitById, unitsInWorld, unitsOfFaction } from "@/game/units/rules/UnitLookup";
import { MenuStyle } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";

/**
 * The run from the title screen to the last chapter:
 *
 *  - `title:opened` reads the save slot; `campaign:slotRead`, once the store
 *    has answered, puts the title menu up - "Continue" when there is a run,
 *    "New Game" always. The menu cannot be backed out of: cancelled, it goes
 *    straight back up.
 *  - "New Game" begins a run at the campaign's first chapter and writes it;
 *    "Continue" takes the slot's run up again. Either way the chapter's card is
 *    switched to ([[ChapterCardState]]) - `CampaignSystem` enters the battle
 *    from there.
 *  - On `map:ready`, after every feature has set the battle up, the run is
 *    laid over it: a veteran gets the sheet it ended the last chapter with, a
 *    unit that has fallen for good is taken off the map, the convoy is refilled.
 *    Every attempt at a chapter starts from the same record.
 *  - A player unit's `unit:died` is noted as the battle's casualty - before the
 *    combat feature (0) takes the unit off the map, hence the higher priority.
 *  - `objective:acknowledged` on a victory is claimed ahead of the objective
 *    feature's restart: the survivors and the convoy are recorded, the
 *    casualties become the fallen, the run moves to the next chapter, is
 *    written, and that chapter's card goes up. The last chapter won reports
 *    `campaign:finished` and returns to the title. A defeat is left to the
 *    objective feature, which starts the chapter over.
 *
 * The store is IndexedDB, which answers later: a read or a write is fired
 * here and its result is reported as an event, so nothing waits mid-frame.
 */
export class CampaignFlowSystem extends ReactiveSystem {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	@GameCoreService(LocalDatabase)
	private database!: LocalDatabase;

	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(I18nService)
	private i18n!: I18nService;

	/** What the slot held when it was last read - the run "Continue" takes up. */
	private stored: CampaignData | null = null;

	public initialize(): this {
		this.subscribe("title:opened", () => this.readSlot());
		this.subscribe("campaign:slotRead", (event) => this.offerMenu(event.found));
		this.subscribe("ui:menuConfirmed", (event) => this.onTitleChoice(event));
		this.subscribe("ui:menuCancelled", (event) => this.onTitleCancelled(event));
		// After every feature has put its part of the battle up (the enemy tags at -1).
		this.subscribe("map:ready", () => this.applyRun(), -2);
		// Before the combat feature (0) takes the fallen unit off the map, while its side can still be read.
		this.subscribe("unit:died", (event) => this.noteCasualty(event), 1);
		// Ahead of the objective feature's own restart (0), which a victory is taken from.
		this.subscribe("objective:acknowledged", (event) => this.onAcknowledged(event), 1);

		return this;
	}

	/** Asks the store for the slot; the answer lands as `campaign:slotRead`. */
	private readSlot(): void {
		this.repository()
			.then((repository) => repository.read(CAMPAIGN_SLOT))
			.then((save) => {
				this.stored = isCampaignData(save) ? save : null;
				this.events.dispatch("campaign:slotRead", { found: this.stored !== null });
			})
			.catch((error: unknown) => {
				console.error("The save slot could not be read:", error);
				this.stored = null;
				this.events.dispatch("campaign:slotRead", { found: false });
			});
	}

	/** Puts the title menu up over the title screen. */
	private offerMenu(hasSave: boolean): void {
		const state = this.stateManager.peek();

		if (!(state instanceof TitleState)) {
			return;
		}

		const screen = state.getScreen();

		if (screen !== null) {
			const component = screen.getComponent(TitleComponent);
			component.update({ ...component.read(), hasSave, menuOpened: true });
		}

		const rows = titleRows(hasSave);

		this.stateManager.getState(MenuState).request({
			id: TITLE_MENU_ID,
			items: rows.map((row) => i18n(TITLE_ROW_KEY[row])),
			ids: [...rows],
			style: MenuStyle.BARE,
			position: titleMenuPosition(this.display.getViewportDimension())
		});
		this.stateManager.push(MenuState);
	}

	private onTitleChoice(event: MenuConfirmedEvent): void {
		if (event.menu !== TITLE_MENU_ID) {
			return;
		}

		if (event.row === TitleRow.CONTINUE && this.stored !== null) {
			this.continueRun(this.stored);
		} else {
			this.beginRun();
		}
	}

	/** The title menu is the only way forward, so backing out of it puts it straight back up. */
	private onTitleCancelled(event: MenuCancelledEvent): void {
		if (event.menu === TITLE_MENU_ID) {
			this.offerMenu(this.stored !== null);
		}
	}

	/** A fresh run at the campaign's first chapter, written to the slot. */
	private beginRun(): void {
		const campaign = this.campaign();
		const first = campaign.chapters[0];
		const data = CampaignComponent.begin(CAMPAIGN_SLOT, first.id, new Date().toISOString());

		this.install(data);
		this.write(data);
		this.startChapter(campaign, first);
	}

	/** The slot's run taken up again from the top of the chapter it was on. */
	private continueRun(stored: CampaignData): void {
		const campaign = this.campaign();
		const chapter = chapterById(campaign, stored.chapter);

		if (chapter === null) {
			console.error(`The saved run is on chapter "${stored.chapter}", which this campaign does not have - starting over`);
			this.beginRun();
			return;
		}

		this.install(stored);
		this.startChapter(campaign, chapter);
	}

	/** Puts the chapter's card up; the battle follows from there. */
	private startChapter(campaign: CampaignDocument, chapter: CampaignChapter): void {
		const number = chapterNumber(campaign, chapter.id);

		this.events.dispatch("campaign:chapterStarted", { chapter: chapter.id, number });

		this.stateManager.getState(ChapterCardState).request({
			chapter: chapter.id,
			number,
			title: localizedText(chapter.title, this.i18n.getLocale(), this.i18n.getFallbackLocale()),
			map: mapAsset(chapter.map)
		});
		this.stateManager.switch(ChapterCardState);
	}

	/** Lays the run over a battle that has just been set up. */
	private applyRun(): void {
		const entity = this.world.entityWith(CampaignComponent);

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(CampaignComponent);
		const data = CampaignComponent.opened(component.read());
		component.update(data);

		for (const unit of unitsOfFaction(unitsInWorld(this.world), UnitFaction.PLAYER)) {
			const sheet = unit.getComponent(UnitComponent);
			const id = sheet.read().id;

			if (CampaignComponent.isFallen(data, id)) {
				this.world.unregisterEntity(unit);
				continue;
			}

			const veteran = CampaignComponent.veteran(data, id);

			if (veteran !== null) {
				sheet.update(rested(veteran));
			}
		}

		const convoy = this.world.entityWith(ConvoyComponent);

		if (convoy !== null) {
			convoy.getComponent(ConvoyComponent).update({ items: data.convoy.map((entry) => ({ ...entry })) });
		}
	}

	private noteCasualty(event: UnitDiedEvent): void {
		const entity = this.world.entityWith(CampaignComponent);
		const unit = unitById(unitsInWorld(this.world), event.unitId);

		if (entity === null || unit === null || unit.getComponent(UnitComponent).read().faction !== UnitFaction.PLAYER) {
			return;
		}

		const component = entity.getComponent(CampaignComponent);
		component.update(CampaignComponent.withCasualty(component.read(), event.unitId));
	}

	private onAcknowledged(event: ObjectiveAcknowledgedEvent): void {
		const entity = this.world.entityWith(CampaignComponent);

		if (entity === null || event.outcome !== Outcome.VICTORY) {
			return;
		}

		// A won battle does not start over - it leads on.
		event.stopPropagation();

		const component = entity.getComponent(CampaignComponent);
		const data = component.read();
		const campaign = this.campaign();
		const next = chapterAfter(campaign, data.chapter);
		const roster = rosterOf(unitsInWorld(this.world));
		const convoy = this.world.entityWith(ConvoyComponent)?.getComponent(ConvoyComponent).read().items ?? [];

		if (next === null) {
			this.events.dispatch("campaign:chapterCleared", { chapter: data.chapter, next: "" });
			this.events.dispatch("campaign:finished", {});
			this.stateManager.switch(TitleState);
			return;
		}

		const cleared = CampaignComponent.cleared(data, roster, convoy, next.id, new Date().toISOString());
		component.update(cleared);
		this.write(cleared);

		this.events.dispatch("campaign:chapterCleared", { chapter: data.chapter, next: next.id });
		this.startChapter(campaign, next);
	}

	/** The run's entity - one at a time; a run begun over the top of another replaces it. */
	private install(data: CampaignData): void {
		const existing = this.world.entityWith(CampaignComponent);

		if (existing !== null) {
			this.world.unregisterEntity(existing);
		}

		this.world.createEntity().addComponent(CampaignComponent, data);
	}

	/** Fires a write of the run to the slot; `campaign:saved` lands once the store has taken it. */
	private write(data: CampaignData): void {
		const record = JSON.parse(JSON.stringify(data)) as CampaignData;

		this.repository()
			.then((repository) => repository.save(record))
			.then(() => {
				this.stored = record;
				this.events.dispatch("campaign:saved", { slot: record.slot });
			})
			.catch((error: unknown) => console.error("The run could not be saved:", error));
	}

	/** The slot's repository, as a promise so a store that is not connected fails the same way a failed read does. */
	private repository(): Promise<Repository<"campaign">> {
		return new Promise((resolve) => resolve(this.database.getRepository("campaign")));
	}

	/** The campaign sheet. It is a build error for the bundle not to carry one, so this throws rather than falling back. */
	private campaign(): CampaignDocument {
		return parseCampaign(this.assets.getJson(CAMPAIGN_ASSET));
	}
}

/** Whether what came out of the store is a run this build can take up. */
function isCampaignData(value: unknown): value is CampaignData {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const data = value as Record<string, unknown>;

	return typeof data.chapter === "string" && Array.isArray(data.roster) && Array.isArray(data.fallen) && Array.isArray(data.convoy);
}
