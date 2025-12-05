const Delivery = require('../models/Delivery');
const Match = require('../models/Match');
const { getPhaseFromOver } = require('../models/PhaseConstants');

// A) Phase Analysis - batting/bowling stats by powerplay/middle/death phases
const getPhaseAnalysis = async (req, res) => {
  try {
    const { team, player, season } = req.query;

    let matchFilter = {};
    if (season) {
      // Get matches for the season to filter deliveries
      const seasonMatches = await Match.find({ season: parseInt(season) }).select('matchId').lean();
      const matchIds = seasonMatches.map(m => m.matchId);
      matchFilter.matchId = { $in: matchIds };
    }

    if (team && player) {
      // Combined Team + Player analysis - stats only for this player when playing for this team
      const battingPipeline = [
        {
          $match: {
            ...matchFilter,
            battingTeam: team,
            batsman: player,
            over: { $gte: 1, $lte: 20 }
          }
        },
        {
          $addFields: {
            phase: {
              $switch: {
                branches: [
                  { case: { $and: [{ $gte: ['$over', 1] }, { $lte: ['$over', 6] }] }, then: 'POWERPLAY' },
                  { case: { $and: [{ $gte: ['$over', 7] }, { $lte: ['$over', 15] }] }, then: 'MIDDLE' },
                  { case: { $and: [{ $gte: ['$over', 16] }, { $lte: ['$over', 20] }] }, then: 'DEATH' }
                ],
                default: 'OTHER'
              }
            }
          }
        },
        {
          $group: {
            _id: '$phase',
            runsScored: { $sum: '$batsmanRuns' },
            ballsFaced: { $sum: 1 },
            fours: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 4] }, 1, 0] } },
            sixes: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 6] }, 1, 0] } },
            wicketsLost: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            strikeRate: { $multiply: [{ $divide: ['$runsScored', '$ballsFaced'] }, 100] },
            avg: { $cond: [{ $eq: ['$wicketsLost', 0] }, '$runsScored', { $divide: ['$runsScored', '$wicketsLost'] }] }
          }
        }
      ];

      const bowlingPipeline = [
        {
          $match: {
            ...matchFilter,
            bowlingTeam: team,
            bowler: player,
            over: { $gte: 1, $lte: 20 }
          }
        },
        {
          $addFields: {
            phase: {
              $switch: {
                branches: [
                  { case: { $and: [{ $gte: ['$over', 1] }, { $lte: ['$over', 6] }] }, then: 'POWERPLAY' },
                  { case: { $and: [{ $gte: ['$over', 7] }, { $lte: ['$over', 15] }] }, then: 'MIDDLE' },
                  { case: { $and: [{ $gte: ['$over', 16] }, { $lte: ['$over', 20] }] }, then: 'DEATH' }
                ],
                default: 'OTHER'
              }
            }
          }
        },
        {
          $group: {
            _id: '$phase',
            runsConceded: { $sum: '$totalRuns' },
            ballsBowled: { $sum: 1 },
            wicketsTaken: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            economy: { $multiply: [{ $divide: ['$runsConceded', '$ballsBowled'] }, 6] }
          }
        }
      ];

      const [battingStats, bowlingStats] = await Promise.all([
        Delivery.aggregate(battingPipeline),
        Delivery.aggregate(bowlingPipeline)
      ]);

      const formatPhaseStats = (stats) => {
        const phases = ['POWERPLAY', 'MIDDLE', 'DEATH'];
        return phases.map(phase => {
          const stat = stats.find(s => s._id === phase);
          return stat ? { phase, ...stat } : { phase, runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, wicketsLost: 0, strikeRate: 0, avg: 0 };
        });
      };

      const formatBowlingStats = (stats) => {
        const phases = ['POWERPLAY', 'MIDDLE', 'DEATH'];
        return phases.map(phase => {
          const stat = stats.find(s => s._id === phase);
          return stat ? { phase, ...stat } : { phase, runsConceded: 0, ballsBowled: 0, wicketsTaken: 0, economy: 0 };
        });
      };

      return res.json({
        team,
        player,
        season: season || 'all',
        batting: formatPhaseStats(battingStats),
        bowling: formatBowlingStats(bowlingStats)
      });
    }

    if (team) {
      // Team analysis - batting and bowling by phase
      const battingPipeline = [
        {
          $match: {
            ...matchFilter,
            battingTeam: team,
            over: { $gte: 1, $lte: 20 }
          }
        },
        {
          $addFields: {
            phase: {
              $switch: {
                branches: [
                  { case: { $and: [{ $gte: ['$over', 1] }, { $lte: ['$over', 6] }] }, then: 'POWERPLAY' },
                  { case: { $and: [{ $gte: ['$over', 7] }, { $lte: ['$over', 15] }] }, then: 'MIDDLE' },
                  { case: { $and: [{ $gte: ['$over', 16] }, { $lte: ['$over', 20] }] }, then: 'DEATH' }
                ],
                default: 'OTHER'
              }
            }
          }
        },
        {
          $group: {
            _id: '$phase',
            runsScored: { $sum: '$batsmanRuns' },
            ballsFaced: { $sum: 1 },
            fours: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 4] }, 1, 0] } },
            sixes: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 6] }, 1, 0] } },
            wicketsLost: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            strikeRate: { $multiply: [{ $divide: ['$runsScored', '$ballsFaced'] }, 100] },
            avg: { $cond: [{ $eq: ['$wicketsLost', 0] }, '$runsScored', { $divide: ['$runsScored', '$wicketsLost'] }] }
          }
        }
      ];

      const bowlingPipeline = [
        {
          $match: {
            ...matchFilter,
            bowlingTeam: team,
            over: { $gte: 1, $lte: 20 }
          }
        },
        {
          $addFields: {
            phase: {
              $switch: {
                branches: [
                  { case: { $and: [{ $gte: ['$over', 1] }, { $lte: ['$over', 6] }] }, then: 'POWERPLAY' },
                  { case: { $and: [{ $gte: ['$over', 7] }, { $lte: ['$over', 15] }] }, then: 'MIDDLE' },
                  { case: { $and: [{ $gte: ['$over', 16] }, { $lte: ['$over', 20] }] }, then: 'DEATH' }
                ],
                default: 'OTHER'
              }
            }
          }
        },
        {
          $group: {
            _id: '$phase',
            runsConceded: { $sum: '$totalRuns' },
            ballsBowled: { $sum: 1 },
            wicketsTaken: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            economy: { $multiply: [{ $divide: ['$runsConceded', '$ballsBowled'] }, 6] }
          }
        }
      ];

      const [battingStats, bowlingStats] = await Promise.all([
        Delivery.aggregate(battingPipeline),
        Delivery.aggregate(bowlingPipeline)
      ]);

      const formatPhaseStats = (stats) => {
        const phases = ['POWERPLAY', 'MIDDLE', 'DEATH'];
        return phases.map(phase => {
          const stat = stats.find(s => s._id === phase);
          return stat ? { phase, ...stat } : { phase, runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, wicketsLost: 0, strikeRate: 0, avg: 0 };
        });
      };

      const formatBowlingStats = (stats) => {
        const phases = ['POWERPLAY', 'MIDDLE', 'DEATH'];
        return phases.map(phase => {
          const stat = stats.find(s => s._id === phase);
          return stat ? { phase, ...stat } : { phase, runsConceded: 0, ballsBowled: 0, wicketsTaken: 0, economy: 0 };
        });
      };

      return res.json({
        team,
        season: season || 'all',
        batting: formatPhaseStats(battingStats),
        bowling: formatBowlingStats(bowlingStats)
      });
    }

    if (player) {
      // Player analysis - check if batting or bowling
      const battingPipeline = [
        {
          $match: {
            ...matchFilter,
            batsman: player,
            over: { $gte: 1, $lte: 20 }
          }
        },
        {
          $addFields: {
            phase: {
              $switch: {
                branches: [
                  { case: { $and: [{ $gte: ['$over', 1] }, { $lte: ['$over', 6] }] }, then: 'POWERPLAY' },
                  { case: { $and: [{ $gte: ['$over', 7] }, { $lte: ['$over', 15] }] }, then: 'MIDDLE' },
                  { case: { $and: [{ $gte: ['$over', 16] }, { $lte: ['$over', 20] }] }, then: 'DEATH' }
                ],
                default: 'OTHER'
              }
            }
          }
        },
        {
          $group: {
            _id: '$phase',
            runsScored: { $sum: '$batsmanRuns' },
            ballsFaced: { $sum: 1 },
            fours: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 4] }, 1, 0] } },
            sixes: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 6] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            strikeRate: { $multiply: [{ $divide: ['$runsScored', '$ballsFaced'] }, 100] }
          }
        }
      ];

      const bowlingPipeline = [
        {
          $match: {
            ...matchFilter,
            bowler: player,
            over: { $gte: 1, $lte: 20 }
          }
        },
        {
          $addFields: {
            phase: {
              $switch: {
                branches: [
                  { case: { $and: [{ $gte: ['$over', 1] }, { $lte: ['$over', 6] }] }, then: 'POWERPLAY' },
                  { case: { $and: [{ $gte: ['$over', 7] }, { $lte: ['$over', 15] }] }, then: 'MIDDLE' },
                  { case: { $and: [{ $gte: ['$over', 16] }, { $lte: ['$over', 20] }] }, then: 'DEATH' }
                ],
                default: 'OTHER'
              }
            }
          }
        },
        {
          $group: {
            _id: '$phase',
            runsConceded: { $sum: '$totalRuns' },
            ballsBowled: { $sum: 1 },
            wicketsTaken: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            economy: { $multiply: [{ $divide: ['$runsConceded', '$ballsBowled'] }, 6] }
          }
        }
      ];

      const [battingStats, bowlingStats] = await Promise.all([
        Delivery.aggregate(battingPipeline),
        Delivery.aggregate(bowlingPipeline)
      ]);

      return res.json({
        player,
        season: season || 'all',
        batting: battingStats.length > 0 ? battingStats : null,
        bowling: bowlingStats.length > 0 ? bowlingStats : null
      });
    }

    // League-wide phase analysis
    const leaguePipeline = [
      {
        $match: {
          ...matchFilter,
          over: { $gte: 1, $lte: 20 }
        }
      },
      {
        $addFields: {
          phase: {
            $switch: {
              branches: [
                { case: { $and: [{ $gte: ['$over', 1] }, { $lte: ['$over', 6] }] }, then: 'POWERPLAY' },
                { case: { $and: [{ $gte: ['$over', 7] }, { $lte: ['$over', 15] }] }, then: 'MIDDLE' },
                { case: { $and: [{ $gte: ['$over', 16] }, { $lte: ['$over', 20] }] }, then: 'DEATH' }
              ],
              default: 'OTHER'
            }
          }
        }
      },
      {
        $group: {
          _id: '$phase',
          totalRuns: { $sum: '$totalRuns' },
          totalBalls: { $sum: 1 },
          totalWickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } },
          boundaries: { $sum: { $cond: [{ $in: ['$batsmanRuns', [4, 6]] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          avgRunRate: { $multiply: [{ $divide: ['$totalRuns', '$totalBalls'] }, 6] },
          wicketRate: { $divide: ['$totalWickets', '$totalBalls'] }
        }
      }
    ];

    const leagueStats = await Delivery.aggregate(leaguePipeline);

    res.json({
      season: season || 'all',
      leagueStats
    });

  } catch (error) {
    console.error('Error in getPhaseAnalysis:', error);
    res.status(500).json({ error: 'Failed to fetch phase analysis' });
  }
};

// B) Venue Metrics
const getVenueMetrics = async (req, res) => {
  try {
    const { venue } = req.params;
    const { season } = req.query;

    if (!venue) {
      return res.status(400).json({ error: 'Venue parameter is required' });
    }

    let matchFilter = { venue };
    if (season) {
      matchFilter.season = parseInt(season);
    }

    // Get matches at this venue
    const matches = await Match.find(matchFilter).lean();
    
    if (matches.length === 0) {
      return res.status(404).json({ error: 'No matches found for this venue' });
    }

    const matchIds = matches.map(m => m.matchId);

    // Calculate innings scores
    const inningsScores = await Delivery.aggregate([
      { $match: { matchId: { $in: matchIds } } },
      {
        $group: {
          _id: { matchId: '$matchId', inning: '$inning' },
          totalRuns: { $sum: '$totalRuns' }
        }
      },
      {
        $group: {
          _id: '$_id.inning',
          avgScore: { $avg: '$totalRuns' },
          count: { $sum: 1 }
        }
      }
    ]);

    const firstInnings = inningsScores.find(i => i._id === 1);
    const secondInnings = inningsScores.find(i => i._id === 2);

    // Win percentages
    const totalMatches = matches.length;
    const batFirstWins = matches.filter(m => {
      // Assuming team1 bats first, check if team1 won
      return m.winner === m.team1;
    }).length;

    // Toss decisions
    const tossDecisions = matches.reduce((acc, match) => {
      if (match.tossDecision === 'bat') acc.bat++;
      else if (match.tossDecision === 'field') acc.field++;
      return acc;
    }, { bat: 0, field: 0 });

    // Top teams by wins at venue
    const teamWins = matches.reduce((acc, match) => {
      if (match.winner) {
        acc[match.winner] = (acc[match.winner] || 0) + 1;
      }
      return acc;
    }, {});

    const topTeams = Object.entries(teamWins)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([team, wins]) => ({ team, wins }));

    // Top batsmen at venue
    const topBatsmen = await Delivery.aggregate([
      { $match: { matchId: { $in: matchIds } } },
      {
        $group: {
          _id: '$batsman',
          runs: { $sum: '$batsmanRuns' }
        }
      },
      { $sort: { runs: -1 } },
      { $limit: 5 },
      {
        $project: {
          player: '$_id',
          runs: 1,
          _id: 0
        }
      }
    ]);

    // Top bowlers at venue (by wickets, then economy)
    const topBowlers = await Delivery.aggregate([
      { $match: { matchId: { $in: matchIds } } },
      {
        $group: {
          _id: '$bowler',
          wickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } },
          runs: { $sum: '$totalRuns' },
          balls: { $sum: 1 }
        }
      },
      {
        $addFields: {
          economy: {
            $cond: [
              { $gt: ['$balls', 0] },
              { $multiply: [{ $divide: ['$runs', '$balls'] }, 6] },
              0
            ]
          }
        }
      },
      { $sort: { wickets: -1, economy: 1 } },
      { $limit: 5 },
      {
        $project: {
          player: '$_id',
          wickets: 1,
          runs: 1,
          economy: { $round: ['$economy', 2] },
          _id: 0
        }
      }
    ]);

    res.json({
      venue,
      season: season || 'all',
      avgFirstInnings: firstInnings ? Math.round(firstInnings.avgScore * 10) / 10 : 0,
      avgSecondInnings: secondInnings ? Math.round(secondInnings.avgScore * 10) / 10 : 0,
      winPctBatFirst: Math.round((batFirstWins / totalMatches) * 100) / 100,
      winPctChase: Math.round(((totalMatches - batFirstWins) / totalMatches) * 100) / 100,
      tossDecisionCounts: tossDecisions,
      topTeams,
      topBatsmen,
      topBowlers
    });

  } catch (error) {
    console.error('Error in getVenueMetrics:', error);
    res.status(500).json({ error: 'Failed to fetch venue metrics' });
  }
};

// C) Impact Index
const getImpactIndex = async (req, res) => {
  try {
    const { player, team, season, limit = 50 } = req.query;

    let matchFilter = {};
    if (season) {
      const seasonMatches = await Match.find({ season: parseInt(season) }).select('matchId').lean();
      const matchIds = seasonMatches.map(m => m.matchId);
      matchFilter.matchId = { $in: matchIds };
    }

    if (player) {
      // Individual player impact analysis
      const battingStats = await Delivery.aggregate([
        { $match: { ...matchFilter, batsman: player } },
        {
          $group: {
            _id: null,
            totalRuns: { $sum: '$batsmanRuns' },
            totalBalls: { $sum: 1 },
            fours: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 4] }, 1, 0] } },
            sixes: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 6] }, 1, 0] } },
            deathRuns: { 
              $sum: { 
                $cond: [
                  { $and: [{ $gte: ['$over', 16] }, { $lte: ['$over', 20] }] }, 
                  '$batsmanRuns', 
                  0
                ] 
              } 
            }
          }
        }
      ]);

      const bowlingStats = await Delivery.aggregate([
        { $match: { ...matchFilter, bowler: player } },
        {
          $group: {
            _id: null,
            wickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } },
            runsConceded: { $sum: '$totalRuns' },
            ballsBowled: { $sum: 1 },
            deathWickets: {
              $sum: {
                $cond: [
                  { 
                    $and: [
                      { $gte: ['$over', 16] }, 
                      { $lte: ['$over', 20] },
                      { $ne: ['$player_dismissed', null] }
                    ] 
                  }, 
                  1, 
                  0
                ]
              }
            }
          }
        }
      ]);

      let impact = 0;
      let components = {};

      if (battingStats.length > 0) {
        const bat = battingStats[0];
        const strikeRate = bat.totalBalls > 0 ? (bat.totalRuns / bat.totalBalls) * 100 : 0;
        
        // Batting impact calculation
        const base = bat.totalRuns;
        const srBonus = bat.totalRuns * (strikeRate / 100) * 0.2;
        const boundariesBonus = bat.fours * 2 + bat.sixes * 3;
        const clutchBonus = bat.deathRuns * 1.5;
        
        const battingImpact = base + srBonus + boundariesBonus + clutchBonus;
        impact += battingImpact;
        
        components.batting = {
          base,
          srBonus: Math.round(srBonus * 10) / 10,
          boundariesBonus,
          clutchBonus: Math.round(clutchBonus * 10) / 10,
          total: Math.round(battingImpact * 10) / 10
        };
      }

      if (bowlingStats.length > 0) {
        const bowl = bowlingStats[0];
        const economy = bowl.ballsBowled > 0 ? (bowl.runsConceded / bowl.ballsBowled) * 6 : 0;
        const leagueAvgEconomy = 8.0; // Approximate IPL average
        
        // Bowling impact calculation
        const baseWickets = bowl.wickets * 20;
        const economyBonus = (leagueAvgEconomy - economy) * 10;
        const deathWicketsBonus = bowl.deathWickets * 10;
        
        const bowlingImpact = baseWickets + economyBonus + deathWicketsBonus;
        impact += bowlingImpact;
        
        components.bowling = {
          baseWickets,
          economyBonus: Math.round(economyBonus * 10) / 10,
          deathWicketsBonus: deathWicketsBonus,
          total: Math.round(bowlingImpact * 10) / 10
        };
      }

      return res.json({
        player,
        season: season || 'all',
        impact: Math.round(impact * 10) / 10,
        components
      });
    }

    if (team) {
      // Team impact analysis - top players for the team
      const teamPlayers = await Delivery.aggregate([
        { 
          $match: { 
            ...matchFilter,
            $or: [
              { battingTeam: team },
              { bowlingTeam: team }
            ]
          } 
        },
        {
          $group: {
            _id: {
              player: {
                $cond: [
                  { $eq: ['$battingTeam', team] },
                  '$batsman',
                  '$bowler'
                ]
              },
              role: {
                $cond: [
                  { $eq: ['$battingTeam', team] },
                  'batsman',
                  'bowler'
                ]
              }
            },
            totalRuns: { 
              $sum: { 
                $cond: [{ $eq: ['$battingTeam', team] }, '$batsmanRuns', 0] 
              } 
            },
            totalBalls: { $sum: 1 },
            wickets: { 
              $sum: { 
                $cond: [
                  { $and: [{ $eq: ['$bowlingTeam', team] }, { $ne: ['$player_dismissed', null] }] }, 
                  1, 
                  0
                ] 
              } 
            },
            runsConceded: { 
              $sum: { 
                $cond: [{ $eq: ['$bowlingTeam', team] }, '$totalRuns', 0] 
              } 
            }
          }
        },
        {
          $addFields: {
            impact: {
              $add: [
                '$totalRuns',
                { $multiply: ['$wickets', 20] }
              ]
            }
          }
        },
        { $sort: { impact: -1 } },
        { $limit: parseInt(limit) }
      ]);

      return res.json({
        team,
        season: season || 'all',
        players: teamPlayers.map(p => ({
          player: p._id.player,
          role: p._id.role,
          impact: Math.round(p.impact * 10) / 10,
          runs: p.totalRuns,
          wickets: p.wickets
        }))
      });
    }

    // League-wide top players by impact
    const topPlayers = await Delivery.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$batsman',
          totalRuns: { $sum: '$batsmanRuns' },
          totalBalls: { $sum: 1 },
          fours: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 4] }, 1, 0] } },
          sixes: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 6] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          strikeRate: { $multiply: [{ $divide: ['$totalRuns', '$totalBalls'] }, 100] },
          impact: {
            $add: [
              '$totalRuns',
              { $multiply: ['$fours', 2] },
              { $multiply: ['$sixes', 3] }
            ]
          }
        }
      },
      { $sort: { impact: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          player: '$_id',
          impact: { $round: ['$impact', 1] },
          runs: '$totalRuns',
          strikeRate: { $round: ['$strikeRate', 2] },
          _id: 0
        }
      }
    ]);

    res.json({
      season: season || 'all',
      players: topPlayers,
      meta: { limit: parseInt(limit) }
    });

  } catch (error) {
    console.error('Error in getImpactIndex:', error);
    res.status(500).json({ error: 'Failed to calculate impact index' });
  }
};

// D) Rival Battle
const getRivalBattle = async (req, res) => {
  try {
    const { batsman, bowler, matchFilter } = req.query;

    if (!batsman || !bowler) {
      return res.status(400).json({ error: 'Both batsman and bowler parameters are required' });
    }

    let additionalFilter = {};
    if (matchFilter) {
      // Parse matchFilter - could be season or team
      if (!isNaN(matchFilter)) {
        // Assume it's a season
        const seasonMatches = await Match.find({ season: parseInt(matchFilter) }).select('matchId').lean();
        const matchIds = seasonMatches.map(m => m.matchId);
        additionalFilter.matchId = { $in: matchIds };
      }
    }

    const battleStats = await Delivery.aggregate([
      {
        $match: {
          batsman,
          bowler,
          ...additionalFilter
        }
      },
      {
        $group: {
          _id: null,
          ballsFaced: { $sum: 1 },
          runsScored: { $sum: '$batsmanRuns' },
          timesDismissed: { $sum: { $cond: [{ $eq: ['$player_dismissed', batsman] }, 1, 0] } },
          fours: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 4] }, 1, 0] } },
          sixes: { $sum: { $cond: [{ $eq: ['$batsmanRuns', 6] }, 1, 0] } },
          dismissals: {
            $push: {
              $cond: [
                { $eq: ['$player_dismissed', batsman] },
                '$dismissal_kind',
                null
              ]
            }
          }
        }
      }
    ]);

    if (battleStats.length === 0) {
      return res.status(404).json({ error: 'No encounters found between these players' });
    }

    const stats = battleStats[0];
    const dismissalsBreakdown = stats.dismissals
      .filter(d => d !== null)
      .reduce((acc, dismissal) => {
        acc[dismissal] = (acc[dismissal] || 0) + 1;
        return acc;
      }, {});

    // Get sample timeline (first few deliveries)
    const sampleDeliveries = await Delivery.find({
      batsman,
      bowler,
      ...additionalFilter
    })
    .select('over ball batsmanRuns totalRuns player_dismissed')
    .sort({ matchId: 1, inning: 1, over: 1, ball: 1 })
    .limit(10)
    .lean();

    res.json({
      batsman,
      bowler,
      balls: stats.ballsFaced,
      runs: stats.runsScored,
      dismissals: stats.timesDismissed,
      sr: stats.ballsFaced > 0 ? Math.round((stats.runsScored / stats.ballsFaced) * 100 * 100) / 100 : 0,
      fours: stats.fours,
      sixes: stats.sixes,
      dismissalsBreakdown,
      sampleTimeline: sampleDeliveries.map(d => ({
        over: d.over,
        ball: d.ball,
        runs: d.batsmanRuns,
        wicket: d.player_dismissed === batsman
      }))
    });

  } catch (error) {
    console.error('Error in getRivalBattle:', error);
    res.status(500).json({ error: 'Failed to fetch rival battle stats' });
  }
};

// E) Match Over Stats
const getMatchOverStats = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { inning } = req.query;

    if (!matchId || isNaN(matchId)) {
      return res.status(400).json({ error: 'Valid numeric matchId is required' });
    }

    let matchFilter = { matchId: parseInt(matchId) };
    if (inning) {
      matchFilter.inning = parseInt(inning);
    }

    const overStats = await Delivery.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { inning: '$inning', over: '$over' },
          runsInOver: { $sum: '$totalRuns' },
          extrasInOver: { $sum: '$extraRuns' },
          wicketsInOver: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } }
        }
      },
      { $sort: { '_id.inning': 1, '_id.over': 1 } }
    ]);

    if (overStats.length === 0) {
      return res.status(404).json({ error: 'No delivery data found for this match' });
    }

    // Group by innings and calculate cumulative
    const inningsData = {};
    
    overStats.forEach(stat => {
      const inningNum = stat._id.inning;
      if (!inningsData[inningNum]) {
        inningsData[inningNum] = [];
      }
      inningsData[inningNum].push({
        over: stat._id.over,
        runsInOver: stat.runsInOver,
        extrasInOver: stat.extrasInOver,
        wicketsInOver: stat.wicketsInOver
      });
    });

    // Calculate cumulative runs for each innings
    Object.keys(inningsData).forEach(inningNum => {
      let cumulative = 0;
      inningsData[inningNum].forEach(over => {
        cumulative += over.runsInOver;
        over.cumulative = cumulative;
      });
    });

    const innings = Object.keys(inningsData).map(inningNum => ({
      inning: parseInt(inningNum),
      overs: inningsData[inningNum]
    }));

    res.json({
      matchId: parseInt(matchId),
      innings
    });

  } catch (error) {
    console.error('Error in getMatchOverStats:', error);
    res.status(500).json({ error: 'Failed to fetch match over stats' });
  }
};

module.exports = {
  getPhaseAnalysis,
  getVenueMetrics,
  getImpactIndex,
  getRivalBattle,
  getMatchOverStats
};
