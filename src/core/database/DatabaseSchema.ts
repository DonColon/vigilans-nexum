import { Savegame } from "core/model/Savegame";


type UnionAsTuple<Union extends string, Cache extends any[] = []> = {
	[Value in Union]: Exclude<Union, Value> extends never ? [...Cache, Value] : UnionAsTuple<Exclude<Union, Value>, [...Cache, Value]>;
}[Union];

type KeysAsValues<Type> = {
    [Key in keyof Type]: string extends Key ? never : number extends Key ? never : Key
};

type ValuesOf<Type> = Type extends { [Key in keyof Type]: infer Value } ? Value : never;
type KeysOf<Type> = ValuesOf<KeysAsValues<Type>> extends keyof Type ? ValuesOf<KeysAsValues<Type>> : never;


interface DatabaseKeys
{
    [name: string]: IDBValidKey
}

interface IndexKeys
{
    [name: string]: IDBValidKey
}

interface DatabaseStore
{
    key: DatabaseKeys,
    indexes?: IndexKeys,
    type: any
}

interface DatabaseSchema
{
    [store: string]: DatabaseStore
}


export interface LocalDatabaseSchema extends DatabaseSchema
{
    savegames: {
        key: {
            id: number
        },
        type: Savegame
    }
}


export type StoreNames = KeysOf<LocalDatabaseSchema>;
export type StoreType<Name extends StoreNames> = LocalDatabaseSchema[Name]["type"];
export type StoreProperties<Name extends StoreNames> = KeysOf<StoreType<Name>>;

export type StoreKeys<Name extends StoreNames> = KeysOf<LocalDatabaseSchema[Name]["key"]>;
