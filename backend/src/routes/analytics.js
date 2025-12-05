const express = require('express');
const {
  getPlayerStats,
  getBowlerStats,
  getVenueStats,
  getAllVenues,
  getUmpireStats,
  getAllUmpires,
  getPartnerships,
  getSeasonSummary,
  getMilestones
} = require('../controllers/analyticsController');

const router = express.Router();

// GET /api/analytics/players/:playerId
router.get('/players/:playerId', getPlayerStats);

// GET /api/analytics/bowlers/:playerId  
router.get('/bowlers/:playerId', getBowlerStats);

// GET /api/analytics/venues (list all venues)
router.get('/venues', getAllVenues);

// GET /api/analytics/venues/:venue (specific venue stats)
router.get('/venues/:venue', getVenueStats);

// GET /api/analytics/umpires (list all umpires)
router.get('/umpires', getAllUmpires);

// GET /api/analytics/umpires/:umpireId (specific umpire stats)
router.get('/umpires/:umpireId', getUmpireStats);

// GET /api/analytics/partnerships?team=TEAM_NAME
router.get('/partnerships', getPartnerships);

// GET /api/analytics/seasons/:year
router.get('/seasons/:year', getSeasonSummary);

// GET /api/analytics/milestones
router.get('/milestones', getMilestones);

module.exports = router;
