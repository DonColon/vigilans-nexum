export { TalkFeature } from "@/game/talk/TalkFeature";

export { TalkComponent } from "@/game/talk/components/TalkComponent";
export type { TalkData } from "@/game/talk/components/TalkComponent";
export { TalkChoiceComponent } from "@/game/talk/components/TalkChoiceComponent";
export type { TalkChoiceData } from "@/game/talk/components/TalkChoiceComponent";

export { TalkState } from "@/game/talk/states/TalkState";
export type { TalkRequest } from "@/game/talk/states/TalkState";
export { talkCommands } from "@/game/talk/commands/TalkCommands";

export { TalkSystem } from "@/game/talk/systems/TalkSystem";
export { TalkChoiceSystem } from "@/game/talk/systems/TalkChoiceSystem";

export { parseConversations, conversationBetween, conversationDialog, conversationSides, partnersOf, pageText, isBetween } from "@/game/talk/model/Conversations";
export type { Conversation, ConversationsDocument, ConversationDocument, ConversationPageDocument, LocalizedText } from "@/game/talk/model/Conversations";
