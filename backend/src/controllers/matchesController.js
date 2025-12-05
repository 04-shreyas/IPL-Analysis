const Match = require('../models/Match');
const Delivery = require('../models/Delivery');

// Helper function to determine Player of the Match
const determinePlayerOfMatch = (topBatsmen, topBowlers, winner) => {
  // Simple algorithm: highest impact player from winning team
  const winningBatsmen = topBatsmen.filter(b => 
    b._id.batting_team === winner || 
    (b._id.inning === 2 && winner) // Second innings batsman from winning team
  );
  
  const winningBowlers = topBowlers.filter(b => 
    b._id.bowling_team !== winner || // Bowler from losing team who took wickets
    (b.wickets >= 3) // Any bowler with 3+ wickets
  );

  // Score batsmen (runs + strike rate bonus)
  const batsmenScores = winningBatsmen.map(b => ({
    player: b._id.batsman,
    score: b.runs + (b.runs > 50 ? 20 : 0) + (b.balls > 0 && (b.runs/b.balls) > 1.5 ? 15 : 0),
    type: 'batting'
  }));

  // Score bowlers (wickets * 15 + economy bonus)
  const bowlerScores = winningBowlers.map(b => ({
    player: b._id.bowler,
    score: (b.wickets * 15) + (b.balls > 0 && (b.runs/b.balls) < 0.125 ? 10 : 0), // Economy < 7.5
    type: 'bowling'
  }));

  const allScores = [...batsmenScores, ...bowlerScores];
  
  if (allScores.length === 0) {
    return topBatsmen[0]?._id.batsman || 'N/A';
  }

  const playerOfMatch = allScores.reduce((max, current) => 
    current.score > max.score ? current : max
  );

  return playerOfMatch.player;
};

const getAllMatches = async (req, res) => {
  try {
    const { team, season } = req.query;
    let filter = {};
    
    if (team) {
      filter.$or = [
        { team1: new RegExp(team, 'i') },
        { team2: new RegExp(team, 'i') }
      ];
    }
    
    if (season) {
      filter.season = parseInt(season);
    }
    
    const matches = await Match.find(filter).select('-__v').sort({ date: -1 });
    
    res.json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching matches',
      error: error.message
    });
  }
};

const getMatchesSummary = async (req, res) => {
  try {
    const totalMatches = await Match.countDocuments();
    
    // Matches per season
    const matchesPerSeason = await Match.aggregate([
      {
        $group: {
          _id: '$season',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Wins per team
    const winsPerTeam = await Match.aggregate([
      {
        $match: { winner: { $ne: null, $ne: '' } }
      },
      {
        $group: {
          _id: '$winner',
          wins: { $sum: 1 }
        }
      },
      {
        $sort: { wins: -1 }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        totalMatches,
        matchesPerSeason: matchesPerSeason.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        winsPerTeam: winsPerTeam.reduce((acc, item) => {
          acc[item._id] = item.wins;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching matches summary',
      error: error.message
    });
  }
};

// GET /api/matches/:matchId/details
const getMatchDetails = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Get innings data from deliveries
    const inningsData = await Delivery.aggregate([
      { $match: { match_id: matchId } },
      {
        $group: {
          _id: { inning: '$inning', batting_team: '$batting_team' },
          totalRuns: { $sum: '$total_runs' },
          wickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } },
          overs: { $max: '$over' },
          balls: { $sum: 1 }
        }
      },
      { $sort: { '_id.inning': 1 } }
    ]);

    // Get top performers
    const topBatsmen = await Delivery.aggregate([
      { $match: { match_id: matchId } },
      {
        $group: {
          _id: { batsman: '$batsman', inning: '$inning' },
          runs: { $sum: '$batsman_runs' },
          balls: { $sum: 1 },
          fours: { $sum: { $cond: [{ $eq: ['$batsman_runs', 4] }, 1, 0] } },
          sixes: { $sum: { $cond: [{ $eq: ['$batsman_runs', 6] }, 1, 0] } },
          dismissal: { 
            $first: { 
              $cond: [
                { $eq: ['$player_dismissed', '$batsman'] },
                { $concat: ['$dismissal_kind', ' ', { $ifNull: ['$fielder', ''] }] },
                null
              ]
            }
          }
        }
      },
      { $sort: { runs: -1 } },
      { $limit: 5 }
    ]);

    const topBowlers = await Delivery.aggregate([
      { $match: { match_id: matchId } },
      {
        $group: {
          _id: { bowler: '$bowler', inning: '$inning' },
          wickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } },
          runs: { $sum: '$total_runs' },
          balls: { $sum: 1 }
        }
      },
      { $sort: { wickets: -1, runs: 1 } },
      { $limit: 5 }
    ]);

    // Build innings objects
    const firstInnings = inningsData.find(i => i._id.inning === 1);
    const secondInnings = inningsData.find(i => i._id.inning === 2);

    const data = {
      team1: match.team1,
      team2: match.team2,
      venue: match.venue,
      date: match.date,
      tossWinner: match.tossWinner,
      tossDecision: match.tossDecision,
      winner: match.winner,
      winMargin: match.result || 'N/A',
      firstInnings: firstInnings ? {
        battingTeam: firstInnings._id.batting_team,
        totalRuns: firstInnings.totalRuns,
        totalWickets: firstInnings.wickets,
        overs: firstInnings.overs,
        batting: topBatsmen.filter(b => b._id.inning === 1).map(b => ({
          name: b._id.batsman,
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
          dismissal: b.dismissal || 'not out'
        })),
        bowling: topBowlers.filter(b => b._id.inning === 1).map(b => ({
          name: b._id.bowler,
          overs: (b.balls / 6).toFixed(1),
          maidens: 0,
          runs: b.runs,
          wickets: b.wickets
        }))
      } : null,
      secondInnings: secondInnings ? {
        battingTeam: secondInnings._id.batting_team,
        totalRuns: secondInnings.totalRuns,
        totalWickets: secondInnings.wickets,
        overs: secondInnings.overs,
        batting: topBatsmen.filter(b => b._id.inning === 2).map(b => ({
          name: b._id.batsman,
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
          dismissal: b.dismissal || 'not out'
        })),
        bowling: topBowlers.filter(b => b._id.inning === 2).map(b => ({
          name: b._id.bowler,
          overs: (b.balls / 6).toFixed(1),
          maidens: 0,
          runs: b.runs,
          wickets: b.wickets
        }))
      } : null,
      topPerformers: {
        playerOfMatch: determinePlayerOfMatch(topBatsmen, topBowlers, match.winner),
        highestScore: topBatsmen[0] ? { 
          player: topBatsmen[0]._id.batsman, 
          runs: topBatsmen[0].runs 
        } : null,
        bestBowling: topBowlers[0] ? { 
          player: topBowlers[0]._id.bowler, 
          figures: `${topBowlers[0].wickets}/${topBowlers[0].runs}` 
        } : null
      }
    };

    res.json({ data });
  } catch (error) {
    console.error('getMatchDetails error:', error);
    res.status(500).json({ message: 'Failed to fetch match details' });
  }
};

// GET /api/matches/:matchId/timeline
const getMatchTimeline = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // Get over-by-over data for both innings
    const timelineData = await Delivery.aggregate([
      { $match: { match_id: matchId } },
      {
        $group: {
          _id: { inning: '$inning', over: '$over' },
          runsInOver: { $sum: '$total_runs' },
          wicketsInOver: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } }
        }
      },
      { $sort: { '_id.inning': 1, '_id.over': 1 } }
    ]);

    // Calculate cumulative runs and run rates
    const firstInnings = [];
    const secondInnings = [];
    
    let firstCumulative = 0;
    let secondCumulative = 0;

    timelineData.forEach(over => {
      const overData = {
        over: over._id.over,
        runsInOver: over.runsInOver,
        wickets: over.wicketsInOver
      };

      if (over._id.inning === 1) {
        firstCumulative += over.runsInOver;
        overData.cumulativeRuns = firstCumulative;
        overData.currentRunRate = (firstCumulative / over._id.over).toFixed(2);
        firstInnings.push(overData);
      } else {
        secondCumulative += over.runsInOver;
        overData.cumulativeRuns = secondCumulative;
        overData.currentRunRate = (secondCumulative / over._id.over).toFixed(2);
        
        // Calculate required run rate for second innings
        const target = firstCumulative + 1;
        const ballsRemaining = (20 - over._id.over) * 6;
        const runsRequired = target - secondCumulative;
        overData.requiredRunRate = ballsRemaining > 0 ? ((runsRequired / ballsRemaining) * 6).toFixed(2) : 0;
        
        secondInnings.push(overData);
      }
    });

    const data = {
      firstInnings,
      secondInnings
    };

    res.json({ data });
  } catch (error) {
    console.error('getMatchTimeline error:', error);
    res.status(500).json({ message: 'Failed to fetch match timeline' });
  }
};

module.exports = {
  getAllMatches,
  getMatchesSummary,
  getMatchDetails,
  getMatchTimeline
};
