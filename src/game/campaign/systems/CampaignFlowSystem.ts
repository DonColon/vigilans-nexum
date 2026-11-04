import { AssetStorage } from "@/core/assets/AssetStorage";
import { LocalDatabase } from "@/core/database/LocalDatabase";
import { Repository } from "@/core/database/Repository";
import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { Display } from "@/core/graphics/Display";
import { i18n, I18nService } from "@/core/i18n/I18n";
import { localizedText } from "@/core/i18n/LocalizedText";
import { getRandomState, setRandomState } from "@/core/math/generation/Randomizer";
import { Savegame, snapshotWorld } from "@/core/model/Savegame";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CampaignSlotChosenEvent, MenuCancelledEvent, MenuConfirmedEvent, ObjectiveAcknowledgedEvent, UnitDiedEvent } from "@/game.events";
import { CampaignComponent, CampaignData, SAVE_SLOTS } from "@/game/campaign/components/CampaignComponent";
import { SaveSlotSummary, SlotPurpose } from "@/game/campaign/components/SaveSlotComponent";
import { TitleComponent } from "@/game/campaign/components/TitleComponent";
import { CAMPAIGN_ASSET, CampaignChapter, CampaignDocument, chapterAfter, chapterById, chapterNumber, parseCampaign } from "@/game/campaign/content/Campaigns";
import { rested, rosterOf } from "@/game/campaign/rules/Roster";
import { ChapterCardState } from "@/game/campaign/states/ChapterCardState";
import { SaveSlotState } from "@/game/campaign/states/SaveSlotState";
import { TitleState } from "@/game/campaign/states/TitleState";
import { formatSavedOn } from "@/game/campaign/view/SaveSlots";
import { TITLE_MENU_ID, TITLE_ROW_KEY, titleMenuPosition, TitleRow, titleRows } from "@/game/campaign/view/TitleScreen";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { mapAsset } from "@/game/map/content/Scenario";
import { Outcome } from "@/game/objective/components/ObjectiveComponent";
import { InventoryEntry, UnitComponent, UnitData, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitById, unitsInWorld, unitsOfFaction } from "@/game/units/rules/UnitLookup";
import { MenuStyle } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";

/**
 * The run from the title screen to the last chapter:
 *
 *  - `title:opened` reads every save slot; `campaign:slotRead`, once the
 *    store has answered, puts the title menu up - "Continue" when any slot
 *    holds a run, "New Game" always. The menu cannot be backed out of:
 *    cancelled, it goes straight back up.
 *  - Either row opens the save slot list ([[SaveSlotState]]): every slot with
 *    the chapter its run is on, its playtime, its date and the screen it was
 *    written from. "New Game" then begins a run at the campaign's first
 *    chapter in the chosen slot and writes it; "Continue" takes the chosen
 *    slot's run up again. Either way the chapter's card is switched to
 *    ([[ChapterCardState]]) - `CampaignSystem` enters the battle from there.
 *    Backing out of the list returns to the title menu.
 *  - On `map:ready`, after every feature has set the battle up, the run is
 *    laid over it: a veteran gets the sheet it ended the last chapter with, a
 *    unit that has fallen for good is taken off the map, the convoy is
 *    refilled, and whoever the chapter deployed off a sheet is enrolled. Every
 *    attempt at a chapter starts from the same record.
 *  - A player unit's `unit:died` is noted as the battle's casualty - before the
 *    combat feature (0) takes the unit off the map, hence the higher priority.
 *  - `objective:acknowledged` on a victory is claimed ahead of the objective
 *    feature's restart: the survivors and the convoy are recorded, the
 *    casualties become the fallen, the run moves to the next chapter, is
 *    written, and that chapter's card goes up. The last chapter won reports
 *    `campaign:finished` and returns to the title. A defeat is left to the
 *    objective feature, which starts the chapter over. A `prologue` chapter
 *    lets nobody fall for good and carries nothing past its last battle.
 *
 * A save is the framework's [[Savegame]] - the slot's header with the run's
 * playtime (which `CampaignSystem` keeps) and a thumbnail of the screen, and
 * the world as it stood - with the game's own fields merged in: the random
 * generator's state and the run itself (`CampaignComponent.toSave`). The
 * store is IndexedDB, which answers later: a read or a write is fired here
 * and its result is reported as an event, so nothing waits mid-frame.
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

	/** What the slots held when they were last read, by slot - the saves "Continue" offers. */
	private stored = new Map<number, Savegame>();

	public initialize(): this {
		this.subscribe("title:opened", () => this.readSlots());
		this.subscribe("campaign:slotRead", (event) => this.offerMenu(event.found));
		this.subscribe("ui:menuConfirmed", (event) => this.onTitleChoice(event));
		this.subscribe("ui:menuCancelled", (event) => this.onTitleCancelled(event));
		this.subscribe("campaign:slotChosen", (event) => this.onSlotChosen(event));
		this.subscribe("campaign:slotsClosed", () => this.offerMenu(this.stored.size > 0));
		// After every feature has put its part of the battle up (the enemy tags at -1).
		this.subscribe("map:ready", () => this.applyRun(), -2);
		// Before the combat feature (0) takes the fallen unit off the map, while its side can still be read.
		this.subscribe("unit:died", (event) => this.noteCasualty(event), 1);
		// Ahead of the objective feature's own restart (0), which a victory is taken from.
		this.subscribe("objective:acknowledged", (event) => this.onAcknowledged(event), 1);

		return this;
	}

	/** Asks the store for every slot; the answer lands as `campaign:slotRead`. */
	private readSlots(): void {
		this.repository()
			.then((repository) => repository.list())
			.then((saves) => {
				this.stored = new Map(saves.filter(isCampaignSave).map((save) => [save.id, save]));
				this.events.dispatch("campaign:slotRead", { found: this.stored.size > 0 });
			})
			.catch((error: unknown) => {
				console.error("The save slots could not be read:", error);
				this.stored = new Map();
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

	/** Either row of the title menu opens the slot list - "Continue" on the first occupied slot, "New Game" on the first empty one. */
	private onTitleChoice(event: MenuConfirmedEvent): void {
		if (event.menu !== TITLE_MENU_ID) {
			return;
		}

		this.openSlots(event.row === TitleRow.CONTINUE && this.stored.size > 0 ? SlotPurpose.CONTINUE : SlotPurpose.NEW_GAME);
	}

	/** The title menu is the only way forward, so backing out of it puts it straight back up. */
	private onTitleCancelled(event: MenuCancelledEvent): void {
		if (event.menu === TITLE_MENU_ID) {
			this.offerMenu(this.stored.size > 0);
		}
	}

	/** The save slot list over the title screen, every slot put into words. */
	private openSlots(purpose: SlotPurpose): void {
		const slots = Array.from({ length: SAVE_SLOTS }, (_, index) => this.summarize(index + 1));
		const wanted = purpose === SlotPurpose.CONTINUE ? slots.findIndex((slot) => !slot.empty) : slots.findIndex((slot) => slot.empty);

		this.stateManager.getState(SaveSlotState).request({ purpose, slots, selectedIndex: Math.max(0, wanted) });
		this.stateManager.push(SaveSlotState);
	}

	/** One slot as the list shows it. */
	private summarize(slot: number): SaveSlotSummary {
		const stored = this.stored.get(slot);

		if (stored === undefined) {
			return { slot, empty: true, chapter: "", number: 0, title: "", playtime: 0, savedOn: "", snapshot: "" };
		}

		const campaign = this.campaign();
		const chapter = chapterById(campaign, stored.chapter);

		return {
			slot,
			empty: false,
			chapter: stored.chapter,
			number: chapterNumber(campaign, stored.chapter),
			title: chapter === null ? stored.chapter : localizedText(chapter.title, this.i18n.getLocale(), this.i18n.getFallbackLocale()),
			playtime: stored.playtime,
			savedOn: formatSavedOn(stored.modifiedOn, this.i18n.getLocale()),
			snapshot: stored.screenshot
		};
	}

	/** A slot was chosen: its run is taken up, or a new one begun in it. An empty slot cannot be continued - nothing happens. */
	private onSlotChosen(event: CampaignSlotChosenEvent): void {
		const stored = this.stored.get(event.slot);

		if (event.purpose === SlotPurpose.CONTINUE && stored === undefined) {
			return;
		}

		// The list comes down first: switching to the card exits only the state
		// on top, and the title screen under the list has to be torn down too.
		if (this.stateManager.peek() instanceof SaveSlotState) {
			this.stateManager.pop();
		}

		if (event.purpose === SlotPurpose.CONTINUE && stored !== undefined) {
			this.continueRun(stored);
		} else {
			this.beginRun(event.slot);
		}
	}

	/** A fresh run at the campaign's first chapter, written to the slot. */
	private beginRun(slot: number): void {
		const campaign = this.campaign();
		const first = campaign.chapters[0];
		const data = CampaignComponent.begin(slot, first.id);

		this.install(data);
		this.write(data);
		this.startChapter(campaign, first);
	}

	/** The slot's run taken up again from the top of the chapter it was on, the dice where they were left. */
	private continueRun(stored: Savegame): void {
		const campaign = this.campaign();
		const chapter = chapterById(campaign, stored.chapter);

		if (chapter === null) {
			console.error(`The saved run is on chapter "${stored.chapter}", which this campaign does not have - starting over`);
			this.beginRun(stored.id);
			return;
		}

		this.install(CampaignComponent.fromSave(stored));
		setRandomState(stored.randomState);
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

		const prologue = chapterById(this.campaign(), data.chapter)?.prologue === true;

		for (const unit of unitsOfFaction(unitsInWorld(this.world), UnitFaction.PLAYER)) {
			const sheet = unit.getComponent(UnitComponent);
			const id = sheet.read().id;

			if (CampaignComponent.isFallen(data, id)) {
				this.world.unregisterEntity(unit);
				continue;
			}

			const veteran = CampaignComponent.veteran(data, id);

			if (veteran !== null) {
				// In the prologue a child keeps the level but carries what this battle hands out.
				const placed = sheet.read();
				sheet.update(rested(prologue ? { ...veteran, inventory: placed.inventory, weapon: placed.weapon } : veteran));
			}
		}

		const convoy = this.world.entityWith(ConvoyComponent);

		if (convoy !== null) {
			convoy.getComponent(ConvoyComponent).update({ items: data.convoy.map((entry) => ({ ...entry })) });
		}

		// New joiners are part of the army from here on - benched later, they are still carried.
		component.update(CampaignComponent.enrolled(component.read(), rosterOf(unitsInWorld(this.world))));
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

		const cleared = this.clearedRun(data, chapterById(campaign, data.chapter), next, roster, convoy);
		component.update(cleared);
		this.write(cleared);

		this.events.dispatch("campaign:chapterCleared", { chapter: data.chapter, next: next.id });
		this.startChapter(campaign, next);
	}

	/** What the run carries on to `next`: everything, or - leaving or inside the prologue - only what the story lets it. */
	private clearedRun(data: CampaignData, chapter: CampaignChapter | null, next: CampaignChapter, roster: UnitData[], convoy: InventoryEntry[]): CampaignData {
		if (chapter?.prologue !== true) {
			return CampaignComponent.cleared(data, roster, convoy, next.id);
		}

		return next.prologue === true ? CampaignComponent.prologueCleared(data, roster, next.id) : CampaignComponent.prologueEnded(data, next.id);
	}

	/** The run's entity - one at a time; a run begun over the top of another replaces it. */
	private install(data: CampaignData): void {
		const existing = this.world.entityWith(CampaignComponent);

		if (existing !== null) {
			this.world.unregisterEntity(existing);
		}

		this.world.createEntity().addComponent(CampaignComponent, data);
	}

	/**
	 * Fires a write of the run to its slot - the framework's snapshot of the
	 * world as it stands (the screen as the battle ended is the slot's picture)
	 * with the run laid into it; `campaign:saved` lands once the store has
	 * taken it.
	 */
	private write(data: CampaignData): void {
		const snapshot = snapshotWorld(this.world, this.stateManager, this.display, data.slot, data.playtime);
		const record = JSON.parse(JSON.stringify(CampaignComponent.toSave(data, snapshot, getRandomState()))) as Savegame;

		this.repository()
			.then((repository) => repository.save(record))
			.then(() => {
				this.stored.set(record.id, record);
				this.events.dispatch("campaign:saved", { slot: record.id });
			})
			.catch((error: unknown) => console.error("The run could not be saved:", error));
	}

	/** The saves' repository, as a promise so a store that is not connected fails the same way a failed read does. */
	private repository(): Promise<Repository<"savegames">> {
		return new Promise((resolve) => resolve(this.database.getRepository("savegames")));
	}

	/** The campaign sheet. It is a build error for the bundle not to carry one, so this throws rather than falling back. */
	private campaign(): CampaignDocument {
		return parseCampaign(this.assets.getJson(CAMPAIGN_ASSET));
	}
}

/** Whether what came out of the store is a save this build can take a run up from. */
function isCampaignSave(value: unknown): value is Savegame {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const data = value as Record<string, unknown>;

	return typeof data.id === "number" && typeof data.chapter === "string" && Array.isArray(data.roster) && Array.isArray(data.fallen) && Array.isArray(data.convoy) && Array.isArray(data.casualties);
}
