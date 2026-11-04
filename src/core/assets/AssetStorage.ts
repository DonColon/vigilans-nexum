import { AudioClip } from "@/core/audio/AudioClip";
import { Sprite } from "@/core/graphics/components/Sprite";
import { Spritesheet } from "@/core/graphics/components/Spritesheet";
import { GameError } from "@/core/GameError";
import { GameCoreService } from "@/core/service/GameCoreService";

@GameCoreService()
export class AssetStorage {
	private audio: Map<string, AudioClip>;
	private images: Map<string, Sprite>;
	private spritesheets: Map<string, Spritesheet>;
	private videos: Map<string, HTMLVideoElement>;
	private fonts: Map<string, FontFace>;
	private jsons: Map<string, object>;
	private xmls: Map<string, XMLDocument>;
	private htmls: Map<string, Document>;
	private stylesheets: Map<string, HTMLStyleElement>;
	private scripts: Map<string, HTMLScriptElement>;

	constructor() {
		this.audio = new Map<string, AudioClip>();
		this.images = new Map<string, Sprite>();
		this.spritesheets = new Map<string, Spritesheet>();
		this.videos = new Map<string, HTMLVideoElement>();
		this.fonts = new Map<string, FontFace>();
		this.jsons = new Map<string, object>();
		this.xmls = new Map<string, XMLDocument>();
		this.htmls = new Map<string, Document>();
		this.stylesheets = new Map<string, HTMLStyleElement>();
		this.scripts = new Map<string, HTMLScriptElement>();
	}

	public getAudio(id: string): AudioClip {
		const clip = this.audio.get(id);

		if (clip === undefined) {
			throw new GameError(`Audio ${id} does not exist`);
		}

		return clip;
	}

	public setAudio(id: string, clip: AudioClip) {
		this.audio.set(id, clip);
	}

	public deleteAudio(id: string): boolean {
		return this.audio.delete(id);
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

	public deleteImage(id: string): boolean {
		return this.images.delete(id);
	}

	public getSpritesheet(id: string): Spritesheet {
		const spritesheet = this.spritesheets.get(id);

		if (spritesheet === undefined) {
			throw new GameError(`Spritesheet ${id} does not exist`);
		}

		return spritesheet;
	}

	public hasSpritesheet(id: string): boolean {
		return this.spritesheets.has(id);
	}

	public setSpritesheet(id: string, spritesheet: Spritesheet) {
		this.spritesheets.set(id, spritesheet);
	}

	public deleteSpritesheet(id: string): boolean {
		return this.spritesheets.delete(id);
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

	public deleteVideo(id: string): boolean {
		return this.videos.delete(id);
	}

	public setFont(id: string, font: FontFace) {
		this.fonts.set(id, font);
		document.fonts.add(font);
	}

	public deleteFont(id: string): boolean {
		const font = this.fonts.get(id);

		if (font) {
			document.fonts.delete(font);
			return this.fonts.delete(id);
		}

		return false;
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

	public deleteJson(id: string): boolean {
		return this.jsons.delete(id);
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

	public deleteXml(id: string): boolean {
		return this.xmls.delete(id);
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

	public deleteHtml(id: string): boolean {
		return this.htmls.delete(id);
	}

	public getStylesheet(id: string): HTMLStyleElement {
		const css = this.stylesheets.get(id);

		if (css === undefined) {
			throw new GameError(`Stylesheet ${id} does not exist`);
		}

		return css;
	}

	public setStylesheet(id: string, css: HTMLStyleElement) {
		this.stylesheets.set(id, css);
		document.head.appendChild(css);
	}

	public deleteStylesheet(id: string): boolean {
		const css = this.stylesheets.get(id);

		if (css) {
			document.head.removeChild(css);
			return this.stylesheets.delete(id);
		}

		return false;
	}

	public getScript(id: string): HTMLScriptElement {
		const script = this.scripts.get(id);

		if (script === undefined) {
			throw new GameError(`Script ${id} does not exist`);
		}

		return script;
	}

	public setScript(id: string, script: HTMLScriptElement) {
		this.scripts.set(id, script);
		document.body.appendChild(script);
	}

	public deleteScript(id: string): boolean {
		const script = this.scripts.get(id);

		if (script) {
			document.body.removeChild(script);
			return this.scripts.delete(id);
		}

		return false;
	}
}
