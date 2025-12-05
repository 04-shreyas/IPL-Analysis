const Player = require('../models/Player');

const getAllPlayers = async (req, res) => {
  try {
    const { team } = req.query;
    let filter = {};
    
    if (team) {
      filter.team = new RegExp(team, 'i');
    }
    
    const players = await Player.find(filter).select('-__v');
    
    res.json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching players',
      error: error.message
    });
  }
};

const getTopBatsmen = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const topBatsmen = await Player.find({ totalRuns: { $gt: 0 } })
      .sort({ totalRuns: -1 })
      .limit(limit)
      .select('-__v');
    
    res.json({
      success: true,
      count: topBatsmen.length,
      data: topBatsmen
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching top batsmen',
      error: error.message
    });
  }
};

module.exports = {
  getAllPlayers,
  getTopBatsmen
};
