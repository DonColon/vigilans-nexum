import { GameError } from "@/core/GameError";
import { AssetManifest } from "@/core/assets/AssetManifest";
import { AssetType, AudioAsset, StylesheetAsset, FontAsset, HtmlAsset, ImageAsset, JavaScriptAsset, JsonAsset, SpriteAsset, SpriteSheetAsset, VideoAsset, XmlAsset } from "@/core/assets/Asset";
import { Sprite } from "@/core/graphics/components/Sprite";
import { Spritesheet, TexturePackerHash } from "@/core/graphics/components/Spritesheet";
import { GameCoreService } from "@/core/service/GameCoreService";
import { EventSystem } from "@/core/events/EventSystem";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { AudioDevice } from "@/core/audio/AudioDevice";

type LoaderMap = Record<AssetType["type"], (asset: any) => Promise<void>>;
type UnloaderMap = Record<AssetType["type"], (id: string) => void>;

export interface LoaderConfiguration {
	manifest: AssetManifest;
	useCache: boolean;
}

@GameCoreService()
export class AssetLoader {
	private manifest: AssetManifest;
	private useCache: boolean;
	private id: string;

	private responses: Map<RequestInfo, Response>;
	private cache!: Cache;

	private renderContext: CanvasRenderingContext2D;
	private domParser: DOMParser;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	// Decoding happens on the context that plays the samples - the device owns the
	// page's one AudioContext. Resolved lazily, so it need not exist before the loader.
	@GameCoreService(AudioDevice)
	private audioDevice!: AudioDevice;

	constructor(id: string, config: LoaderConfiguration) {
		this.manifest = config.manifest;
		this.useCache = config.useCache;
		this.id = id;

		this.responses = new Map<RequestInfo, Response>();

		const canvas = document.createElement("canvas");
		const renderContext = canvas.getContext("2d");

		if (!renderContext) {
			throw new GameError(`Rendering Context could not be created`);
		}

		this.renderContext = renderContext;
		this.domParser = new DOMParser();
	}

	public async unload(bundleName: string) {
		const bundle = this.manifest.bundles[bundleName];

		if (!bundle) {
			throw new GameError(`Bundle ${bundleName} does not exist in asset manifest`);
		}

		if (this.useCache && this.cache) {
			const deletePromises = bundle.map((asset) => this.cache.delete(asset.url));
			await Promise.all(deletePromises);
		}

		const unloaders: UnloaderMap = {
			image: (id) => {
				this.assetStorage.deleteImage(id);
				this.assetStorage.deleteSpritesheet(id);
			},
			audio: (id) => this.assetStorage.deleteAudio(id),
			video: (id) => this.assetStorage.deleteVideo(id),
			font: (id) => this.assetStorage.deleteFont(id),
			json: (id) => this.assetStorage.deleteJson(id),
			xml: (id) => this.assetStorage.deleteXml(id),
			html: (id) => this.assetStorage.deleteHtml(id),
			css: (id) => this.assetStorage.deleteStylesheet(id),
			javascript: (id) => this.assetStorage.deleteScript(id)
		};

		for (const asset of bundle) {
			const unloader = unloaders[asset.type];

			if (unloader) {
				unloader(asset.id);
			}
		}

		this.eventSystem.dispatch("bundleUnloaded", {
			bundle: bundleName,
			removed: bundle.length
		});
	}

	public async load(bundleName: string) {
		const bundle = this.manifest.bundles[bundleName];

		if (!bundle) {
			throw new GameError(`Bundle ${bundleName} does not exist in asset manifest`);
		}

		await this.loadBundle(bundle);

		const assets = this.resolveDependencies(bundle);
		let loadedCount = 0;

		const assetPromises = assets.map(async (asset) => {
			try {
				await this.loadAsset(asset);
				loadedCount++;

				this.dispatchBundleProgress(bundleName, loadedCount, bundle.length);
			} catch (error) {
				throw new GameError(`Failed to load asset ${asset.id} of type ${asset.type}: ${error}`);
			}
		});

		const results = await Promise.allSettled(assetPromises);
		const loaded = results.filter((result) => result.status === "fulfilled");
		const failed = results.filter((result) => result.status === "rejected");

		this.eventSystem.dispatch("bundleLoaded", {
			bundle: bundleName,
			loaded: loaded.length,
			failed: failed.length
		});
	}

	private async loadAsset(asset: AssetType) {
		const loaders: LoaderMap = {
			image: this.loadImage.bind(this),
			audio: this.loadAudio.bind(this),
			video: this.loadVideo.bind(this),
			font: this.loadFont.bind(this),
			json: this.loadJson.bind(this),
			xml: this.loadXml.bind(this),
			html: this.loadHtml.bind(this),
			css: this.loadStylesheet.bind(this),
			javascript: this.loadJavaScript.bind(this)
		};

		const loader = loaders[asset.type];

		if (loader) {
			await loader(asset);
		}
	}

	private resolveDependencies(bundle: AssetType[]): AssetType[] {
		// Asset-Map für schnellen Zugriff nach ID erstellen
		const assetMap = new Map<string, AssetType>();
		bundle.forEach((asset) => assetMap.set(asset.id, asset));

		// Validierung: Alle Dependencies müssen im Bundle existieren
		for (const asset of bundle) {
			if (asset.dependencies) {
				for (const depId of asset.dependencies) {
					if (!assetMap.has(depId)) {
						throw new GameError(`Asset ${asset.id} depends on ${depId}, but ${depId} is not in the bundle`);
					}
				}
			}
		}

		// Topologische Sortierung mit Kahn's Algorithmus
		const sorted: AssetType[] = [];
		const inDegree = new Map<string, number>();
		const adjacencyList = new Map<string, string[]>();

		// Initialisierung
		for (const asset of bundle) {
			inDegree.set(asset.id, 0);
			adjacencyList.set(asset.id, []);
		}

		// Graph aufbauen: Wenn A von B abhängt, dann B -> A
		for (const asset of bundle) {
			if (asset.dependencies) {
				for (const depId of asset.dependencies) {
					adjacencyList.get(depId)!.push(asset.id);
					inDegree.set(asset.id, inDegree.get(asset.id)! + 1);
				}
			}
		}

		// Queue mit Assets ohne Dependencies
		const queue: string[] = [];
		for (const [assetId, degree] of inDegree) {
			if (degree === 0) {
				queue.push(assetId);
			}
		}

		// Topologische Sortierung durchführen
		while (queue.length > 0) {
			const currentId = queue.shift()!;
			const currentAsset = assetMap.get(currentId)!;
			sorted.push(currentAsset);

			// Nachfolger verarbeiten
			for (const neighborId of adjacencyList.get(currentId)!) {
				inDegree.set(neighborId, inDegree.get(neighborId)! - 1);

				if (inDegree.get(neighborId) === 0) {
					queue.push(neighborId);
				}
			}
		}

		// Zirkuläre Dependencies prüfen
		if (sorted.length !== bundle.length) {
			const remaining = bundle
				.filter((asset) => !sorted.includes(asset))
				.map((asset) => asset.id)
				.join(", ");

			throw new GameError(`Circular dependency detected in bundle. Affected assets: ${remaining}`);
		}

		return sorted;
	}

	private dispatchBundleProgress(bundleName: string, current: number, total: number) {
		this.eventSystem.dispatch("bundleProgress", {
			bundle: bundleName,
			current,
			total,
			progress: (current / total) * 100
		});
	}

	private async loadBundle(bundle: AssetType[]) {
		const urls = bundle.map((asset) => asset.url);

		if (this.useCache) {
			if (!this.cache) {
				this.cache = await caches.open(this.id);
			}

			await this.cache.addAll(urls);
		} else {
			const responses = await this.fetchAll(urls);

			for (const [index, url] of urls.entries()) {
				this.responses.set(url, responses[index]);
			}
		}
	}

	private async fetchAll(requests: RequestInfo[]): Promise<Response[]> {
		return await Promise.all(requests.map((request) => fetch(request)));
	}

	private async loadImage(asset: ImageAsset) {
		if (asset.subtype === "sprite") {
			await this.loadSprite(asset);
		} else if (asset.subtype === "spritesheet") {
			await this.loadSpritesheet(asset);
		}
	}

	private async loadSprite(asset: SpriteAsset) {
		const response = await this.getResponse(asset.url);
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);

		try {
			const image = await this.createImage(url);
			const sprite = new Sprite(image);
			this.assetStorage.setImage(asset.id, sprite);
		} catch (error) {
			throw new GameError(`Image load failed: ${asset.url}: ${error}`);
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	private async loadSpritesheet(asset: SpriteSheetAsset) {
		const response = await this.getResponse(asset.url);
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);

		try {
			const image = await this.createImage(url);
			const layout = asset.layout;

			const spritesheet = layout.type === "grid" ? Spritesheet.fromGrid(image, layout) : Spritesheet.fromAtlas(image, this.assetStorage.getJson<TexturePackerHash>(layout.atlas));

			this.assetStorage.setSpritesheet(asset.id, spritesheet);
		} catch (error) {
			throw new GameError(`Spritesheet load failed: ${asset.url}: ${error}`);
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	private createImage(url: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve(image);
			image.onerror = () => reject(new GameError(`Image failed to load: ${url}`));
			image.src = url;
		});
	}

	private async loadAudio(asset: AudioAsset) {
		const response = await this.getResponse(asset.url);
		const buffer = await response.arrayBuffer();

		try {
			const audioBuffer = await this.audioDevice.decode(buffer);

			this.assetStorage.setAudio(asset.id, {
				buffer: audioBuffer,
				channel: asset.subtype
			});
		} catch (error) {
			throw new GameError(`Audio decode failed: ${asset.url}: ${error}`);
		}
	}

	private async loadVideo(asset: VideoAsset) {
		const response = await this.getResponse(asset.url);
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);

		try {
			const video = await this.createVideo(url);
			this.assetStorage.setVideo(asset.id, video);
		} catch (error) {
			throw new GameError(`Video load failed: ${asset.url}: ${error}`);
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	private async createVideo(url: string): Promise<HTMLVideoElement> {
		return new Promise((resolve, reject) => {
			const video = document.createElement("video");
			video.preload = "auto";
			video.onloadeddata = () => resolve(video);
			video.onerror = () => reject(new GameError(`Video failed to load: ${url}`));
			video.src = url;
		});
	}

	private async loadFont(asset: FontAsset) {
		const response = await this.getResponse(asset.url);
		const buffer = await response.arrayBuffer();

		const font = new FontFace(asset.id, buffer);
		await font.load();

		this.assetStorage.setFont(asset.id, font);
	}

	private async loadJson(asset: JsonAsset) {
		const response = await this.getResponse(asset.url);
		const json = await response.json();
		this.assetStorage.setJson(asset.id, json);
	}

	private async loadXml(asset: XmlAsset) {
		const response = await this.getResponse(asset.url);
		const text = await response.text();

		const xml = this.domParser.parseFromString(text, "application/xml") as XMLDocument;
		this.assetStorage.setXml(asset.id, xml);
	}

	private async loadHtml(asset: HtmlAsset) {
		const response = await this.getResponse(asset.url);
		const text = await response.text();

		const html = this.domParser.parseFromString(text, "text/html");
		this.assetStorage.setHtml(asset.id, html);
	}

	private async loadStylesheet(asset: StylesheetAsset) {
		const response = await this.getResponse(asset.url);
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);

		try {
			const stylesheet = await this.createStylesheet(url);
			this.assetStorage.setStylesheet(asset.id, stylesheet);
		} catch (error) {
			throw new GameError(`Stylesheet load failed: ${asset.url}: ${error}`);
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	private createStylesheet(url: string): Promise<HTMLLinkElement> {
		return new Promise((resolve, reject) => {
			const link = document.createElement("link");
			link.rel = "stylesheet";
			link.onload = () => resolve(link);
			link.onerror = () => reject(new GameError(`CSS failed to load: ${url}`));
			link.href = url;
		});
	}

	private async loadJavaScript(asset: JavaScriptAsset) {
		const response = await this.getResponse(asset.url);
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);

		try {
			const script = await this.createScript(url, asset.subtype);
			this.assetStorage.setScript(asset.id, script);
		} catch (error) {
			throw new GameError(`JavaScript load failed: ${asset.url}: ${error}`);
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	private createScript(url: string, subtype: string): Promise<HTMLScriptElement> {
		return new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.type = subtype === "module" ? "module" : "text/javascript";
			script.async = true;
			script.onload = () => resolve(script);
			script.onerror = () => reject(new GameError(`JavaScript failed to load: ${url}`));
			script.src = url;
		});
	}

	private async getResponse(request: RequestInfo): Promise<Response> {
		if (this.useCache) {
			let response = await this.cache.match(request);

			if (!response) {
				await this.cache.add(request);
				response = await this.cache.match(request);
			}

			return response as Response;
		} else {
			let response = this.responses.get(request);

			if (!response) {
				response = await fetch(request);
				this.responses.set(request, response.clone());
			}

			return response;
		}
	}
}
