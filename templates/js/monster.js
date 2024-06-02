document.addEventListener('DOMContentLoaded', () => {
    // Establish a WebSocket connection to the server
    const socket = new WebSocket(`ws://${window.location.hostname}:3000`);
