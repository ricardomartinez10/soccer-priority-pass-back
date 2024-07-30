import mongoose from "mongoose";

const { Schema, model } = mongoose;

const playerSchema = new Schema([{
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    position: {
        type: String,
        required: false,
        lowercase: true
    },
    assists: {
        type: Number,
        required: false
    }
}]);

const Player = model('Player', playerSchema);

export default Player;