import { AudioTrack } from "../audio/AudioTrack";
import { Sprite } from "../graphics/Sprite";

export interface LoadableAssets {
    "image": Sprite;
    "audio": AudioTrack;
    "video": HTMLVideoElement;
    "font": FontFace;
    "json": object;
    "xml": XMLDocument;
    "html": Document;
    "css": HTMLLinkElement;
    "javascript": HTMLScriptElement;
}