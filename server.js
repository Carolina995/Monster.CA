// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const WebSocket = require('ws');

// Initialize the Express application
const app = express();
const server = require('http').createServer(app); // Create HTTP server
const wss = new WebSocket.Server({ server }); // Create WebSocket server

// Set up view engine and directory for templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates', 'views'));

// Middleware for parsing URL-encoded bodies and serving static files
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));

// Import and use router for handling routes
const indexRouter = require('./routes/route');
app.use('/', indexRouter);

// Data storage for games and players
let games = {};
let players = {};

// Utility functions to check and update game state
function checkGame(gameId) {
    return games[gameId] || null;
}

function updateGame(gameId, state) {
    games[gameId] = state;
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message); // Parse incoming message
        GameMessage(ws, data); // Handle game message
    });

    // Send welcome message to new connection
    ws.send(JSON.stringify({ message: 'Welcome to Monster Mayhem!' }));
});

// Function to handle different types of game messages
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

// Function to start a new game
function StartGame(ws, { gameId, playerName }) {
    if (!games[gameId]) {
        // Initialize new game
        games[gameId] = {
            players: [{ playerName, ws }],
            state: Array(10).fill().map(() => Array(10).fill(null)),
            turn: playerName,
            lastPlaced: null,
            scores: { [playerName]: 0 }
        };
    } else {
        // Add player to existing game
        games[gameId].players.push({ playerName, ws });
        games[gameId].scores[playerName] = 0;
    }
    players[playerName] = ws;
    // Send game state to player
    ws.send(JSON.stringify({ type: 'gameState', payload: sanitizeGameState(games[gameId]) }));
}

// Function to place a monster on the board
function MonsterPlace(ws, { gameId, playerName, position, monsterType }) {
    const game = checkGame(gameId);
    if (game && game.turn === playerName) {
        if (game.scores[playerName] < 10) {
            if (isValidPosition(game.state, position)) {
                const cell = game.state[position.y][position.x];
                if (!cell) {
                    // Place monster if cell is empty
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

// Function to move a monster on the board
function MonsterMove(ws, { gameId, playerName, from, to }) {
    const game = checkGame(gameId);
    if (game && game.turn === playerName) {
        const monster = game.state[from.y][from.x];
        if (monster && monster.playerName === playerName) {
            if (isValidMove(game, from, to)) {
                const targetMonster = game.state[to.y][to.x];
                if (targetMonster) {
                    if (targetMonster.playerName !== playerName) {
                        // Battle between monsters
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

// Function to broadcast game state to all players
function broadcastGameState(gameId, game) {
    const gameState = sanitizeGameState(game);

    // Verify game.players and game.scores before accessing them
    if (!game.players || !game.scores) {
        console.error('Invalid game state: Missing players or scores');
        return;
    }

    // Count number of monsters for each player
    const monstersCount = {};
    game.players.forEach(player => {
        monstersCount[player.playerName] = countMonsters(game.state, player.playerName);
    });

    // Send game state to each player
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

// Function to count the number of monsters a player has on the board
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

// Function to sanitize game state before sending to players
function sanitizeGameState(game) {
    return {
        players: game.players.map(p => ({ playerName: p.playerName })),
        state: game.state,
        turn: game.turn,
        scores: game.scores
    };
}

// Function to get the next player's turn
function getNextPlayer(game) {
    const currentIndex = game.players.findIndex(p => p.playerName === game.turn);
    const nextIndex = (currentIndex + 1) % game.players.length;
    return game.players[nextIndex].playerName;
}

// Function to validate a position on the board
function isValidPosition(state, position) {
    const numRows = state.length;
    const numCols = state[0].length;
    return position.x >= 0 && position.x < numCols && position.y >= 0 && position.y < numRows;
}

// Function to validate a move on the board
function isValidMove(game, from, to) {
    // Check if the destination cell is outside the board
    if (to.x < 0 || to.x >= game.state[0].length || to.y < 0 || to.y >= game.state.length) {
        console.error('Destination cell is outside the board:', to);
        return false;
    }

    // Check if the destination cell is occupied by own monster
    const targetMonster = game.state[to.y][to.x];
    if (targetMonster !== null && targetMonster.playerName === game.turn) {
        console.error('Cannot move to cell occupied by own monster:', to);
        return false;
    }

    // Check if the path is clear of monsters
    if (!isPathClear(game, from, to)) {
        console.error('Path is not clear:', from, to);
        return false;
    }

    // Calculate the distance of the move
    const dx = Math.abs(from.x - to.x);
    const dy = Math.abs(from.y - to.y);

    // Allow unlimited horizontal and vertical moves
    if ((dx > 0 && dy === 0) || (dy > 0 && dx === 0)) {
        return true;
    }

    // Allow diagonal moves up to 2 spaces
    if (dx === dy && dx <= 2) {
        return true;
    }

    console.error('Invalid move: Moves must be horizontal, vertical, or diagonal within two cells');
    return false;
}

// Function to check if the path for a move is clear of monsters
function isPathClear(game, from, to) {
    // Get the direction of movement
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);

    //
