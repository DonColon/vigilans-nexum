type JsonProperty = string | number | boolean | JsonSchema | string[] | number[] | boolean[] | JsonSchema[] | null;


export interface JsonSchema
{
    [key: string]: JsonProperty
}