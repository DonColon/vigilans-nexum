export class GameError extends Error
{
    constructor(message: string)
    {
        super(message);
        Object.setPrototypeOf(this, GameError.prototype);
    }
}