import { AudioClip } from "@/core/audio/AudioClip";
import { Sprite } from "@/core/graphics/components/Sprite";

export interface LoadableAssets {
	image: Sprite;
	audio: AudioClip;
	video: HTMLVideoElement;
	font: FontFace;
	json: object;
	xml: XMLDocument;
	html: Document;
	css: HTMLLinkElement;
	javascript: HTMLScriptElement;
}
