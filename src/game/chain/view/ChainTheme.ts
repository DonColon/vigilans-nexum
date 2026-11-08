import { Color } from "@/core/graphics/color/Color";
import { i18n } from "@/core/i18n/I18n";
import { MenuRequest } from "@/game/ui/states/MenuState";

/** Menu id of the chain preview, echoed by the `ui:menu*` events. */
export const CHAIN_MENU = "chain-attack";

/** Wide enough for three given names and the arrows between them. */
const CHAIN_MENU_WIDTH = 420;

/** Sits between the two ids of a formation in a menu row's id. */
const PAIR_SEPARATOR = "|";

/** The colours and sizes of the shield bar over a Special enemy. */
export const ChainTheme = {
	/** A point still on the bar. */
	point: Color.hex("#7fd4ff"),
	/** A point worn away. */
	spent: Color.hex("#1c2738"),
	outline: Color.hex("#0b0f18"),
	height: 5,
	inset: 2,
	gap: 1
} as const;

/** One formation on offer: the two allies who would strike after the unit that started the chain. */
export interface ChainFormation {
	firstId: string;
	firstName: string;
	secondId: string;
	secondName: string;
}

/** "Dardan Niveli" -> "Dardan". A row has room for three given names. */
function givenName(name: string): string {
	return name.split(/\s+/)[0] ?? name;
}

/** The two ids a chosen row of the preview names. */
export function chainFormationIds(row: string): [string, string] {
	const [first = "", second = ""] = row.split(PAIR_SEPARATOR);

	return [first, second];
}

/**
 * The preview before a chain starts: one row per formation, reading the three
 * strikes in order, under a title that says the first of them breaks the shield.
 */
export function chainMenuRequest(moverName: string, formations: readonly ChainFormation[]): Omit<MenuRequest, "anchor"> {
	return {
		id: CHAIN_MENU,
		title: i18n("chain.preview"),
		items: formations.map((formation) => [moverName, formation.firstName, formation.secondName].map(givenName).join(" > ")),
		ids: formations.map((formation) => `${formation.firstId}${PAIR_SEPARATOR}${formation.secondId}`),
		width: CHAIN_MENU_WIDTH
	};
}
