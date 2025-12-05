const express = require('express');
const { getAllTeams, getTeamByName } = require('../controllers/teamsController');

const router = express.Router();

// GET /api/teams
router.get('/', getAllTeams);

// GET /api/teams/:name
router.get('/:name', getTeamByName);

module.exports = router;
