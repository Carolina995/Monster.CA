const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index');
});

router.post('/game', (req, res) => {
    const playerName = req.body.playerName;
    const invitationCode = req.body.invitationCode;

    // Gerar ou usar um Game ID existente
    const gameId = invitationCode || Math.floor(Math.random() * 10000).toString();

    res.render('game', { gameId, playerName });
});

module.exports = router;
