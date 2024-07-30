import mongoose from "mongoose";
const { Schema, model } = mongoose

const playerRequestSchema = new Schema(
    [
        {
            name: {
                type: String,
                required: true
            }
        },
        {
            email: {
                type: String,
                required: true,
                lowercase: true
            }
        }
    ]
)

const PlayerRequest = model('PlayerRequest', playerRequestSchema);

export default PlayerRequest;
