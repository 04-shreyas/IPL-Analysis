const Match = require('../models/Match');
const Delivery = require('../models/Delivery');

// GET /api/teams/:teamName/seasons
const getTeamSeasons = async (req, res) => {
  try {
    const { teamName } = req.params;
    
    if (!teamName) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const decodedTeamName = decodeURIComponent(teamName);

    // Get all matches for this team
    const teamMatches = await Match.find({
      $or: [
        { team1: { $regex: new RegExp(`^${decodedTeamName}$`, 'i') } },
        { team2: { $regex: new RegExp(`^${decodedTeamName}$`, 'i') } }
      ]
    }).lean();

    if (teamMatches.length === 0) {
      return res.status(404).json({ message: 'No matches found for this team' });
    }

    // Group matches by season and calculate basic stats
    const seasonStats = {};
    
    teamMatches.forEach(match => {
      const season = match.season;
      if (!seasonStats[season]) {
        seasonStats[season] = {
          season,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          noResult: 0,
          matchIds: []
        };
      }
      
      seasonStats[season].matchesPlayed++;
      seasonStats[season].matchIds.push(match.matchId || match.match_id);
      
      if (match.result && match.result.toLowerCase().includes('tie')) {
        seasonStats[season].ties++;
      } else if (match.result && match.result.toLowerCase().includes('no result')) {
        seasonStats[season].noResult++;
      } else if (match.winner) {
        const isWinner = match.winner.toLowerCase() === decodedTeamName.toLowerCase();
        if (isWinner) {
          seasonStats[season].wins++;
        } else {
          seasonStats[season].losses++;
        }
      } else {
        seasonStats[season].noResult++;
      }
    });

    // Now get batting stats from deliveries for each season
    const seasonsArray = Object.values(seasonStats);
    
    for (const seasonData of seasonsArray) {
      // Get runs scored by this team (when batting)
      const runsScored = await Delivery.aggregate([
        {
          $match: {
            $or: [
              { matchId: { $in: seasonData.matchIds } },
              { match_id: { $in: seasonData.matchIds } }
            ],
            $or: [
              { battingTeam: { $regex: new RegExp(`^${decodedTeamName}$`, 'i') } },
              { batting_team: { $regex: new RegExp(`^${decodedTeamName}$`, 'i') } }
            ]
          }
        },
        {
          $group: {
            _id: { matchId: { $ifNull: ['$matchId', '$match_id'] }, inning: '$inning' },
            totalRuns: { $sum: { $ifNull: ['$totalRuns', '$total_runs'] } }
          }
        },
        {
          $group: {
            _id: null,
            totalRuns: { $sum: '$totalRuns' },
            innings: { $push: '$totalRuns' }
          }
        }
      ]);

      // Get runs conceded by this team (when bowling)
      const runsConceded = await Delivery.aggregate([
        {
          $match: {
            $or: [
              { matchId: { $in: seasonData.matchIds } },
              { match_id: { $in: seasonData.matchIds } }
            ],
            $or: [
              { bowlingTeam: { $regex: new RegExp(`^${decodedTeamName}$`, 'i') } },
              { bowling_team: { $regex: new RegExp(`^${decodedTeamName}$`, 'i') } }
            ]
          }
        },
        {
          $group: {
            _id: { matchId: { $ifNull: ['$matchId', '$match_id'] }, inning: '$inning' },
            totalRuns: { $sum: { $ifNull: ['$totalRuns', '$total_runs'] } }
          }
        },
        {
          $group: {
            _id: null,
            totalRuns: { $sum: '$totalRuns' }
          }
        }
      ]);

      const scoredData = runsScored[0] || { totalRuns: 0, innings: [] };
      const concededData = runsConceded[0] || { totalRuns: 0 };
      
      seasonData.runsScored = scoredData.totalRuns;
      seasonData.runsConceded = concededData.totalRuns;
      seasonData.highestScore = scoredData.innings.length > 0 ? Math.max(...scoredData.innings) : 0;
      seasonData.lowestScore = scoredData.innings.length > 0 ? Math.min(...scoredData.innings) : 0;
      seasonData.averageScore = scoredData.innings.length > 0 ? 
        Math.round(scoredData.totalRuns / scoredData.innings.length) : 0;
      
      // Remove matchIds from response
      delete seasonData.matchIds;
    }

    // Sort by season descending (latest first)
    seasonsArray.sort((a, b) => b.season - a.season);

    res.json({ data: seasonsArray });
  } catch (error) {
    console.error('getTeamSeasons error:', error);
    res.status(500).json({ message: 'Failed to fetch team seasons' });
  }
};

// GET /api/teams/:teamName/seasons/:season/matches
const getTeamSeasonMatches = async (req, res) => {
  try {
    const { teamName, season } = req.params;
    
    if (!teamName || !season) {
      return res.status(400).json({ message: 'Team name and season are required' });
    }

    const decodedTeamName = decodeURIComponent(teamName);
    const seasonNum = parseInt(season, 10);

    if (isNaN(seasonNum)) {
      return res.status(400).json({ message: 'Invalid season number' });
    }

    // Get all matches for this team in this season
    const matches = await Match.find({
      season: seasonNum,
      $or: [
        { team1: { $regex: new RegExp(`^${decodedTeamName}$`, 'i') } },
        { team2: { $regex: new RegExp(`^${decodedTeamName}$`, 'i') } }
      ]
    }).lean().sort({ date: 1 });

    if (matches.length === 0) {
      return res.status(404).json({ message: 'No matches found for this team in this season' });
    }

    // Process each match to get opponent and team scores
    const matchesWithDetails = [];
    
    for (const match of matches) {
      const isTeam1 = match.team1.toLowerCase() === decodedTeamName.toLowerCase();
      const opponent = isTeam1 ? match.team2 : match.team1;
      
      // Get team scores from deliveries
      const matchId = match.matchId || match.match_id;
      
      const teamScores = await Delivery.aggregate([
        {
          $match: {
            $or: [
              { matchId: matchId },
              { match_id: matchId }
            ]
          }
        },
        {
          $group: {
            _id: { 
              inning: '$inning',
              battingTeam: { $ifNull: ['$battingTeam', '$batting_team'] }
            },
            totalRuns: { $sum: { $ifNull: ['$totalRuns', '$total_runs'] } },
            wickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } },
            lastOver: { $max: '$over' },
            lastBall: { $max: { $cond: [{ $eq: ['$over', { $max: '$over' }] }, '$ball', 0] } }
          }
        },
        {
          $project: {
            inning: '$_id.inning',
            battingTeam: '$_id.battingTeam',
            totalRuns: 1,
            wickets: 1,
            overs: {
              $cond: [
                { $eq: ['$lastBall', 0] },
                '$lastOver',
                { $add: ['$lastOver', { $divide: ['$lastBall', 10] }] }
              ]
            },
            _id: 0
          }
        },
        { $sort: { inning: 1 } }
      ]);

      // Organize scores by innings for this team
      const teamScore = { innings1: null, innings2: null };
      
      teamScores.forEach(score => {
        const isTeamBatting = score.battingTeam.toLowerCase() === decodedTeamName.toLowerCase();
        if (isTeamBatting) {
          const inningsKey = score.inning === 1 ? 'innings1' : 'innings2';
          teamScore[inningsKey] = {
            total: score.totalRuns,
            wickets: score.wickets,
            overs: parseFloat(score.overs.toFixed(1))
          };
        }
      });

      matchesWithDetails.push({
        matchId: matchId,
        date: match.date,
        venue: match.venue,
        opponent: opponent,
        tossWinner: match.tossWinner,
        tossDecision: match.tossDecision,
        winner: match.winner,
        result: match.result,
        teamScore: teamScore
      });
    }

    res.json({ data: matchesWithDetails });
  } catch (error) {
    console.error('getTeamSeasonMatches error:', error);
    res.status(500).json({ message: 'Failed to fetch team season matches' });
  }
};

module.exports = {
  getTeamSeasons,
  getTeamSeasonMatches
};
