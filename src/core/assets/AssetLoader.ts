import { GameError } from "core/GameError";
import { AssetManifest } from "./AssetManifest";
import { AssetType, AudioAsset, CssAsset, FontAsset, HtmlAsset, ImageAsset, JavaScriptAsset, JsonAsset, VideoAsset, XmlAsset } from "./Asset";
import { Sprite } from "core/graphics/Sprite";
import { GameCoreService } from "../service/GameCoreService";
import { EventSystem } from "../events/EventSystem";

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
	private audioContext: AudioContext;
	private domParser: DOMParser;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

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
		this.audioContext = new AudioContext();
		this.domParser = new DOMParser();
	}

	public async load(bundleName: string) {
		const bundle = this.manifest.bundles[bundleName];

		if (!bundle) {
			throw new GameError(`Bundle ${bundleName} does not exist in asset manifest`);
		}

		await this.loadBundle(bundle);
		await this.loadAssets(bundle, bundleName);
		this.eventSystem.dispatch("bundleLoaded", { bundle: bundleName });
	}

	private async loadAssets(bundle: AssetType[], bundleName: string) {
		const assets = this.resolveDependencies(bundle);
		let loadedCount = 0;

		const assetPromises = assets.map(async (asset) => {
			try {
				await this.loadAsset(asset);
				loadedCount++;

				this.dispatchBundleProgress(bundleName, loadedCount, bundle.length);
			} catch (error) {
				this.dispatchAssetError(asset, error);
			}
		});

		await Promise.all(assetPromises);
	}

	private async loadAsset(asset: AssetType) {
		const loaders: Record<AssetType['type'], (asset: any) => Promise<void>> = {
			image: this.loadImage.bind(this),
			audio: this.loadAudio.bind(this),
			video: this.loadVideo.bind(this),
			font: this.loadFont.bind(this),
			json: this.loadJson.bind(this),
			xml: this.loadXml.bind(this),
			html: this.loadHtml.bind(this),
			css: this.loadCss.bind(this),
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
		bundle.forEach(asset => assetMap.set(asset.id, asset));

		// Validierung: Alle Dependencies müssen im Bundle existieren
		for (const asset of bundle) {
			if (asset.dependencies) {
				for (const depId of asset.dependencies) {
					if (!assetMap.has(depId)) {
						throw new GameError(
							`Asset ${asset.id} depends on ${depId}, but ${depId} is not in the bundle`
						);
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
				.filter(asset => !sorted.includes(asset))
				.map(asset => asset.id)
				.join(', ');

			throw new GameError(
				`Circular dependency detected in bundle. Affected assets: ${remaining}`
			);
		}

		return sorted;
	}

	private dispatchBundleProgress(bundleName: string, current: number, total: number) {
		this.eventSystem.dispatch("bundleProgress", {
			bundleName,
			current,
			total,
			progress: (current / total) * 100
		});
	}

	private dispatchAssetError(asset: AssetType, error: unknown) {
		this.eventSystem.dispatch("assetFailed", {
			code: 500,
			message: `Failed to load asset ${asset.id} of type ${asset.type}`,
			error
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
		}
	}

	private async loadSprite(asset: ImageAsset) {
		const response = await this.getResponse(asset.url);
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);

		const image = new Image();
		image.src = url;
		image.onload = () => {
			URL.revokeObjectURL(url);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
		};

		const sprite = new Sprite(image);

		this.eventSystem.dispatch("assetLoaded", {
			assetID: asset.id,
			assetType: "image",
			payload: sprite
		});
	}

	private async loadAudio(asset: AudioAsset) {
		const response = await this.getResponse(asset.url);
		const buffer = await response.arrayBuffer();
		const audioBuffer = await this.audioContext.decodeAudioData(buffer);

		const audioTrack = {
			buffer: audioBuffer,
			channel: asset.subtype
		};

		this.eventSystem.dispatch("assetLoaded", {
			assetID: asset.id,
			assetType: "audio",
			payload: audioTrack
		});
	}

	private async loadVideo(asset: VideoAsset) {
		const response = await this.getResponse(asset.url);
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);

		const video = document.createElement("video");
		video.onload = () => {
			URL.revokeObjectURL(url);
		};
		video.onerror = () => {
			URL.revokeObjectURL(url);
		};
		video.src = url;

		this.eventSystem.dispatch("assetLoaded", {
			assetID: asset.id,
			assetType: "video",
			payload: video
		});
	}

	private async loadFont(asset: FontAsset) {
		const response = await this.getResponse(asset.url);
		const buffer = await response.arrayBuffer();

		const font = new FontFace(asset.id, buffer);
		await font.load();

		this.eventSystem.dispatch("assetLoaded", {
			assetID: asset.id,
			assetType: "font",
			payload: font
		});
	}

	private async loadJson(asset: JsonAsset) {
		const response = await this.getResponse(asset.url);
		const json = await response.json();

		this.eventSystem.dispatch("assetLoaded", {
			assetID: asset.id,
			assetType: "json",
			payload: json
		});
	}

	private async loadXml(asset: XmlAsset) {
		const response = await this.getResponse(asset.url);
		const text = await response.text();

		const xml = this.domParser.parseFromString(text, "application/xml") as XMLDocument;

		this.eventSystem.dispatch("assetLoaded", {
			assetID: asset.id,
			assetType: "xml",
			payload: xml
		});
	}

	private async loadHtml(asset: HtmlAsset) {
		const response = await this.getResponse(asset.url);
		const text = await response.text();

		const html = this.domParser.parseFromString(text, "text/html");

		this.eventSystem.dispatch("assetLoaded", {
			assetID: asset.id,
			assetType: "html",
			payload: html
		});
	}

	private async loadCss(asset: CssAsset) {
		const response = await this.getResponse(asset.url);
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);

		const css = document.createElement("link");
		css.rel = "stylesheet";
		css.onload = () => {
			URL.revokeObjectURL(url);
		};
		css.onerror = () => {
			URL.revokeObjectURL(url);
		};
		css.href = url;

		this.eventSystem.dispatch("assetLoaded", {
			assetID: asset.id,
			assetType: "css",
			payload: css
		});
	}

	private async loadJavaScript(asset: JavaScriptAsset) {
		const response = await this.getResponse(asset.url);
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);

		const script = document.createElement("script");

		if (asset.subtype === "module") {
			script.type = asset.subtype;
		}

		script.async = true;
		script.onload = () => {
			URL.revokeObjectURL(url);
		};
		script.onerror = (e) => {
			URL.revokeObjectURL(url);
		}
		script.src = url;

		this.eventSystem.dispatch("assetLoaded", {
			assetID: asset.id,
			assetType: "javascript",
			payload: script
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
