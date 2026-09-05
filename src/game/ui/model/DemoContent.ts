import { getTerrainProperties } from "@/game/map/model/Terrain";
import { DialogRequest } from "@/game/ui/states/DialogState";
import { MenuRequest } from "@/game/ui/states/MenuState";

/**
 * The content behind the built-in demo: pressing confirm on a map tile opens
 * this menu, and two of its rows open the dialogs below. None of this is load
 * bearing - it is here so `npm start` shows the textbox reveal and the menu
 * without any extra setup. Turn it off with `new UIFeature({ demo: false })`.
 */

const TITLE_CASE = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const DEMO_MENU_ID = "tile-actions";

export function tileActionsMenu(terrain: string): MenuRequest {
	return {
		id: DEMO_MENU_ID,
		title: TITLE_CASE(terrain),
		items: ["Untersuchen", "Überlieferung", "Warten", "Zurück"]
	};
}

export function terrainDialog(terrain: string, column: number, row: number): DialogRequest {
	const properties = getTerrainProperties(terrain as Parameters<typeof getTerrainProperties>[0]);

	return {
		id: "terrain-inspect",
		speaker: "Aufklärung",
		pages: [
			`Feld ${column}, ${row} - ${TITLE_CASE(terrain)}.\n` +
				`Bewegungskosten: ${Number.isFinite(properties.movementCost) ? properties.movementCost : "unpassierbar"}.\n` +
				`Verteidigung +${properties.defense}, Ausweichen +${properties.avoid}.`
		]
	};
}

export const LORE_DIALOG: DialogRequest = {
	id: "lore",
	speaker: "Chronik von Nexum",
	pages: [
		"Vor den Bannerkriegen war das Tal von Nexum ein einziger Garten,\n" +
			"gepflegt von den Wächtern des Ersten Lichts.\n" +
			"Ihre Türme standen an jeder Furt und jedem Pass,\n" +
			"und kein Heer zog hindurch ohne ihr Wissen.",
		"Dann kam der lange Winter, und mit ihm die Aschekönige.\n" +
			"Die Wächter fielen einer nach dem anderen,\n" +
			"ihre Türme erloschen wie Kerzen im Sturm,\n" +
			"bis nur noch die Zitadelle im Norden brannte.",
		"Heute reisen wir denselben Weg,\n" + "vorbei an den stummen Fundamenten der alten Wache.\n" + "Was sie nicht halten konnten, sollen wir zurückgewinnen -\n" + "Furt um Furt, Pass um Pass."
	]
};
