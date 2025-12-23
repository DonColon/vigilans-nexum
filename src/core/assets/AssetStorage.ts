import { AudioTrack } from "core/audio/AudioTrack";
import { Sprite } from "core/graphics/Sprite";
import { GameError } from "core/GameError";
import { GameCoreService } from "../service/GameCoreService";
import { EventSystem } from "../events/EventSystem";
import { AssetLoadedEvent } from "./AssetLoadedEvent";

@GameCoreService()
export class AssetStorage {
	private audio: Map<string, AudioTrack>;
	private images: Map<string, Sprite>;
	private videos: Map<string, HTMLVideoElement>;
	private jsons: Map<string, object>;
	private xmls: Map<string, XMLDocument>;
	private htmls: Map<string, Document>;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	constructor() {
		this.audio = new Map<string, AudioTrack>();
		this.images = new Map<string, Sprite>();
		this.videos = new Map<string, HTMLVideoElement>();
		this.jsons = new Map<string, object>();
		this.xmls = new Map<string, XMLDocument>();
		this.htmls = new Map<string, Document>();

		this.eventSystem.subscribe("assetLoaded", (event) => this.onAssetLoaded(event));
	}

	private onAssetLoaded(event: AssetLoadedEvent) {
		if (event.assetType === "image") {
			this.images.set(event.assetID, event.payload);
		} else if (event.assetType === "audio") {
			this.audio.set(event.assetID, event.payload);
		} else if (event.assetType === "video") {
			this.videos.set(event.assetID, event.payload);
		} else if (event.assetType === "font") {
			document.fonts.add(event.payload);
		} else if (event.assetType === "json") {
			this.jsons.set(event.assetID, event.payload);
		} else if (event.assetType === "xml") {
			this.xmls.set(event.assetID, event.payload);
		} else if (event.assetType === "html") {
			this.htmls.set(event.assetID, event.payload);
		} else if (event.assetType === "css") {
			document.head.appendChild(event.payload);
		} else if (event.assetType === "javascript") {
			document.body.appendChild(event.payload);
		}
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

	public getJson<T extends object>(id: string): T {
		const json = this.jsons.get(id);

		if (json === undefined) {
			throw new GameError(`JSON ${id} does not exist`);
		}

		return json as T;
	}

	public setJson<T extends object>(id: string, json: T) {
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
