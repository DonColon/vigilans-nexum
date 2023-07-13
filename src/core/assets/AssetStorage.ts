import { AudioTrack } from "core/audio/AudioTrack";
import { GameError } from "core/GameError";
import { AudioLoadedEvent } from "./AudioLoadedEvent";
import { ImageLoadedEvent } from "./ImageLoadedEvent";
import { FontLoadedEvent } from "./FontLoadedEvent";
import { JsonLoadedEvent } from "./JsonLoadedEvent";
import { XmlLoadedEvent } from "./XmlLoadedEvent";
import { HtmlLoadedEvent } from "./HtmlLoadedEvent";
import { CssLoadedEvent } from "./CssLoadedEvent";
import { ScriptLoadedEvent } from "./ScriptLoadedEvent";
import { ModuleLoadedEvent } from "./ModuleLoadedEvent";


export class AssetStorage
{
    private audio: Map<string, AudioTrack>;
    private images: Map<string, HTMLImageElement>;
    private jsons: Map<string, object>;
    private xmls: Map<string, XMLDocument>;
    private htmls: Map<string, Document>;
    private modules: Map<string, any>;


    constructor()
    {
        this.audio = new Map<string, AudioTrack>();
        this.images = new Map<string, HTMLImageElement>();
        this.jsons = new Map<string, object>();
        this.xmls = new Map<string, XMLDocument>();
        this.htmls = new Map<string, Document>();
        this.modules = new Map<string, any>();

        eventSystem.subscribe("audioLoaded", event => this.onAudioLoaded(event));
        eventSystem.subscribe("imageLoaded", event => this.onImageLoaded(event));
        eventSystem.subscribe("fontLoaded", event => this.onFontLoaded(event));
        eventSystem.subscribe("jsonLoaded", event => this.onJsonLoaded(event));
        eventSystem.subscribe("xmlLoaded", event => this.onXmlLoaded(event));
        eventSystem.subscribe("htmlLoaded", event => this.onHtmlLoaded(event));
        eventSystem.subscribe("cssLoaded", event => this.onCssLoaded(event));
        eventSystem.subscribe("scriptLoaded", event => this.onScriptLoaded(event));
        eventSystem.subscribe("moduleLoaded", event => this.onModuleLoaded(event));
    }


    private onAudioLoaded(event: AudioLoadedEvent)
    {
        this.audio.set(event.assetID, event.track);
    }

    private onImageLoaded(event: ImageLoadedEvent)
    {
        this.images.set(event.assetID, event.image);
    }

    private onFontLoaded(event: FontLoadedEvent)
    {
        document.fonts.add(event.font);
    }

    private onJsonLoaded(event: JsonLoadedEvent)
    {
        this.jsons.set(event.assetID, event.json);
    }

    private onXmlLoaded(event: XmlLoadedEvent)
    {
        this.xmls.set(event.assetID, event.xml);
    }

    private onHtmlLoaded(event: HtmlLoadedEvent)
    {
        this.htmls.set(event.assetID, event.html);
    }

    private onCssLoaded(event: CssLoadedEvent)
    {
        document.head.appendChild(event.css);
    }

    private onScriptLoaded(event: ScriptLoadedEvent)
    {
        document.body.appendChild(event.script);
    }

    private onModuleLoaded(event: ModuleLoadedEvent)
    {
        this.modules.set(event.assetID, event.module);
    }


    public getAudio(id: string): AudioTrack
    {
        const track = this.audio.get(id);

        if(track === undefined) {
            throw new GameError(`Track ${id} does not exist`);
        }

        return track;
    }

    public setAudio(id: string, track: AudioTrack)
    {
        this.audio.set(id, track);
    }

    public getImage(id: string): HTMLImageElement
    {
        const image = this.images.get(id);

        if(image === undefined) {
            throw new GameError(`Image ${id} does not exist`);
        }

        return image;
    }

    public setImage(id: string, image: HTMLImageElement)
    {
        this.images.set(id, image);
    }

    public getJson(id: string): object
    {
        const json = this.jsons.get(id);

        if(json === undefined) {
            throw new GameError(`JSON ${id} does not exist`);
        }

        return json;
    }

    public setJson(id: string, json: object)
    {
        this.jsons.set(id, json);
    }

    public getXml(id: string): XMLDocument
    {
        const xml = this.xmls.get(id);

        if(xml === undefined) {
            throw new GameError(`XML ${id} does not exist`);
        }

        return xml;
    }

    public setXml(id: string, xml: XMLDocument)
    {
        this.xmls.set(id, xml);
    }

    public getHtml(id: string): Document
    {
        const html = this.htmls.get(id);

        if(html === undefined) {
            throw new GameError(`HTML ${id} does not exist`);
        }

        return html;
    }

    public setHtml(id: string, html: Document)
    {
        this.htmls.set(id, html);
    }

    public getModule(id: string): any
    {
        const module = this.xmls.get(id);

        if(module === undefined) {
            throw new GameError(`Module ${id} does not exist`);
        }

        return module;
    }

    public setModule(id: string, module: any)
    {
        this.modules.set(id, module);
    }
}