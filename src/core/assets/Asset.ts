interface Asset {
	id: string;
	url: string;
	dependencies?: string[];
}

export type AssetType = ImageAsset | AudioAsset | VideoAsset | FontAsset | JsonAsset | XmlAsset | HtmlAsset | StylesheetAsset | JavaScriptAsset;

export interface ImageAsset extends Asset {
	type: "image";
	subtype: "sprite" | "spritesheet" | "animation";
}

export interface AudioAsset extends Asset {
	type: "audio";
	subtype: string;
}

export interface VideoAsset extends Asset {
	type: "video";
}

export interface FontAsset extends Asset {
	type: "font";
}

export interface JsonAsset extends Asset {
	type: "json";
}

export interface XmlAsset extends Asset {
	type: "xml";
}

export interface HtmlAsset extends Asset {
	type: "html";
}

export interface StylesheetAsset extends Asset {
	type: "css";
}

export interface JavaScriptAsset extends Asset {
	type: "javascript";
	subtype: "script" | "module";
}
