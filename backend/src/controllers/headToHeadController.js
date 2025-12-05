const Match = require('../models/Match');

const getHeadToHead = async (req, res) => {
  try {
    const { team1, team2, season } = req.query;
    
    if (!team1 || !team2) {
      return res.status(400).json({
        success: false,
        message: 'Both team1 and team2 parameters are required'
      });
    }
    
    // Build base filter for matches between these two teams
    const baseFilter = {
      $or: [
        { team1: new RegExp(team1, 'i'), team2: new RegExp(team2, 'i') },
        { team1: new RegExp(team2, 'i'), team2: new RegExp(team1, 'i') }
      ]
    };

    // Optional season filter
    if (season) {
      baseFilter.season = parseInt(season);
    }

    // Find all matches between these two teams (and season, if provided)
    const matches = await Match.find(baseFilter);
    
    const totalMatchesBetween = matches.length;
    
    let winsTeam1 = 0;
    let winsTeam2 = 0;
    let tiesOrNoResult = 0;
    
    matches.forEach(match => {
      if (!match.winner || match.winner === '') {
        tiesOrNoResult++;
      } else if (new RegExp(team1, 'i').test(match.winner)) {
        winsTeam1++;
      } else if (new RegExp(team2, 'i').test(match.winner)) {
        winsTeam2++;
      } else {
        tiesOrNoResult++;
      }
    });
    
    res.json({
      success: true,
      data: {
        team1,
        team2,
        totalMatchesBetween,
        winsTeam1,
        winsTeam2,
        tiesOrNoResult
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching head-to-head data',
      error: error.message
    });
  }
};

module.exports = {
  getHeadToHead
};
