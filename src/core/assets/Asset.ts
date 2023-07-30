interface Asset
{
    id: string,
    url: string
}


export type AssetType = ImageAsset | AudioAsset | VideoAsset | FontAsset | JsonAsset | XmlAsset | HtmlAsset | CssAsset | JavaScriptAsset;


export interface ImageAsset extends Asset
{
    type: "image",
    subtype: "Sprite" | "Spritesheet" | "Animation"
}

export interface AudioAsset extends Asset
{
    type: "audio",
    subtype: string
}

export interface VideoAsset extends Asset
{
    type: "video"
}

export interface FontAsset extends Asset
{
    type: "font"
}

export interface JsonAsset extends Asset
{
    type: "json"
}

export interface XmlAsset extends Asset
{
    type: "xml"
}

export interface HtmlAsset extends Asset
{
    type: "html"
}

export interface CssAsset extends Asset
{
    type: "css"
}

export interface JavaScriptAsset extends Asset
{
    type: "javascript",
    subtype: "Script" | "Module"
}