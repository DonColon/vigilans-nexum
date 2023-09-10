import { EntityType } from "core/ecs/Entity";


export type StoreNames = keyof DatabaseSchema;
export type StoreType<Name extends StoreNames> = DatabaseSchema[Name];
export type StoreProperties<Name extends StoreNames> = keyof DatabaseSchema[Name];


export interface DatabaseSchema
{
    savegames: {
        id: number,
        playtime: number,
        modifiedOn: string,
        screenshot: Blob,
        currentState: string[],
        entities: EntityType[]
    }
}