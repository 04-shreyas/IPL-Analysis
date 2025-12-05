const express = require('express');
const { getHeadToHead } = require('../controllers/headToHeadController');

const router = express.Router();

// GET /api/headtohead?team1=...&team2=...
router.get('/', getHeadToHead);

module.exports = router;
