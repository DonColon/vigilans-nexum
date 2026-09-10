import { GameError } from "@/core/GameError";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { DialogRequest } from "@/game/ui/states/DialogState";
import { DialogSide } from "@/game/ui/model/UILayout";

/**
 * The conversations two units can have when they stand next to each other -
 * Fire Emblem's "Talk". They are authored per scenario in
 * `src/assets/data/conversations/*.conversations.json` and shipped as JSON
 * assets, so the script is content like the unit sheets are.
 *
 * A conversation names the pair it belongs to and carries its pages with the
 * text for every locale side by side, which keeps prose out of the flat UI
 * string table and makes a missing translation visible in the same file.
 */

/** One page of script, in every language it has been written in, keyed by locale. */
export type LocalizedText = Record<string, string>;

/** A page as authored: who is speaking, and what they say. */
export interface ConversationPageDocument extends JsonSchema {
	/** **Unit id** of the speaker - resolved to the name on that unit's sheet. */
	speaker: string;
	text: LocalizedText;
}

export interface ConversationDocument extends JsonSchema {
	id: string;
	/** The two unit ids this conversation belongs to. Order does not matter. */
	between: string[];
	pages: ConversationPageDocument[];
}

/** An on-disk conversation sheet, one per scenario. */
export interface ConversationsDocument {
	format: "vigilans-conversations";
	version: 1;
	conversations: ConversationDocument[];
}

/** A validated conversation - the shape [[TalkComponent]] stores. */
export interface Conversation extends JsonSchema {
	id: string;
	between: string[];
	pages: ConversationPageDocument[];
}

/**
 * Turns a parsed `*.conversations.json` document into the conversations the
 * talk feature works with, rejecting the mistakes that would only show up as an
 * empty textbox: a pair that is not a pair, a conversation with nothing to say,
 * a page with no speaker or no text at all.
 */
export function parseConversations(document: ConversationsDocument): Conversation[] {
	if (document.format !== "vigilans-conversations") {
		throw new GameError(`Conversation sheet has format "${document.format}", expected "vigilans-conversations"`);
	}

	if (document.version !== 1) {
		throw new GameError(`Conversation sheet has version ${document.version}, this build reads version 1`);
	}

	if (!Array.isArray(document.conversations)) {
		throw new GameError("Conversation sheet is missing its conversations");
	}

	const seen = new Set<string>();

	return document.conversations.map((conversation) => {
		if (typeof conversation.id !== "string" || conversation.id.length === 0) {
			throw new GameError("A conversation is missing its id");
		}

		if (seen.has(conversation.id)) {
			throw new GameError(`Conversation "${conversation.id}" is defined twice`);
		}

		seen.add(conversation.id);

		if (!Array.isArray(conversation.between) || conversation.between.length !== 2) {
			throw new GameError(`Conversation "${conversation.id}" has to be between exactly two units`);
		}

		if (conversation.between[0] === conversation.between[1]) {
			throw new GameError(`Conversation "${conversation.id}" pairs a unit with itself`);
		}

		if (!Array.isArray(conversation.pages) || conversation.pages.length === 0) {
			throw new GameError(`Conversation "${conversation.id}" has no pages`);
		}

		for (const [index, page] of conversation.pages.entries()) {
			if (typeof page.speaker !== "string" || page.speaker.length === 0) {
				throw new GameError(`Page ${index} of conversation "${conversation.id}" is missing its speaker`);
			}

			if (typeof page.text !== "object" || page.text === null || Object.keys(page.text).length === 0) {
				throw new GameError(`Page ${index} of conversation "${conversation.id}" has no text in any locale`);
			}
		}

		return {
			id: conversation.id,
			between: [...conversation.between],
			pages: conversation.pages.map((page) => ({ speaker: page.speaker, text: { ...page.text } }))
		};
	});
}

/** Whether this conversation is the one between these two units, in either order. */
export function isBetween(conversation: Conversation, first: string, second: string): boolean {
	return conversation.between.includes(first) && conversation.between.includes(second);
}

/** The conversation these two units have, or null when they have nothing to say to each other. */
export function conversationBetween(conversations: readonly Conversation[], first: string, second: string): Conversation | null {
	return conversations.find((conversation) => isBetween(conversation, first, second)) ?? null;
}

/** Every unit `unitId` has a conversation with, whether or not they are standing next to each other. */
export function partnersOf(conversations: readonly Conversation[], unitId: string): string[] {
	return conversations.filter((conversation) => conversation.between.includes(unitId)).map((conversation) => conversation.between.find((id) => id !== unitId) as string);
}

/**
 * The page's text in `locale`, falling back to `fallbackLocale` and then to
 * whatever language it was written in - an untranslated page still reads,
 * rather than showing an empty box.
 */
export function pageText(page: ConversationPageDocument, locale: string, fallbackLocale: string): string {
	return page.text[locale] ?? page.text[fallbackLocale] ?? Object.values(page.text)[0] ?? "";
}

/**
 * The two speakers hold an end of the screen each, Radiant Dawn style: whoever
 * opens the conversation keeps the top for all of their pages, and whoever
 * answers keeps the bottom. Any further voice joins the answering side.
 */
export function conversationSides(conversation: Conversation): DialogSide[] {
	const opener = conversation.pages[0]?.speaker;

	return conversation.pages.map((page) => (page.speaker === opener ? DialogSide.TOP : DialogSide.BOTTOM));
}

/**
 * Lays a conversation out as a textbox: one page per page, each labelled with
 * the speaker's own name and pinned to that speaker's end of the screen. The
 * text is not broken by hand - the box wraps it to its own width.
 *
 * `nameOf` resolves a unit id to the name on its sheet, so a character is never
 * spelled out twice - an id with no unit behind it is left as it is rather than
 * silently losing its label.
 */
export function conversationDialog(conversation: Conversation, locale: string, fallbackLocale: string, nameOf: (unitId: string) => string | null): DialogRequest {
	return {
		id: `talk-${conversation.id}`,
		pages: conversation.pages.map((page) => pageText(page, locale, fallbackLocale)),
		speakers: conversation.pages.map((page) => nameOf(page.speaker) ?? page.speaker),
		sides: conversationSides(conversation)
	};
}
