import { AudioTrack } from "@/core/audio/AudioTrack";
import { Sprite } from "@/core/graphics/components/Sprite";

export interface LoadableAssets {
	image: Sprite;
	audio: AudioTrack;
	video: HTMLVideoElement;
	font: FontFace;
	json: object;
	xml: XMLDocument;
	html: Document;
	css: HTMLLinkElement;
	javascript: HTMLScriptElement;
}
