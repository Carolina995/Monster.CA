document.addEventListener('DOMContentLoaded', () => {
    // Establish a WebSocket connection to the server
    const socket = new WebSocket(`ws://${window.location.hostname}:3000`);
 // When the connection is open
 socket.onopen = () => {
    console.log('Connected to server');

    // Send a message to start the game with gameId and playerName
    const message = { type: 'startGame', payload: { gameId, playerName } };
    socket.send(JSON.stringify(message));
};

// When a message is received from the server
socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received message from server:', message);

    if (message.type === 'gameState') {
        // Update the current turn player
        currentTurnPlayer = message.payload.turn;
        // Render the game board with the current state
        renderGameBoard(message.payload.state);
        // Update the scoreboard with the number of monsters for each player
        updateScoreboard(message.payload.playerMonstersCount);

        // Update the UI based on the current turn
        if (currentTurnPlayer === playerName) {
            document.getElementById('game-board').classList.add('your-turn');
        } else {
            document.getElementById('game-board').classList.remove('your-turn');
        }

    } else if (message.type === 'statsUpdate') {
        // Update game statistics
        updateGameStats(message.payload.totalGamesPlayed, message.payload.playerStats);
    }
};

// Update game statistics in the UI
function updateGameStats(totalGamesPlayed, playerStats) {
    document.getElementById('total-games-played').innerText = totalGamesPlayed;

    const playerStatsList = document.getElementById('player-stats');
    playerStatsList.innerHTML = '';

    for (const [playerName, stats] of Object.entries(playerStats)) {
        const listItem = document.createElement('li');
        listItem.innerText = `${playerName}: ${stats.wins} wins, ${stats.losses} losses`;
        playerStatsList.appendChild(listItem);
    }
}

// Variable to store the selected monster
let selectedMonster = null;
let selectedPosition = null;

// Event handler to select a monster
document.querySelectorAll('.monster-selection').forEach(element => {
    // Add click event handler to select a monster
    element.addEventListener('click', (event) => {
        selectedMonster = event.currentTarget.dataset.monsterType;
        selectedPosition = null; // Reset selected position
        console.log('Selected monster:', selectedMonster);
    });
});

// Event handler to place a monster or move an existing monster
document.getElementById('game-board').addEventListener('click', (event) => {
    if (!document.getElementById('game-board').classList.contains('your-turn')) {
        console.log('Not your turn!');
        return;
    }

    const cell = event.target;
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);

    if (selectedMonster) {
        // Send a message to the server indicating the monster placement
        const placeMessage = { type: 'monsterPlace', payload: { gameId, playerName, monsterType: selectedMonster, position: { x, y } } };
        socket.send(JSON.stringify(placeMessage));
        selectedMonster = null; // Reset selected monster after placement
    } else {
        if (selectedPosition) {
            // Send a message to the server indicating the monster movement
            const moveMessage = { type: 'monsterMove', payload: { gameId, playerName, from: selectedPosition, to: { x, y } } };
            socket.send(JSON.stringify(moveMessage));
            selectedPosition = null; // Reset selected position after movement
        } else if (cell.classList.contains(`player-${playerName}`)) {
            // Select an existing monster for movement
            selectedPosition = { x, y };
            console.log('Selected position for moving:', selectedPosition);
        }
    }
});

    // Log WebSocket errors
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    // When the connection is closed
    socket.onclose = () => {
        console.log('Connection closed');
    };
});
// Function to render the game board based on the state
function renderGameBoard(state) {
    const boardElement = document.getElementById('game-board');
    boardElement.innerHTML = ''; // Clear the current board content

    state.forEach((row, y) => {
        row.forEach((cell, x) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.classList.add('box');
            if (cell) {
                cellElement.classList.add(`player-${cell.playerName}`);
                cellElement.innerText = cell.type;
                // Add special class if it's the current player's monster
                if (cell.playerName === currentTurnPlayer) {
                    cellElement.classList.add('monster-your-turn');
                }
            }
            cellElement.dataset.x = x;
            cellElement.dataset.y = y;
            boardElement.appendChild(cellElement);
        });
    });
}

// Function to update the scoreboard with the number of monsters for each player
function updateScoreboard(playerMonstersCount) {
    const scoreboardElement = document.getElementById('scoreboard');
    scoreboardElement.innerHTML = ''; // Clear the current scoreboard content

    for (const playerName in playerMonstersCount) {
        const playerScore = playerMonstersCount[playerName];
        const playerScoreElement = document.createElement('div');
        if (playerScore === 0) {
            playerScoreElement.innerText = `${playerName}: 0`;
        } else {
            playerScoreElement.innerText = `${playerName}: ${playerScore} monsters`;
        }
        scoreboardElement.appendChild(playerScoreElement);
    }
}
