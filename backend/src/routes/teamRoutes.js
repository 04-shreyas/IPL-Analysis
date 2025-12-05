const express = require('express');
const router = express.Router();
const { getTeamSeasons, getTeamSeasonMatches } = require('../controllers/teamController');

// GET /api/teams/:teamName/seasons
router.get('/:teamName/seasons', getTeamSeasons);

// GET /api/teams/:teamName/seasons/:season/matches
router.get('/:teamName/seasons/:season/matches', getTeamSeasonMatches);

module.exports = router;
