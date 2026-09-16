import { test, expect, suite } from "vitest";
import { i18n } from "@/core/i18n/I18n";
import { ObjectiveData } from "@/game/objective/components/ObjectiveComponent";
import { WinCondition } from "@/game/objective/content/Objectives";
import { loseText, OBJECTIVE_WIDTH, objectiveHeight, objectiveLines, objectivePanel, winText } from "@/game/objective/view/ObjectiveScreen";
import { seizeMarkerBob, SeizeMarkerTheme } from "@/game/objective/view/SeizeMarker";
import { UITheme } from "@/game/ui/view/UITheme";

/**
 * The objective readout as text: what it says for a rout and a seize, what it
 * says about losing, and where the panel sits.
 */
suite("Objective Screen Test Suite", () => {
	const seize: ObjectiveData = { win: WinCondition.SEIZE, seizeColumn: 12, seizeRow: 5, outcome: "" };
	const rout: ObjectiveData = { win: WinCondition.ROUT, seizeColumn: -1, seizeRow: -1, outcome: "" };

	suite("What wins", () => {
		test("A rout asks for every enemy", () => {
			expect(winText(rout)).toBe(i18n("objective.winRout"));
		});

		test("A seize points at the flag on the map, whatever tile it stands on", () => {
			expect(winText(seize)).toBe(i18n("objective.winSeize"));
			expect(winText(seize)).not.toBe(winText(rout));
		});
	});

	suite("What loses", () => {
		test("Names the commander while there is one", () => {
			expect(loseText("Dardan")).toBe(i18n("objective.loseCommander", { name: "Dardan" }));
			expect(loseText("Dardan")).toContain("Dardan");
		});

		test("Without a commander on the map it is the army alone", () => {
			expect(loseText(null)).toBe(i18n("objective.loseArmy"));
		});
	});

	suite("The lines", () => {
		test("Win, lose, enemies left and the turn, in that order", () => {
			const lines = objectiveLines(seize, "Dardan", 2, 4);

			expect(lines.map((line) => line.label)).toStrictEqual([i18n("objective.win"), i18n("objective.lose"), i18n("objective.enemies"), i18n("turn.label")]);
			expect(lines.map((line) => line.value)).toStrictEqual([winText(seize), loseText("Dardan"), "2", "4"]);
		});
	});

	suite("Layout", () => {
		test("The panel is centred and sized to its lines", () => {
			const panel = objectivePanel({ width: 1280, height: 720 }, 4);

			expect(panel.getWidth()).toBe(OBJECTIVE_WIDTH);
			expect(panel.getHeight()).toBe(objectiveHeight(4));
			expect(panel.getPosition().x).toBe(Math.round((1280 - OBJECTIVE_WIDTH) / 2));
			expect(panel.getPosition().y).toBe(Math.round((720 - objectiveHeight(4)) / 2));
		});

		test("It narrows on a screen too small to hold it rather than running off", () => {
			const panel = objectivePanel({ width: 400, height: 300 }, 4);

			expect(panel.getWidth()).toBe(400 - 2 * UITheme.padding);
			expect(panel.getPosition().x).toBe(UITheme.padding);
		});
	});
	suite("Seize marker", () => {
		test("The flag rests on its tile and only ever rises from it, by whole source pixels", () => {
			const offsets = new Set<number>();

			for (let time = 0; time <= SeizeMarkerTheme.bobPeriod * 2; time += 50) {
				const offset = seizeMarkerBob(time);

				expect(Number.isInteger(offset)).toBe(true);
				expect(offset).toBeLessThanOrEqual(0);
				expect(offset).toBeGreaterThanOrEqual(-SeizeMarkerTheme.bobAmplitude);
				offsets.add(offset);
			}

			// It does move: both the rest and the top of the rise are reached.
			expect(offsets.has(0)).toBe(true);
			expect(offsets.has(-SeizeMarkerTheme.bobAmplitude)).toBe(true);
		});
	});
});
