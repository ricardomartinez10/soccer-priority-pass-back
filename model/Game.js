import { Schema, model } from "mongoose";

const gameSchema = new Schema(
    {
        date: {
            type: String,
            required: true
        },
        dateFormat: {
            type: String,
            required: true
        }
    }
)

const Game = model('Game', gameSchema);

export default Game;
