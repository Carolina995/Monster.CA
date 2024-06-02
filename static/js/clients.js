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