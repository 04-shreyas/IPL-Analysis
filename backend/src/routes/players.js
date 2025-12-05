const express = require('express');
const { getAllPlayers, getTopBatsmen } = require('../controllers/playersController');

const router = express.Router();

// GET /api/players
router.get('/', getAllPlayers);

// GET /api/players/top-batsmen
router.get('/top-batsmen', getTopBatsmen);

module.exports = router;
