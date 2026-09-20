import { test, expect, suite, afterEach } from "vitest";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { CampaignComponent } from "@/game/campaign/components/CampaignComponent";
import { CAMPAIGN_ASSET, chapterAfter, chapterById, chapterNumber, parseCampaign } from "@/game/campaign/content/Campaigns";
import { rested, rosterOf } from "@/game/campaign/rules/Roster";
import { chapterCardAcceptsPress, chapterCardAlpha, CHAPTER_FADE_IN, CHAPTER_HOLD_MS } from "@/game/campaign/view/ChapterCard";
import { SaveSlotComponent, SlotPurpose } from "@/game/campaign/components/SaveSlotComponent";
import { formatPlaytime, formatSavedOn, SLOT_GAP, slotPanelHeight, slotPanels, slotThumbnailBox } from "@/game/campaign/view/SaveSlots";
import { titleAlpha, titleRows, TitleRow } from "@/game/campaign/view/TitleScreen";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { mapAsset, scenarioAsset } from "@/game/map/content/Scenario";
import { UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import campaignDocument from "@/assets/data/campaign/campaign.json";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import eliraDocument from "@/assets/data/units/elira.unit.json";
import hasanDocument from "@/assets/data/units/hasan.unit.json";

/** The campaign sheet, the run's record and what a chapter hands the next one - all pure. */
suite("Campaign Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const assets = ServiceRegistry.get<AssetStorage>(AssetStorage.name);

	world.registerComponent(UnitComponent);
	world.registerComponent(GridPositionComponent);

	const spawned: Entity[] = [];

	const spawn = (document: unknown, column = 0, row = 0, overrides: Partial<UnitData> = {}) => {
		const entity = world.createEntity();
		entity.addComponent(UnitComponent, { ...buildUnit(document as UnitDocument), ...overrides } as UnitData);
		entity.addComponent(GridPositionComponent, { column, row });
		spawned.push(entity);
		return entity;
	};

	afterEach(() => {
		while (spawned.length > 0) {
			world.unregisterEntity(spawned.pop() as Entity);
		}
	});

	suite("The campaign sheet", () => {
		test("The shipped sheet parses and every chapter's scenario documents and map are in the bundle", () => {
			const campaign = parseCampaign(campaignDocument);

			expect(campaign.chapters.length).toBeGreaterThanOrEqual(2);

			for (const chapter of campaign.chapters) {
				for (const kind of ["deployment", "houses", "locks", "conversations"]) {
					expect(() => assets.getJson(scenarioAsset(kind, chapter.id)), `${kind} of "${chapter.id}"`).not.toThrow();
				}

				expect(() => assets.getJson(mapAsset(chapter.map)), `map of "${chapter.id}"`).not.toThrow();
				expect(Object.keys(chapter.title).sort()).toStrictEqual(["de", "en"]);
			}

			expect(assets.getJson(CAMPAIGN_ASSET)).toStrictEqual(campaignDocument);
		});

		test("The sheet's shape is checked", () => {
			const chapter = { id: "one", title: { en: "One" }, map: "fantasy" };

			expect(() => parseCampaign(null)).toThrow(/not an object/);
			expect(() => parseCampaign({ format: "other", version: 1, chapters: [chapter] })).toThrow(/format/);
			expect(() => parseCampaign({ format: "vigilans-campaign", version: 2, chapters: [chapter] })).toThrow(/version/);
			expect(() => parseCampaign({ format: "vigilans-campaign", version: 1, chapters: [] })).toThrow(/at least one chapter/);
			expect(() => parseCampaign({ format: "vigilans-campaign", version: 1, chapters: [{ ...chapter, id: "" }] })).toThrow(/missing its id/);
			expect(() => parseCampaign({ format: "vigilans-campaign", version: 1, chapters: [chapter, chapter] })).toThrow(/twice/);
			expect(() => parseCampaign({ format: "vigilans-campaign", version: 1, chapters: [{ ...chapter, map: "" }] })).toThrow(/map/);
			expect(() => parseCampaign({ format: "vigilans-campaign", version: 1, chapters: [{ ...chapter, title: "One" }] })).toThrow(/title per locale/);
			expect(() => parseCampaign({ format: "vigilans-campaign", version: 1, chapters: [{ ...chapter, title: {} }] })).toThrow(/title per locale/);
		});

		test("Chapters are found by id, numbered by their place, and followed by the next in the list", () => {
			const campaign = parseCampaign(campaignDocument);
			const [first, second] = campaign.chapters;

			expect(chapterById(campaign, first.id)).toBe(first);
			expect(chapterById(campaign, "nowhere")).toBeNull();

			expect(chapterNumber(campaign, first.id)).toBe(1);
			expect(chapterNumber(campaign, second.id)).toBe(2);
			expect(chapterNumber(campaign, "nowhere")).toBe(0);

			expect(chapterAfter(campaign, first.id)).toBe(second);
			expect(chapterAfter(campaign, campaign.chapters.at(-1)!.id)).toBeNull();
			expect(chapterAfter(campaign, "nowhere")).toBeNull();
		});
	});

	suite("The run's record", () => {
		test("A run begins at its chapter with nobody a veteran and nobody fallen", () => {
			const data = CampaignComponent.begin(1, "skirmish");

			expect(data).toStrictEqual({ slot: 1, chapter: "skirmish", roster: [], fallen: [], convoy: [], casualties: [], playtime: 0 });
			expect(CampaignComponent.played(data, 1500).playtime).toBe(1500);
			expect(CampaignComponent.veteran(data, "dardan")).toBeNull();
			expect(CampaignComponent.isFallen(data, "dardan")).toBe(false);
		});

		test("A casualty is noted once, and forgotten when the battle is opened again", () => {
			const begun = CampaignComponent.begin(1, "skirmish");
			const noted = CampaignComponent.withCasualty(CampaignComponent.withCasualty(begun, "elira"), "elira");

			expect(noted.casualties).toStrictEqual(["elira"]);
			expect(begun.casualties).toStrictEqual([]);
			expect(CampaignComponent.withCasualty(noted, "elira")).toBe(noted);
			expect(CampaignComponent.opened(noted).casualties).toStrictEqual([]);
			expect(CampaignComponent.isFallen(noted, "elira")).toBe(false);
		});

		test("Clearing a chapter moves the run on with the survivors as veterans and the casualties fallen for good", () => {
			const dardan = buildUnit(dardanDocument as UnitDocument);
			const begun = CampaignComponent.withCasualty(CampaignComponent.begin(1, "skirmish"), "elira");
			const item = { ...dardan.inventory[0], equipped: false };

			const cleared = CampaignComponent.cleared(begun, [{ ...dardan, level: 4 }], [item], "river");

			expect(cleared).toMatchObject({ slot: 1, chapter: "river", fallen: ["elira"], casualties: [] });
			expect(cleared.convoy).toStrictEqual([item]);
			expect(cleared.convoy[0]).not.toBe(item);
			expect(CampaignComponent.veteran(cleared, "dardan")?.level).toBe(4);
			expect(CampaignComponent.isFallen(cleared, "elira")).toBe(true);
			expect(begun.chapter).toBe("skirmish");

			// Fallen twice - noted again in a later chapter's attempt - is listed once.
			const again = CampaignComponent.cleared(CampaignComponent.withCasualty(cleared, "elira"), [], [], "third");
			expect(again.fallen).toStrictEqual(["elira"]);
		});

		test("The run is laid into the framework's save and taken back out of it, the world's snapshot and the dice around it", () => {
			const dardan = buildUnit(dardanDocument as UnitDocument);
			const run = { ...CampaignComponent.begin(2, "river"), roster: [dardan], fallen: ["elira"], playtime: 4200 };
			const snapshot = { id: 0, playtime: 0, modifiedOn: "2026-09-20T00:00:00.000Z", screenshot: "data:image/jpeg;base64,x", currentState: ["map"], entities: [] };

			const save = CampaignComponent.toSave(run, snapshot, 12345);
			expect(save).toMatchObject({
				id: 2,
				playtime: 4200,
				modifiedOn: "2026-09-20T00:00:00.000Z",
				screenshot: "data:image/jpeg;base64,x",
				currentState: ["map"],
				randomState: 12345,
				chapter: "river",
				fallen: ["elira"]
			});
			expect(save.roster[0]).toStrictEqual(dardan);
			expect(save.roster[0]).not.toBe(dardan);

			expect(CampaignComponent.fromSave(save)).toStrictEqual(run);
		});
	});

	suite("The roster", () => {
		test("The roster is the player's units, rested, and never the enemy's", () => {
			const dardan = spawn(dardanDocument, 1, 1);
			const elira = spawn(eliraDocument, 2, 1);
			const hasan = spawn(hasanDocument, 5, 5);

			const wounded = dardan.getComponent(UnitComponent);
			wounded.update({ ...wounded.read(), currentHP: 3, hasMoved: true, level: 6 });

			const roster = rosterOf([dardan, elira, hasan]);

			expect(roster.map((unit) => unit.id)).toStrictEqual(["dardan", "elira"]);
			expect(roster[0]).toMatchObject({ level: 6, currentHP: wounded.read().stats.hp, hasMoved: false });
			// Read, not changed: the unit on the map is still wounded and spent.
			expect(wounded.read()).toMatchObject({ currentHP: 3, hasMoved: true });
		});

		test("A rested sheet has its readied weapon pointing at the pack entry that mirrors it", () => {
			const dardan = buildUnit(dardanDocument as UnitDocument);
			const equipped = dardan.inventory.findIndex((entry) => entry.equipped);
			expect(equipped).toBeGreaterThanOrEqual(0);

			// The way a sheet comes back out of the store: the two no longer one object.
			const stored = JSON.parse(JSON.stringify({ ...dardan, currentHP: 1, hasMoved: true })) as UnitData;
			expect(stored.weapon).not.toBe(stored.inventory[equipped].weapon);

			const restored = rested(stored);

			expect(restored.weapon).toBe(restored.inventory[equipped].weapon);
			expect(restored).toMatchObject({ currentHP: dardan.stats.hp, hasMoved: false });
			expect(restored.inventory).not.toBe(stored.inventory);
		});

		test("A unit that has put its weapon away rests with none readied", () => {
			const unequipped = UnitComponent.unequip(buildUnit(dardanDocument as UnitDocument));

			expect(rested(unequipped).weapon).toBeNull();
		});
	});

	suite("The screens' clocks", () => {
		test("The title offers a fresh run always and the saved one first when there is one", () => {
			expect(titleRows(false)).toStrictEqual([TitleRow.NEW_GAME]);
			expect(titleRows(true)).toStrictEqual([TitleRow.CONTINUE, TitleRow.NEW_GAME]);
		});

		test("The title and the card fade in over their first moments, and the card takes a press only once it has been read", () => {
			expect(titleAlpha(0)).toBe(0);
			expect(titleAlpha(10_000)).toBe(1);
			expect(chapterCardAlpha(CHAPTER_FADE_IN / 2)).toBeCloseTo(0.5);
			expect(chapterCardAlpha(CHAPTER_FADE_IN)).toBe(1);
			expect(chapterCardAcceptsPress(CHAPTER_HOLD_MS - 1)).toBe(false);
			expect(chapterCardAcceptsPress(CHAPTER_HOLD_MS)).toBe(true);
		});
	});

	suite("The save slot list", () => {
		const empty = { slot: 1, empty: true, chapter: "", number: 0, title: "", playtime: 0, savedOn: "", snapshot: "" };
		const held = { ...empty, slot: 2, empty: false, chapter: "river", number: 2, title: "River", playtime: 60_000 };

		test("Playtime reads as a clock, and the date in the player's format - or not at all for a run never written", () => {
			expect(formatPlaytime(0)).toBe("0:00:00");
			expect(formatPlaytime(3_725_000)).toBe("1:02:05");
			expect(formatPlaytime(36_000_000 + 59_000)).toBe("10:00:59");
			expect(formatSavedOn("2026-09-19T12:00:00.000Z", "en-US")).toContain("2026");
			expect(formatSavedOn("", "en-US")).toBe("");
			expect(formatSavedOn("yesterday", "en-US")).toBe("");
		});

		test("The panels stack down the middle of the screen, each with room for three lines and a thumbnail at the snapshot's ratio", () => {
			const viewport = { width: 1536, height: 768 };
			const panels = slotPanels(viewport, 3);

			expect(panels).toHaveLength(3);
			expect(panels[0].getPosition().x + panels[0].getWidth() / 2).toBe(viewport.width / 2);
			expect(panels[1].getPosition().y - panels[0].getPosition().y).toBe(slotPanelHeight() + SLOT_GAP);
			expect(panels[2].getPosition().y + panels[2].getHeight()).toBeLessThan(viewport.height);

			const thumbnail = slotThumbnailBox(panels[0]);
			expect(thumbnail.getPosition().x).toBeGreaterThan(panels[0].getPosition().x);
			expect(thumbnail.getWidth() / thumbnail.getHeight()).toBeCloseTo(2, 1);
			expect(thumbnail.getPosition().y + thumbnail.getHeight()).toBeLessThan(panels[0].getPosition().y + panels[0].getHeight());
		});

		test("A slot can be chosen to continue only when it holds a run, and for a new game always", () => {
			const toContinue = SaveSlotComponent.open(SlotPurpose.CONTINUE, [empty, held], 0);

			expect(SaveSlotComponent.selected(toContinue)?.slot).toBe(1);
			expect(SaveSlotComponent.canChoose(toContinue)).toBe(false);
			expect(SaveSlotComponent.canChoose({ ...toContinue, selectedIndex: 1 })).toBe(true);
			expect(SaveSlotComponent.canChoose(SaveSlotComponent.open(SlotPurpose.NEW_GAME, [empty, held], 0))).toBe(true);
			// The highlight is kept on a row that exists.
			expect(SaveSlotComponent.open(SlotPurpose.NEW_GAME, [empty], 5).selectedIndex).toBe(0);
		});
	});
});
