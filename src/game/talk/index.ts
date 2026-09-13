export { TalkFeature } from "@/game/talk/TalkFeature";

export { TalkComponent } from "@/game/talk/components/TalkComponent";
export type { TalkData } from "@/game/talk/components/TalkComponent";
export { TalkChoiceComponent } from "@/game/talk/components/TalkChoiceComponent";
export type { TalkChoiceData } from "@/game/talk/components/TalkChoiceComponent";

export { TalkState } from "@/game/talk/states/TalkState";
export type { TalkRequest } from "@/game/talk/states/TalkState";
export { talkCommands } from "@/game/talk/commands/TalkCommands";

export { availableTalks, availableTalk, canTalk } from "@/game/talk/rules/Talks";
export type { AvailableTalk } from "@/game/talk/rules/Talks";
export { TalkChoiceSystem } from "@/game/talk/systems/TalkChoiceSystem";

export { parseConversations, conversationBetween, partnersOf, isBetween } from "@/game/talk/content/Conversations";
export { conversationDialog, conversationSides, pageText } from "@/game/talk/view/TalkDialog";
export type { Conversation, ConversationsDocument, ConversationDocument, ConversationPageDocument, LocalizedText } from "@/game/talk/content/Conversations";
