// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const WebSocket = require('ws');

// Initialize Express application
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Set up view engine and static file directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates', 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));

// Import and use route module
const indexRouter = require('./route/route');
app.use('/', indexRouter);

// Initialize game and player data storage
let games = {};
let players = {};

// Utility functions to manage game state
function checkGame(gameId) {
    return games[gameId] || null;
}

function updateGame(gameId, state) {
    games[gameId] = state;
}

// Set up WebSocket connection handler
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        GameMessage(ws, data);
    });
    ws.send(JSON.stringify({ message: 'Welcome to Monster Mayhem!' }));
});

// Handle incoming WebSocket messages
function GameMessage(ws, data) {
    const { type, payload } = data;
    switch (type) {
        case 'startGame':
            StartGame(ws, payload);
            break;
        case 'monsterPlace':
            MonsterPlace(ws, payload);
            break;
        case 'monsterMove':
            MonsterMove(ws, payload);
            break;
        case 'resetGame':
            ResetGame(ws, payload);
            break;
        default:
            console.log('Unknown message type:', type);
    }
}

// Start a new game or join an existing game
function StartGame(ws, { gameId, playerName }) {
    if (!games[gameId]) {
        games[gameId] = {
            players: [{ playerName, ws }],
            state: Array(10).fill().map(() => Array(10).fill(null)),
            turn: playerName,
            lastPlaced: null,
            scores: { [playerName]: 0 }
        };
    } else {
        games[gameId].players.push({ playerName, ws });
        games[gameId].scores[playerName] = 0; // Initialize score if player joins an existing game
    }
    players[playerName] = ws;
    ws.send(JSON.stringify({ type: 'gameState', payload: sanitizeGameState(games[gameId]) }));
}

// Place a monster on the game board
function MonsterPlace(ws, { gameId, playerName, position, monsterType }) {
    const game = checkGame(gameId);
    if (game && game.turn === playerName) {
        if (game.scores[playerName] < 10) {
            if (isValidPosition(game.state, position)) {
                const cell = game.state[position.y][position.x];
                if (!cell) {
                    game.state[position.y][position.x] = { playerName, type: monsterType };
                    game.lastPlaced = { x: position.x, y: position.y };
                    game.turn = getNextPlayer(game);
                    game.scores[playerName]++;
                    updateGame(gameId, game);
                    broadcastGameState(gameId, game);
                } else {
                    console.error('Cell is not empty:', position);
                }
            } else {
                console.error('Invalid position:', position);
            }
        } else {
            console.error('Player reached monster limit:', playerName);
            ws.send(JSON.stringify({ type: 'error', message: 'You have reached the monster limit!' }));
        }
    } else {
        console.error('Invalid game state or player turn:', gameId, playerName);
    }
}

// Move a monster on the game board
function MonsterMove(ws, { gameId, playerName, from, to }) {
    const game = checkGame(gameId);
    if (game && game.turn === playerName) {
        const monster = game.state[from.y][from.x];
        if (monster && monster.playerName === playerName) {
            if (isValidMove(game, from, to)) {
                const targetMonster = game.state[to.y][to.x];
                if (targetMonster) {
                    if (targetMonster.playerName !== playerName) {
                        const result = MonstersBattle(monster, targetMonster);
                        if (result === 'both') {
                            game.state[to.y][to.x] = null;
                        } else if (result === 'current') {
                            game.state[to.y][to.x] = monster;
                        }
                    } else {
                        console.error('Cannot move to cell occupied by own monster:', to);
                        return;
                    }
                } else {
                    game.state[to.y][to.x] = monster;
                }
                game.state[from.y][from.x] = null;

                game.turn = getNextPlayer(game);
                updateGame(gameId, game);
                broadcastGameState(gameId, game);
            } else {
                console.error('Invalid move:', from, to);
            }
        } else {
            console.error('No monster found at position or invalid player:', from);
        }
    } else {
        console.error('Invalid game state or player turn:', gameId, playerName);
    }
}

// Broadcast the current game state to all players
function broadcastGameState(gameId, game) {
    const gameState = sanitizeGameState(game);
    
    if (!game.players || !game.scores) {
        console.error('Invalid game state: Missing players or scores');
        return;
    }

    const monstersCount = {};
    game.players.forEach(player => {
        monstersCount[player.playerName] = countMonsters(game.state, player.playerName);
    });

    game.players.forEach(({ playerName }) => {
        const ws = players[playerName];
        if (ws) {
            const gameStatePayload = {
                ...gameState,
                monstersCount,
                scores: game.scores
            };
            ws.send(JSON.stringify({ type: 'gameState', payload: gameStatePayload }));
        }
    });
}

// Count the number of monsters a player has on the game board
function countMonsters(state, playerName) {
    let count = 0;
    state.forEach(row => {
        row.forEach(cell => {
            if (cell && cell.playerName === playerName) {
                count++;
            }
        });
    });
    return count;
}

// Sanitize the game state for broadcasting
function sanitizeGameState(game) {
    return {
        players: game.players.map(p => ({ playerName: p.playerName })),
        state: game.state,
        turn: game.turn,
        scores: game.scores
    };
}

// Get the next player's turn
function getNextPlayer(game) {
    const currentIndex = game.players.findIndex(p => p.playerName === game.turn);
    const nextIndex = (currentIndex + 1) % game.players.length;
    return game.players[nextIndex].playerName;
}

// Validate if a position is within the game board
function isValidPosition(state, position) {
    const numRows = state.length;
    const numCols = state[0].length;
    return position.x >= 0 && position.x < numCols && position.y >= 0 && position.y < numRows;
}

// Validate if a move is legal according to game rules
function isValidMove(game, from, to) {
    if (to.x < 0 || to.x >= game.state[0].length || to.y < 0 || to.y >= game.state.length) {
        console.error('Destination cell is outside the board:', to);
        return false;
    }

    const targetMonster = game.state[to.y][to.x];
    if (targetMonster !== null && targetMonster.playerName === game.turn) {
        console.error('Cannot move to cell occupied by own monster:', to);
        return false;
    }

    if (!isPathClear(game, from, to)) {
        console.error('Path is not clear:', from, to);
        return false;
    }

    const dx = Math.abs(from.x - to.x);
    const dy = Math.abs(from.y - to.y);

    if ((dx > 0 && dy === 0) || (dy > 0 && dx === 0)) {
        return true;
    }

    if (dx === dy && dx <= 2) {
        return true;
    }

    console.error('Invalid move: Moves must be horizontal, vertical, or diagonal within two cells');
    return false;
}

// Check if the path for a move is clear of other monsters
function isPathClear(game, from, to) {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);

    if (dx !== 0 && dy === 0) {
        for (let x = Math.min(from.x, to.x) + 1; x < Math.max(from.x, to.x); x++) {
            const monster = game.state[from.y][x];
            if (monster !== null && monster.playerName !== game.turn) {
                return false;
            }
        }
        return true;
    }

    if (dx === 0 && dy !== 0) {
        for (let y = Math.min(from.y, to.y) + 1; y < Math.max(from.y, to.y); y++) {
            const monster = game.state[y][from.x];
            if (monster !== null && monster.playerName !== game.turn) {
                return false;
            }
        }
        return true;
    }

    if (dx !== 0 && dy !== 0) {
        let x = from.x + dx;
        let y = from.y + dy;

        while (x !== to.x || y !== to.y) {
            if (x < 0 || x >= game.state[0].length || y < 0 || y >= game.state.length) {
                return false;
            }

            const monster = game.state[y][x];
            if (monster !== null && monster.playerName !== game.turn) {
                return false;
            }

            x += dx;
            y += dy;
        }

        return true;
    }

    return false;
}

// Handle monster battles according to game rules
function MonstersBattle(currentMonster, targetMonster) {
    const combatMatrix = {
        '🧛🏿': { '🐺': 'current', '👻': 'target', '🧛🏿': 'both' },
        '🐺': { '🧛🏿': 'target', '👻': 'current', '🐺': 'both' },
        '👻': { '🧛🏿': 'current', '🐺': 'target', 'ghost': 'both' }
    };

    if (!combatMatrix[currentMonster.type] || !combatMatrix[currentMonster.type][targetMonster.type]) {
        console.error('Combat type not defined:', currentMonster.type, targetMonster.type);
        return null;
    }

    return combatMatrix[currentMonster.type][targetMonster.type];
}

// Create a new game state
function createNewGameState(players) {
    return {
        players: players,
        state: Array(10).fill().map(() => Array(10).fill(null)),
        turn: players[0].playerName,
        lastPlaced: null,
        scores: players.reduce((acc, player) => {
            acc[player.playerName] = 0;
            return acc;
        }, {})
    };
}

// Reset the game state
function ResetGame(ws, { gameId }) {
    const game = checkGame(gameId);
    if (game) {
        games[gameId] = createNewGameState(game.players);
        broadcastGameState(gameId, games[gameId]);
    }
}

// Start the server and listen on port 3000
server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
