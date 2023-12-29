import { AudioTrack } from "core/audio/AudioTrack";
import { Sprite } from "core/graphics/Sprite";
import { GameError } from "core/GameError";
import { AudioLoadedEvent } from "./AudioLoadedEvent";
import { ImageLoadedEvent } from "./ImageLoadedEvent";
import { FontLoadedEvent } from "./FontLoadedEvent";
import { JsonLoadedEvent } from "./JsonLoadedEvent";
import { XmlLoadedEvent } from "./XmlLoadedEvent";
import { HtmlLoadedEvent } from "./HtmlLoadedEvent";
import { CssLoadedEvent } from "./CssLoadedEvent";
import { ScriptLoadedEvent } from "./ScriptLoadedEvent";
import { VideoLoadedEvent } from "./VideoLoadedEvent";

export class AssetStorage {
	private audio: Map<string, AudioTrack>;
	private images: Map<string, Sprite>;
	private videos: Map<string, HTMLVideoElement>;
	private jsons: Map<string, object>;
	private xmls: Map<string, XMLDocument>;
	private htmls: Map<string, Document>;

	constructor() {
		this.audio = new Map<string, AudioTrack>();
		this.images = new Map<string, Sprite>();
		this.videos = new Map<string, HTMLVideoElement>();
		this.jsons = new Map<string, object>();
		this.xmls = new Map<string, XMLDocument>();
		this.htmls = new Map<string, Document>();

		eventSystem.subscribe("audioLoaded", (event) => this.onAudioLoaded(event));
		eventSystem.subscribe("imageLoaded", (event) => this.onImageLoaded(event));
		eventSystem.subscribe("videoLoaded", (event) => this.onVideoLoaded(event));
		eventSystem.subscribe("fontLoaded", (event) => this.onFontLoaded(event));
		eventSystem.subscribe("jsonLoaded", (event) => this.onJsonLoaded(event));
		eventSystem.subscribe("xmlLoaded", (event) => this.onXmlLoaded(event));
		eventSystem.subscribe("htmlLoaded", (event) => this.onHtmlLoaded(event));
		eventSystem.subscribe("cssLoaded", (event) => this.onCssLoaded(event));
		eventSystem.subscribe("scriptLoaded", (event) => this.onScriptLoaded(event));
	}

	private onImageLoaded(event: ImageLoadedEvent) {
		this.images.set(event.assetID, event.image);
	}

	private onAudioLoaded(event: AudioLoadedEvent) {
		this.audio.set(event.assetID, event.track);
	}

	private onVideoLoaded(event: VideoLoadedEvent) {
		this.videos.set(event.assetID, event.video);
	}

	private onFontLoaded(event: FontLoadedEvent) {
		document.fonts.add(event.font);
	}

	private onJsonLoaded(event: JsonLoadedEvent) {
		this.jsons.set(event.assetID, event.json);
	}

	private onXmlLoaded(event: XmlLoadedEvent) {
		this.xmls.set(event.assetID, event.xml);
	}

	private onHtmlLoaded(event: HtmlLoadedEvent) {
		this.htmls.set(event.assetID, event.html);
	}

	private onCssLoaded(event: CssLoadedEvent) {
		document.head.appendChild(event.css);
	}

	private onScriptLoaded(event: ScriptLoadedEvent) {
		document.body.appendChild(event.script);
	}

	public getAudio(id: string): AudioTrack {
		const track = this.audio.get(id);

		if (track === undefined) {
			throw new GameError(`Track ${id} does not exist`);
		}

		return track;
	}

	public setAudio(id: string, track: AudioTrack) {
		this.audio.set(id, track);
	}

	public getImage(id: string): Sprite {
		const image = this.images.get(id);

		if (image === undefined) {
			throw new GameError(`Image ${id} does not exist`);
		}

		return image;
	}

	public setImage(id: string, image: Sprite) {
		this.images.set(id, image);
	}

	public getVideo(id: string): HTMLVideoElement {
		const video = this.videos.get(id);

		if (video === undefined) {
			throw new GameError(`Video ${id} does not exist`);
		}

		return video;
	}

	public setVideo(id: string, video: HTMLVideoElement) {
		this.videos.set(id, video);
	}

	public getJson(id: string): object {
		const json = this.jsons.get(id);

		if (json === undefined) {
			throw new GameError(`JSON ${id} does not exist`);
		}

		return json;
	}

	public setJson(id: string, json: object) {
		this.jsons.set(id, json);
	}

	public getXml(id: string): XMLDocument {
		const xml = this.xmls.get(id);

		if (xml === undefined) {
			throw new GameError(`XML ${id} does not exist`);
		}

		return xml;
	}

	public setXml(id: string, xml: XMLDocument) {
		this.xmls.set(id, xml);
	}

	public getHtml(id: string): Document {
		const html = this.htmls.get(id);

		if (html === undefined) {
			throw new GameError(`HTML ${id} does not exist`);
		}

		return html;
	}

	public setHtml(id: string, html: Document) {
		this.htmls.set(id, html);
	}
}
