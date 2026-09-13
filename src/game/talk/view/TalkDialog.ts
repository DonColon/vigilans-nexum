import { localizedText } from "@/core/i18n/LocalizedText";
import { DialogRequest } from "@/game/ui/states/DialogState";
import { DialogSide } from "@/game/ui/view/UILayout";
import { Conversation, ConversationPageDocument } from "@/game/talk/content/Conversations";

/**
 * The page's text in `locale`, falling back to `fallbackLocale` and then to
 * whatever language it was written in - an untranslated page still reads,
 * rather than showing an empty box.
 */
export function pageText(page: ConversationPageDocument, locale: string, fallbackLocale: string): string {
	return localizedText(page.text, locale, fallbackLocale);
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
