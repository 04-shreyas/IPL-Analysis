const Team = require('../models/Team');

const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().select('-__v');
    res.json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching teams',
      error: error.message
    });
  }
};

const getTeamByName = async (req, res) => {
  try {
    const { name } = req.params;
    const team = await Team.findOne({ 
      $or: [
        { name: new RegExp(name, 'i') },
        { shortName: new RegExp(name, 'i') }
      ]
    }).select('-__v');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching team',
      error: error.message
    });
  }
};

module.exports = {
  getAllTeams,
  getTeamByName
};
