document.addEventListener('DOMContentLoaded', () => {
    const socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
        console.log('Connected to server');
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Received message from server:', message);
        // Aqui você pode implementar a lógica para lidar com as mensagens recebidas do servidor
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
        console.log('Connection closed');
    };
});
function startGame() {
    const playerName = document.getElementById('playerName').value;
    const invitationCode = document.getElementById('invitationCode').value;
    let gameId = invitationCode;
    if (!gameId) {
        gameId = generateGameId(); // Gera um ID de jogo se não for fornecido
    }
    const playerId = generatePlayerId(); // Gera um ID único para o jogador
    const form = document.getElementById('gameForm');
    form.action = `/game?gameId=${gameId}&playerName=${playerName}&playerId=${playerId}`;
    form.submit();
}

function joinWithInvitation() {
    // Implementar lógica para se juntar com um código de convite
    alert('Joining with invitation...');
}

function generateGameId() {
    return Math.floor(Math.random() * 10000);
}

function generatePlayerId() {
    return 'player-' + Math.random().toString(36).substr(2, 9);
} function startGame() {
    const playerName = document.getElementById('playerName').value;
    const invitationCode = document.getElementById('invitationCode').value;
    let gameId = invitationCode;
    if (!gameId) {
        gameId = generateGameId(); // Gera um ID de jogo se não for fornecido
    }
    const playerId = generatePlayerId(); // Gera um ID único para o jogador
    const form = document.getElementById('gameForm');
    form.action = `/game?gameId=${gameId}&playerName=${playerName}&playerId=${playerId}`;
    form.submit();
}

function joinWithInvitation() {
    // Implementar lógica para se juntar com um código de convite
    alert('Joining with invitation...');
}

function generateGameId() {
    return Math.floor(Math.random() * 10000);
}

function generatePlayerId() {
    return 'player-' + Math.random().toString(36).substr(2, 9);
}
