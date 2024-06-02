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