const express = require('express');
const healthRoutes = require('./health');
const teamsRoutes = require('./teams');
const playersRoutes = require('./players');
const matchesRoutes = require('./matches');
const headToHeadRoutes = require('./headToHead');
const analyticsRoutes = require('./analytics');
const analyticsAdvancedRoutes = require('./analyticsAdvancedRoutes');
const predictRoutes = require('./predict');
const teamRoutes = require('./teamRoutes');
const matchRoutes = require('./matchRoutes');

const router = express.Router();

// Health check route
router.use('/', healthRoutes);

// API routes
router.use('/teams', teamsRoutes);
router.use('/players', playersRoutes);
router.use('/matches', matchesRoutes);
router.use('/headtohead', headToHeadRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/analytics', analyticsAdvancedRoutes);
router.use('/predict', predictRoutes);

// New detailed team and match routes
router.use('/teams', teamRoutes);
router.use('/matches', matchRoutes);

module.exports = router;
