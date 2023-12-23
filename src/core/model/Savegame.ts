import { EntityType } from "core/ecs/Entity";


export interface Savegame
{
    id: number,
    playtime: number,
    modifiedOn: string,
    screenshot: Blob,
    currentState: string[],
    entities: EntityType[]
}