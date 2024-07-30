import mongoose from 'mongoose'
import Player from './model/Player.js';
import PlayerRequest from './model/PlayerRequest.js';
import express from 'express';
import bodyParser from 'body-parser';
import { dataBasePlayers } from './data/dataBasePlaters.js';
import cors from 'cors';

const app = express();
app.use(cors());
// database connection
mongoose.connect("mongodb://Cluster06691:RFxkZUZQR1BS@ac-hdvzltr-shard-00-00.22d7pjq.mongodb.net:27017,ac-hdvzltr-shard-00-01.22d7pjq.mongodb.net:27017,ac-hdvzltr-shard-00-02.22d7pjq.mongodb.net:27017/?ssl=true&replicaSet=atlas-14g5nr-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster06691")
    .then(() => {
        console.log('connected');
    })
    .catch((error) => {
        console.log(error);
    })

app.use(bodyParser.json());

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.set('json spaces', 2);
app.get('/players', async (req, res) => {
    const players = await Player.find({}, 'name assists position').sort({'assists': 'desc'}).exec();
    res.json(players);
});

app.get('/player-request', async (req, res) => {
    const subscribedPlayers = await PlayerRequest
        .find({}, 'email')
        .exec();
    const subscribedPlayersEmail = subscribedPlayers.map(player => player.email);
    const priorityPlayersQuery = await Player
        .find({'email': {$in: subscribedPlayersEmail}})
        .sort({'assists': 'desc'}).exec();

    const priorityPlayers = priorityPlayersQuery.filter(player => player.position !== 'arquero');
    const priorityKeepers = priorityPlayersQuery.filter(player => player.position === 'arquero');

    console.log(priorityPlayers);
    const confirmedPlayers = {
        priorityPlayers,
        priorityKeepers
    }
    res.json(confirmedPlayers);
});

app.post('/create-player', async (req, res) => {
    await Player.create(req.body);
    res.json('User registered');
});

app.post('/player-request', async (req, res) => {
    const requestPlayer = req.body;
    const playerAlreadySubscribed = await PlayerRequest.exists({email: requestPlayer.email}).exec();
    const playerExistsInDataBase = await Player.exists({email: requestPlayer.email}).exec();
    if (playerAlreadySubscribed) {
        res.status(409).json('Player already subscribed')
    } else {
        if (!playerExistsInDataBase) {
            await Player.create({
                name:req.body.email,
                email: req.body.email,
                position: '',
                assists: 0
            });
        }

        await PlayerRequest.create(req.body);
        res.json('Player subscribed')
    }
});

app.get('/formState', async (req, res) => {
    const formState = req.query.state;
    res.json(formState);
});

function populateDataBase() {
    dataBasePlayers.forEach(async (player) => {
        await Player.create(player)
    });
}

async function resetDataBaseplayers() {
    await Player.deleteMany({});
}

async function resetRequestlistPlayers() {
    await PlayerRequest.deleteMany({});
}