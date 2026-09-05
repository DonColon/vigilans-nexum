interface Asset {
	id: string;
	url: string;
	dependencies?: string[];
}

export type AssetType = ImageAsset | AudioAsset | VideoAsset | FontAsset | JsonAsset | XmlAsset | HtmlAsset | StylesheetAsset | JavaScriptAsset;

export type ImageAsset = SpriteAsset | SpriteSheetAsset | AnimationAsset;

interface BaseImageAsset extends Asset {
	type: "image";
}

export interface SpriteAsset extends BaseImageAsset {
	subtype: "sprite";
}

export interface AnimationAsset extends BaseImageAsset {
	subtype: "animation";
}

export interface SpriteSheetAsset extends BaseImageAsset {
	subtype: "spritesheet";
	/** How the single frames are cut out of the sheet. */
	layout: GridSheetLayout | AtlasSheetLayout;
}

/**
 * Frames sit on a regular grid, the way an exported tilesheet does: every frame
 * is `tileWidth` by `tileHeight`, `spacing` pixels of gutter between neighbours
 * and `margin` pixels around the whole sheet. Frames are numbered row major,
 * `index = row * columns + column`, starting at zero.
 */
export interface GridSheetLayout {
	type: "grid";
	tileWidth: number;
	tileHeight: number;
	columns: number;
	rows: number;
	/** Transparent gutter around the whole sheet, in pixels. Defaults to 0. */
	margin?: number;
	/** Transparent gutter between two adjacent frames, in pixels. Defaults to 0. */
	spacing?: number;
}

/**
 * Frames are described by a companion atlas file, a TexturePacker "JSON (Hash)"
 * export. The atlas has to be listed as a dependency of the sheet so the loader
 * has it in storage by the time the sheet is cut.
 */
export interface AtlasSheetLayout {
	type: "atlas";
	/** Asset id of the JSON atlas describing the named frames. */
	atlas: string;
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
