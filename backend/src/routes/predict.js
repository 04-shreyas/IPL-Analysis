const express = require('express');
const axios = require('axios');

const router = express.Router();

// ML Service base URL
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// POST /api/predict/match-winner
router.post('/match-winner', async (req, res) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/ml/predict/match-winner`, req.body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Match winner prediction error:', error.message);
    res.status(500).json({ 
      message: 'Failed to get match winner prediction',
      error: error.response?.data || error.message 
    });
  }
});

// POST /api/predict/score
router.post('/score', async (req, res) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/ml/predict/score`, req.body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Score prediction error:', error.message);
    res.status(500).json({ 
      message: 'Failed to get score prediction',
      error: error.response?.data || error.message 
    });
  }
});

module.exports = router;
