const express = require('express');
const router = express.Router();
const { getMatchDetails, getMatchDeliveries } = require('../controllers/matchController');

// GET /api/matches/:matchId
router.get('/:matchId', getMatchDetails);

// GET /api/matches/:matchId/deliveries
router.get('/:matchId/deliveries', getMatchDeliveries);

module.exports = router;
