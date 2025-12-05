const express = require('express');
const router = express.Router();
const {
  getPhaseAnalysis,
  getVenueMetrics,
  getImpactIndex,
  getRivalBattle,
  getMatchOverStats
} = require('../controllers/analyticsAdvancedController');

/**
 * Advanced Analytics Routes
 * 
 * These routes provide deep analytics for IPL data including:
 * - Phase-wise analysis (powerplay/middle/death)
 * - Venue-specific metrics
 * - Player/team impact index
 * - Batsman vs bowler rivalry stats
 * - Match over-by-over aggregates
 * 
 * Full API documentation: backend/docs/analytics_endpoints.md
 */

// Phase analysis - batting/bowling stats by phase
// GET /api/analytics/phase?team=X&player=Y&season=2020
// Example curl:
//   curl "http://localhost:5000/api/analytics/phase?team=Mumbai%20Indians&season=2020"
//   curl "http://localhost:5000/api/analytics/phase?player=Rohit%20Sharma"
//   curl "http://localhost:5000/api/analytics/phase?season=2019"
router.get('/phase', getPhaseAnalysis);

// Venue metrics - scoring patterns and win percentages
// GET /api/analytics/venues/:venue/metrics?season=2020
// Example curl:
//   curl "http://localhost:5000/api/analytics/venues/Wankhede%20Stadium/metrics"
//   curl "http://localhost:5000/api/analytics/venues/Eden%20Gardens/metrics?season=2019"
router.get('/venues/:venue/metrics', getVenueMetrics);

// Impact index - player and team impact scores
// GET /api/analytics/impact?player=X&team=Y&season=2020&limit=50
// Example curl:
//   curl "http://localhost:5000/api/analytics/impact?limit=50"
//   curl "http://localhost:5000/api/analytics/impact?player=Virat%20Kohli&season=2016"
//   curl "http://localhost:5000/api/analytics/impact?team=Mumbai%20Indians"
router.get('/impact', getImpactIndex);

// Rival battle - batsman vs bowler head-to-head
// GET /api/analytics/rival?batsman=X&bowler=Y&matchFilter=2020
// Example curl:
//   curl "http://localhost:5000/api/analytics/rival?batsman=Virat%20Kohli&bowler=Lasith%20Malinga"
//   curl "http://localhost:5000/api/analytics/rival?batsman=MS%20Dhoni&bowler=Harbhajan%20Singh&matchFilter=2019"
router.get('/rival', getRivalBattle);

// Match over stats - per-over aggregates for Manhattan/Worm charts
// GET /api/matches/:matchId/overs?inning=1
// Note: This is mounted under /api/analytics but uses /matches path for consistency
// Example curl:
//   curl "http://localhost:5000/api/analytics/matches/335982/overs"
//   curl "http://localhost:5000/api/analytics/matches/335982/overs?inning=1"
router.get('/matches/:matchId/overs', getMatchOverStats);

module.exports = router;
