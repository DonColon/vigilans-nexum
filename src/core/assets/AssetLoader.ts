import { GameError } from "core/GameError";
import { AssetManifest } from "./AssetManifest";
import { AssetType, AudioAsset, CssAsset, FontAsset, HtmlAsset, ImageAsset, JavaScriptAsset, JsonAsset, VideoAsset, XmlAsset } from "./Asset";
import { Sprite } from "core/graphics/Sprite";


export interface LoaderSettings
{
    manifest: AssetManifest,
    useCache: boolean
}


export class AssetLoader
{
    private manifest: AssetManifest;
    private useCache: boolean;

    private responses: Map<RequestInfo, Response>;
    private cache!: Cache;

    private renderContext: CanvasRenderingContext2D;
    private audioContext: AudioContext;
    private domParser: DOMParser;


    constructor(settings: LoaderSettings)
    {
        this.manifest = settings.manifest;
        this.useCache = settings.useCache;

        this.responses = new Map<RequestInfo, Response>();

        const canvas = document.createElement("canvas");
        const renderContext = canvas.getContext("2d");

        if(!renderContext) {
            throw new GameError(`Rendering Context could not be created`);
        }

        this.renderContext = renderContext;
        this.audioContext = new AudioContext();
        this.domParser = new DOMParser();
    }

    public async load(bundleName: string)
    {
        const bundle = this.manifest.bundles[bundleName];

        if(!bundle) {
            throw new GameError(`Bundle ${bundleName} does not exist in asset manifest`);
        }

        await this.loadBundle(bundle);

        for(const asset of bundle) {
            if(asset.type === "image") {
                await this.loadImage(asset);
            }
            else if(asset.type === "audio") {
                await this.loadAudio(asset);
            }
            else if(asset.type === "video") {
                await this.loadVideo(asset);
            }
            else if(asset.type === "font") {
                await this.loadFont(asset);
            }
            else if(asset.type === "json") {
                await this.loadJson(asset);
            }
            else if(asset.type === "xml") {
                await this.loadXml(asset);
            }
            else if(asset.type === "html") {
                await this.loadHtml(asset);
            }
            else if(asset.type === "css") {
                await this.loadCss(asset);
            }
            else if(asset.type === "javascript") {
                await this.loadJavaScript(asset);
            }
        }

        eventSystem.dispatch("bundleLoaded", { bundle: bundleName });
    }

    private async loadBundle(bundle: AssetType[])
    {
        const urls = bundle.map(asset => asset.url);

        if(this.useCache) {
            if(!this.cache) {
                this.cache = await caches.open("assetStorage");
            }

            await this.cache.addAll(urls);

        } else {

            const responses = await this.fetchAll(urls);

            for(const [index, url] of urls.entries()) {
                this.responses.set(url, responses[index]);
            }
        }
    }

    private async fetchAll(requests: RequestInfo[]): Promise<Response[]>
    {
        try {
            return await Promise.all(requests.map(request => fetch(request)));

        } catch(error) {

            throw error;
        }
    }


    private async loadImage(asset: ImageAsset)
    {
        if(asset.subtype === "sprite") {
            await this.loadSprite(asset);
        }
    }

    private async loadSprite(asset: ImageAsset)
    {
        const response = await this.getResponse(asset.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const image = new Image();
        image.src = url;

        const sprite = new Sprite(image);
        eventSystem.dispatch("imageLoaded", { assetID: asset.id, image: sprite });
    }

    private async loadAudio(asset: AudioAsset)
    {
        const response = await this.getResponse(asset.url);
        const buffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(buffer);

        const audioTrack = { 
            buffer: audioBuffer, 
            channel: asset.subtype 
        };

        eventSystem.dispatch("audioLoaded", { assetID: asset.id, track: audioTrack });
    }

    private async loadVideo(asset: VideoAsset)
    {
        const response = await this.getResponse(asset.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const video = document.createElement("video");
        video.src = url;

        eventSystem.dispatch("videoLoaded", { assetID: asset.id, video: video });
    }

    private async loadFont(asset: FontAsset)
    {
        const response = await this.getResponse(asset.url);
        const buffer = await response.arrayBuffer();

        const font = new FontFace(asset.id, buffer);
        await font.load();

        eventSystem.dispatch("fontLoaded", { assetID: asset.id, font: font });
    }

    private async loadJson(asset: JsonAsset)
    {
        const response = await this.getResponse(asset.url);
        const json = await response.json();

        eventSystem.dispatch("jsonLoaded", { assetID: asset.id, json: json });
    }

    private async loadXml(asset: XmlAsset)
    {
        const response = await this.getResponse(asset.url);
        const text = await response.text();

        const xml = this.domParser.parseFromString(text, "application/xml") as XMLDocument;

        eventSystem.dispatch("xmlLoaded", { assetID: asset.id, xml: xml });
    }

    private async loadHtml(asset: HtmlAsset)
    {
        const response = await this.getResponse(asset.url);
        const text = await response.text();

        const html = this.domParser.parseFromString(text, "text/html");

        eventSystem.dispatch("htmlLoaded", { assetID: asset.id, html: html });
    }

    private async loadCss(asset: CssAsset)
    {
        const response = await this.getResponse(asset.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = url;

        eventSystem.dispatch("cssLoaded", { assetID: asset.id, css: css });
    }

    private async loadJavaScript(asset: JavaScriptAsset)
    {
        const response = await this.getResponse(asset.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const script = document.createElement("script");

        if(asset.subtype === "module") {
            script.type = asset.subtype;
        }

        script.async = true;
        script.src = url;
            
        eventSystem.dispatch("scriptLoaded", { assetID: asset.id, script: script });
    }


    private async getResponse(request: RequestInfo): Promise<Response>
    {
        if(this.useCache) {
            let response = await this.cache.match(request);

            if(!response) {
                await this.cache.add(request);
                response = await this.cache.match(request);
            }

            return response as Response;

        } else {
            
            let response = this.responses.get(request);

            if(!response) {
                response = await fetch(request);
                this.responses.set(request, response);
            }

            return response;
        }
    }
}