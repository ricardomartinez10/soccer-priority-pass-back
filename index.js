import mongoose from 'mongoose'
import Player from './model/Player.js';
import PlayerRequest from './model/PlayerRequest.js';
import Game from './model/Game.js';
import User from './model/User.js';
import express from 'express';
import bodyParser from 'body-parser';
//import { dataBasePlayers } from './data/dataBasePlayers.js';
//import { newPlayers } from './data/newPlayers.js';
import cors from 'cors';
import 'dotenv/config';
import { createHmac } from 'node:crypto';

const MAX_KEEPERS = 2;
const MAX_PLAYERS = 18;
const app = express();
app.use(cors());
// database connection
mongoose.connect(process.env.BASE_URL)
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

app.put('/reset-confirm-status', async(req, res) => {
    await Player.updateMany({}, {confirmed: false }).exec();

    res.json('Confirm status updated');
});

app.put('/update-player-assists', async(req, res) => {
    const subscribedPlayers = await PlayerRequest
        .find({}, 'email')
        .exec();
    const subscribedPlayersEmail = subscribedPlayers.map(player => player.email);
    const priorityPlayersQuery = await Player
        .find({'email': {$in: subscribedPlayersEmail}})
        .sort({'assists': 'desc'}).exec();

    const priorityPlayers = priorityPlayersQuery.filter(player => player.position !== 'arquero').slice(0, MAX_PLAYERS);
    const priorityKeepers = priorityPlayersQuery.filter(player => player.position === 'arquero').slice(0, MAX_KEEPERS);

    const confirmedPlayersEmail = priorityPlayers.concat(priorityKeepers).map(player => player.email);

    await Player.updateMany(
        { email: {$in: confirmedPlayersEmail}},
        {
            $inc: { assists: 1}
        }
    ).exec();

    res.json('player assists updated');
});

app.put('/remove-players-assist', async (req, res) => {
    const playersToUpdate = req.body.players.split(',');

    await Player.updateMany( 
        {
            name: { $in: playersToUpdate }
        },
        {
            $inc: { assists: -1 }
        }
    ).exec();

    res.json('Player assists removed');
});

app.put('/update-player-confirmed', async (req, res) => {
    const playersToUpdate = req.body;

/*     await Player.updateMany(
        {'email': {$in: playersToUpdate}}, 
        {
            $set: { confirmed: true },
            $inc: { assists: 1 }
        }).exec()
        .catch((error) => {
            console.log('error', error);
            res.status(500).json(error);
        }) */
    await Player.updateMany(
        {'email': {$in: playersToUpdate}},
        { confirmed: true }).exec()
        .catch((error) => {
            console.log('error', error);
            res.status(500).json(error);
        })

        res.json('Updated')
});

app.post('/validate-log-in', async (req, res) => {
    const {username, password} = req.body;
    const bpassword = createHmac('sha256', process.env.SECRET_CODE)
        .update(password)
        .digest('hex');

    const user = await User.exists({username, password: bpassword})
        .exec()
        .catch(error => console.log)
    if (user) {
        res.status(200).json('Login successfully');
    } else {
        res.status(401).json('User unauthorized');
    }
});

app.get('/game-details', async (req, res) => {
    const game = await Game.findOne({}).exec();

    res.json(game);
});

app.post('/update-game-date', async (req, res) => {
    const { date } = req.body;
    const game = await Game.updateOne(
        {date}
    ).exec();

    const isPlayerRequestEmpty  = await PlayerRequest.countDocuments({}).exec();

    if (isPlayerRequestEmpty) {
        const subscribedPlayers = await PlayerRequest
            .find({}, 'email')
            .exec();
        const subscribedPlayersEmail = subscribedPlayers.map(player => player.email);
        const priorityPlayersQuery = await Player
            .find({'email': {$in: subscribedPlayersEmail}})
            .sort({'assists': 'desc'}).exec();

        const priorityPlayers = priorityPlayersQuery.filter(player => player.position !== 'arquero').slice(0, MAX_PLAYERS);
        const priorityKeepers = priorityPlayersQuery.filter(player => player.position === 'arquero').slice(0, MAX_KEEPERS);

        const confirmedPlayersEmail = priorityPlayers.concat(priorityKeepers).map(player => player.email);

        await Player.updateMany(
            { email: {$in: confirmedPlayersEmail}},
            {
            $inc: { assists: 1}
            }
        ).exec();

        await PlayerRequest.deleteMany({}).exec();
    }
    

    res.json(game);
});

app.delete('/reset-player-request', async (req, res) => {
    await PlayerRequest.deleteMany({}).exec();

    res.json('Request players reset')
});

async function createGame() {
    await Game.create({
        date: '15/08/2024 19:00:00',
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
    });

    console.log('Game created')
}

app.get('/get-lost-players', async (req, res) => {
    const emails = dataBasePlayers.map(player => player.email.toLowerCase());

    let mongoPlayers = await Player.find({}).exec();
    mongoPlayers = mongoPlayers.map(player => player.email);

    const response = {
        emails,
        mongoPlayers
    };

    const missingElements = emails.filter(email => {
        return email !== mongoPlayers.find(mongoPlayer => mongoPlayer === email);
    })

    res.json(missingElements);
});

app.get('/get-players-list', async (req, res) => {
    const subscribedPlayers = await PlayerRequest
        .find({}, 'email')
        .exec();

    const subscribedPlayersEmail = subscribedPlayers.map(player => player.email);
    const priorityPlayersQuery = await Player
        .find({'email': {$in: subscribedPlayersEmail}})
        .sort({'assists': 'desc'}).exec();

    const priorityPlayers = priorityPlayersQuery.filter(player => player.position !== 'arquero').slice(0, MAX_PLAYERS);
    const priorityKeepers = priorityPlayersQuery.filter(player => player.position === 'arquero').slice(0, MAX_KEEPERS);

    function getPlayerRankList(playerList){
        return playerList.reduce((prev, current, index) => {
            if (index === 0) {
                return `${index + 1}. ${current.name}`;
              }
              return `${prev}<br>${index + 1}. ${current.name}`;
        }, 1)
    }

    const list = `
Fútbol próximo Jueves ⚽
<br>
Lugar: Canchas 5-0 atrás de Palmetto
<br>
Hora: 6:45 pm. - Importante llegar temprano
<br>
Recibe William 
<br>
Valor: 15.000
<br>
<br>
Enviar dinero al Nequi de William Gio Valencia y anotarse en la lista con el emoji 💵
<br>
Código QR en la foto de perfil o enviar a 318 8990695
<br>
<br>
Arqueros:
<br>
${getPlayerRankList(priorityKeepers)}
<br>
<br>
Jugadores:
<br>
${getPlayerRankList(priorityPlayers)}
`
    res.send(list);
});

function populateDataBase() {
    newPlayers.forEach(async (player) => {
        await Player.create(player)
    });

    console.log('Players updated')
}