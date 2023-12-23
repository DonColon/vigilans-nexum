import { LocalDatabaseSchema } from "core/database/DatabaseSchema";


declare module "core/database/DatabaseSchema"
{
    interface LocalDatabaseSchema
    {
        settings: {
            key: {
                id: string
            },
            type: {
                id: string
            }
        }
    }
}