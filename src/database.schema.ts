import { DatabaseSchema } from "core/database/DatabaseSchema";


declare module "core/database/DatabaseSchema"
{
    interface DatabaseSchema
    {
        settings: {
            id: string
        }
    }
}