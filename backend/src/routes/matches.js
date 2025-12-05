const express = require('express');
const { getAllMatches, getMatchesSummary, getMatchDetails, getMatchTimeline } = require('../controllers/matchesController');

const router = express.Router();

// GET /api/matches
router.get('/', getAllMatches);

// GET /api/matches/stats/summary
router.get('/stats/summary', getMatchesSummary);

// GET /api/matches/:matchId/details
router.get('/:matchId/details', getMatchDetails);

// GET /api/matches/:matchId/timeline
router.get('/:matchId/timeline', getMatchTimeline);

module.exports = router;
