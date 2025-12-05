const Match = require('../models/Match');
const Delivery = require('../models/Delivery');
const Player = require('../models/Player');

// GET /api/analytics/players/:playerId
const getPlayerStats = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season } = req.query;
    
    // Get player info
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Optional season filter via numeric matchId (shared with Delivery.matchId)
    let matchFilter = {};
    if (season) {
      const seasonMatches = await Match.find({ season: parseInt(season) }).select('matchId');
      const matchIds = seasonMatches
        .map(m => m.matchId)
        .filter(id => id !== undefined && id !== null);
      if (matchIds.length > 0) {
        matchFilter.matchId = { $in: matchIds };
      } else {
        // If no matches for this season, short-circuit to avoid scanning all deliveries
        return res.json({ data: {
          playerName: player.name,
          totalRuns: 0,
          totalBalls: 0,
          fours: 0,
          sixes: 0,
          bestVenue: null,
          seasonPerformance: [],
          venuePerformance: [],
          bowlingSummary: null,
          fieldingSummary: null
        }});
      }
    }

    // Aggregate batting stats from deliveries
    const battingStats = await Delivery.aggregate([
      { $match: { ...matchFilter, batsman: player.name } },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: '$batsman_runs' },
          totalBalls: { $sum: 1 },
          fours: { $sum: { $cond: [{ $eq: ['$batsman_runs', 4] }, 1, 0] } },
          sixes: { $sum: { $cond: [{ $eq: ['$batsman_runs', 6] }, 1, 0] } }
        }
      }
    ]);

    // Aggregate bowling stats for this player (if they bowl)
    const bowlingStatsAgg = await Delivery.aggregate([
      { $match: { ...matchFilter, bowler: player.name } },
      {
        $group: {
          _id: null,
          totalWickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } },
          totalRuns: { $sum: '$total_runs' },
          totalBalls: { $sum: 1 }
        }
      }
    ]);

    // Best bowling figures for this player
    const bestFiguresAgg = await Delivery.aggregate([
      { $match: { bowler: player.name, player_dismissed: { $ne: null } } },
      {
        $group: {
          _id: '$match_id',
          wickets: { $sum: 1 },
          runs: { $sum: '$total_runs' }
        }
      },
      { $sort: { wickets: -1, runs: 1 } },
      { $limit: 1 }
    ]);

    const bowlingBase = bowlingStatsAgg[0] || { totalWickets: 0, totalRuns: 0, totalBalls: 0 };
    const bowlingOvers = bowlingBase.totalBalls / 6;
    const bowlingEconomy = bowlingBase.totalBalls > 0
      ? ((bowlingBase.totalRuns / bowlingBase.totalBalls) * 6).toFixed(2)
      : '0.00';
    const bowlingBestFigures = bestFiguresAgg[0]
      ? `${bestFiguresAgg[0].wickets}/${bestFiguresAgg[0].runs}`
      : '0/0';

    const bowlingSummary = bowlingBase.totalBalls > 0 ? {
      totalWickets: bowlingBase.totalWickets,
      totalOvers: bowlingOvers.toFixed(1),
      economy: bowlingEconomy,
      bestFigures: bowlingBestFigures
    } : null;

    // Get venue performance
    const venuePerformance = await Delivery.aggregate([
      { $match: { ...matchFilter, batsman: player.name } },
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: '_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      {
        $group: {
          _id: '$match.venue',
          runs: { $sum: '$batsman_runs' }
        }
      },
      { $sort: { runs: -1 } },
      {
        $project: {
          venue: '$_id',
          runs: 1,
          _id: 0
        }
      }
    ]);

    // Get season performance (batting)
    const seasonPerformance = await Delivery.aggregate([
      { $match: { ...matchFilter, batsman: player.name } },
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: '_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      {
        $group: {
          _id: '$match.season',
          runs: { $sum: '$batsman_runs' },
          balls: { $sum: 1 }
        }
      },
      {
        $project: {
          season: '$_id',
          runs: 1,
          strikeRate: { 
            $cond: [
              { $gt: ['$balls', 0] },
              { $multiply: [{ $divide: ['$runs', '$balls'] }, 100] },
              0
            ]
          },
          _id: 0
        }
      },
      { $sort: { season: 1 } }
    ]);

    // Fielding summary for this player
    const fieldingAgg = await Delivery.aggregate([
      {
        $match: {
          ...matchFilter,
          fielder: player.name,
          player_dismissed: { $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          catches: {
            $sum: {
              $cond: [
                { $regexMatch: { input: '$dismissal_kind', regex: /^caught/i } },
                1,
                0
              ]
            }
          },
          runOuts: {
            $sum: {
              $cond: [
                { $regexMatch: { input: '$dismissal_kind', regex: /run out/i } },
                1,
                0
              ]
            }
          },
          totalDismissals: { $sum: 1 }
        }
      }
    ]);

    const fieldingBase = fieldingAgg[0] || null;
    const fieldingSummary = fieldingBase ? {
      catches: fieldingBase.catches,
      runOuts: fieldingBase.runOuts,
      totalDismissals: fieldingBase.totalDismissals
    } : null;

    const stats = battingStats[0] || { totalRuns: 0, totalBalls: 0, fours: 0, sixes: 0 };
    const bestVenue = venuePerformance[0]?.venue || null;

    const data = {
      playerName: player.name,
      totalRuns: stats.totalRuns,
      totalBalls: stats.totalBalls,
      fours: stats.fours,
      sixes: stats.sixes,
      bestVenue,
      seasonPerformance,
      venuePerformance,
      bowlingSummary,
      fieldingSummary
    };

    res.json({ data });
  } catch (error) {
    console.error('getPlayerStats error:', error);
    res.status(500).json({ message: 'Failed to fetch player statistics' });
  }
};

// GET /api/analytics/bowlers/:playerId
const getBowlerStats = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season } = req.query;
    
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Optional season filter via numeric matchId (shared with Delivery.matchId)
    let matchFilter = {};
    if (season) {
      const seasonMatches = await Match.find({ season: parseInt(season) }).select('matchId');
      const matchIds = seasonMatches
        .map(m => m.matchId)
        .filter(id => id !== undefined && id !== null);

      if (matchIds.length > 0) {
        matchFilter.matchId = { $in: matchIds };
      } else {
        return res.json({ data: {
          bowlerName: player.name,
          totalWickets: 0,
          totalOvers: '0.0',
          totalRuns: 0,
          bestFigures: '0/0',
          dotBalls: 0,
          totalBalls: 0,
          deathOversEconomy: '0.00',
          wicketsVsTeams: [],
          economyByOvers: [],
          venueEconomy: []
        }});
      }
    }

    // Aggregate bowling stats
    const bowlingStats = await Delivery.aggregate([
      { $match: { ...matchFilter, bowler: player.name } },
      {
        $group: {
          _id: null,
          totalWickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } },
          totalRuns: { $sum: '$total_runs' },
          totalBalls: { $sum: 1 },
          dotBalls: { $sum: { $cond: [{ $eq: ['$total_runs', 0] }, 1, 0] } }
        }
      }
    ]);

    // Economy by overs phases
    const economyByOvers = await Delivery.aggregate([
      { $match: { ...matchFilter, bowler: player.name } },
      {
        $addFields: {
          phase: {
            $switch: {
              branches: [
                { case: { $lte: ['$over', 6] }, then: '1-6' },
                { case: { $lte: ['$over', 15] }, then: '7-15' },
                { case: { $lte: ['$over', 20] }, then: '16-20' }
              ],
              default: 'Other'
            }
          }
        }
      },
      {
        $group: {
          _id: '$phase',
          runs: { $sum: '$total_runs' },
          balls: { $sum: 1 }
        }
      },
      {
        $project: {
          phase: '$_id',
          economy: { 
            $cond: [
              { $gt: ['$balls', 0] },
              { $round: [{ $multiply: [{ $divide: ['$runs', '$balls'] }, 6] }, 2] },
              0
            ]
          },
          _id: 0
        }
      }
    ]);

    // Wickets vs teams
    const wicketsVsTeams = await Delivery.aggregate([
      { 
        $match: { 
          ...matchFilter,
          bowler: player.name,
          player_dismissed: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$batting_team',
          wickets: { $sum: 1 }
        }
      },
      {
        $project: {
          team: '$_id',
          wickets: 1,
          _id: 0
        }
      },
      { $sort: { wickets: -1 } }
    ]);

    // Venue economy
    const venueEconomy = await Delivery.aggregate([
      { $match: { ...matchFilter, bowler: player.name } },
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: '_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      {
        $group: {
          _id: '$match.venue',
          runs: { $sum: '$total_runs' },
          balls: { $sum: 1 }
        }
      },
      {
        $project: {
          venue: '$_id',
          economy: { 
            $cond: [
              { $gt: ['$balls', 0] },
              { $round: [{ $multiply: [{ $divide: ['$runs', '$balls'] }, 6] }, 2] },
              0
            ]
          },
          _id: 0
        }
      },
      { $sort: { economy: 1 } }
    ]);

    // Calculate best bowling figures (most wickets in a match)
    const bestFiguresData = await Delivery.aggregate([
      { $match: { ...matchFilter, bowler: player.name, player_dismissed: { $ne: null } } },
      {
        $group: {
          _id: '$match_id',
          wickets: { $sum: 1 },
          runs: { $sum: '$total_runs' }
        }
      },
      { $sort: { wickets: -1, runs: 1 } },
      { $limit: 1 }
    ]);

    // Calculate death overs economy (overs 16-20)
    const deathOversStats = await Delivery.aggregate([
      { 
        $match: { 
          ...matchFilter,
          bowler: player.name,
          over: { $gte: 16, $lte: 20 }
        }
      },
      {
        $group: {
          _id: null,
          runs: { $sum: '$total_runs' },
          balls: { $sum: 1 }
        }
      }
    ]);

    const stats = bowlingStats[0] || { totalWickets: 0, totalRuns: 0, totalBalls: 0, dotBalls: 0 };
    const totalOvers = stats.totalBalls / 6;
    const bestFigures = bestFiguresData[0] ? `${bestFiguresData[0].wickets}/${bestFiguresData[0].runs}` : '0/0';
    const deathOversEconomy = deathOversStats[0] && deathOversStats[0].balls > 0 
      ? ((deathOversStats[0].runs / deathOversStats[0].balls) * 6).toFixed(2)
      : '0.00';

    const data = {
      bowlerName: player.name,
      totalWickets: stats.totalWickets,
      totalOvers: totalOvers.toFixed(1),
      totalRuns: stats.totalRuns,
      bestFigures,
      dotBalls: stats.dotBalls,
      totalBalls: stats.totalBalls,
      deathOversEconomy,
      wicketsVsTeams,
      economyByOvers,
      venueEconomy
    };

    res.json({ data });
  } catch (error) {
    console.error('getBowlerStats error:', error);
    res.status(500).json({ message: 'Failed to fetch bowler statistics' });
  }
};

// Helper to normalize venue names so small variations map to the same key
// Examples unified:
//  - "M. A. Chidambaram Stadium" 
//  - "MA Chidambaram Stadium, Chepauk"
//  -> "ma chidambaram"
const normalizeVenueKey = (name) => {
  if (!name) return '';

  // Take only the part before the first comma (drop locality suffixes)
  let base = name.split(',')[0];

  // Remove dots and extra punctuation, keep letters, numbers and spaces
  base = base.replace(/[.]/g, ' ');

  // Remove common generic words that don't help distinguish venues
  const genericWords = [
    'stadium',
    'cricket',
    'ground',
    'international',
    'arena',
    'park'
  ];

  // Normalize spacing and case
  base = base.trim().replace(/\s+/g, ' ').toLowerCase();

  const parts = base.split(' ').filter((word) => word && !genericWords.includes(word));

  // Remove all spaces between remaining parts so "m a chidambaram" and "ma chidambaram"
  // both become "machidambaram"
  return parts.join('');
};

// GET /api/analytics/venues (list all venues)
const getAllVenues = async (req, res) => {
  try {
    const rawVenues = await Match.distinct('venue');
    const venueMap = {};

    rawVenues.forEach((v) => {
      if (!v || !v.trim()) return;
      const key = normalizeVenueKey(v);
      if (!venueMap[key]) {
        venueMap[key] = v.trim();
      }
    });

    const venues = Object.values(venueMap);
    res.json({ data: venues });
  } catch (error) {
    console.error('getAllVenues error:', error);
    res.status(500).json({ message: 'Failed to fetch venues' });
  }
};

// GET /api/analytics/venues/:venue
const getVenueStats = async (req, res) => {
  try {
    const { venue } = req.params;
    const decodedVenue = decodeURIComponent(venue);

    // Find all venue name variants that normalize to the same key
    const normKey = normalizeVenueKey(decodedVenue);
    const allVenueNames = await Match.distinct('venue');
    const matchingVenueNames = allVenueNames.filter((v) => normalizeVenueKey(v) === normKey);

    if (matchingVenueNames.length === 0) {
      return res.status(404).json({ message: 'Venue not found or no matches played' });
    }

    // Get basic venue stats across all matching venue name variants
    const venueMatches = await Match.find({ venue: { $in: matchingVenueNames } });
    const totalMatches = venueMatches.length;
    
    if (totalMatches === 0) {
      return res.status(404).json({ message: 'Venue not found or no matches played' });
    }

    // Calculate batting first vs chasing win counts
    const battingFirstWins = venueMatches.filter(match => 
      match.tossWinner === match.winner && match.tossDecision === 'bat'
    ).length;
    
    const chasingWins = venueMatches.filter(match => 
      (match.tossWinner !== match.winner && match.tossDecision === 'bat') ||
      (match.tossWinner === match.winner && match.tossDecision === 'field')
    ).length;

    // Get average first innings score from deliveries
    const firstInningsScores = await Delivery.aggregate([
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { $match: { 'match.venue': { $in: matchingVenueNames }, inning: 1 } },
      {
        $group: {
          _id: '$match_id',
          totalRuns: { $sum: '$total_runs' }
        }
      },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$totalRuns' }
        }
      }
    ]);

    // Toss decision impact
    const tossDecisions = venueMatches.reduce((acc, match) => {
      if (match.tossDecision === 'bat') acc.bat++;
      else if (match.tossDecision === 'field') acc.field++;
      return acc;
    }, { bat: 0, field: 0 });

    const tossTotal = tossDecisions.bat + tossDecisions.field;
    const tossDecisionImpact = tossTotal > 0 ? [
      { name: 'Bat', value: Math.round((tossDecisions.bat / tossTotal) * 100) },
      { name: 'Field', value: Math.round((tossDecisions.field / tossTotal) * 100) }
    ] : [];

    // Best teams at venue
    const teamStats = {};
    venueMatches.forEach(match => {
      [match.team1, match.team2].forEach(team => {
        if (!teamStats[team]) {
          teamStats[team] = { matches: 0, wins: 0 };
        }
        teamStats[team].matches++;
        if (match.winner === team) {
          teamStats[team].wins++;
        }
      });
    });

    const bestTeamsAtVenue = Object.entries(teamStats)
      .map(([team, stats]) => ({
        team,
        matches: stats.matches,
        winPercentage: Math.round((stats.wins / stats.matches) * 100)
      }))
      .sort((a, b) => b.winPercentage - a.winPercentage)
      .slice(0, 8);

    // Calculate real toss win match win percentage
    const tossWinners = venueMatches.filter(match => match.tossWinner && match.winner);
    const tossWinMatchWins = tossWinners.filter(match => match.tossWinner === match.winner).length;
    const tossWinMatchWinPercentage = tossWinners.length > 0 
      ? Math.round((tossWinMatchWins / tossWinners.length) * 100)
      : 50;

    // Calculate highest score at venue from deliveries
    const highestScoreData = await Delivery.aggregate([
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { $match: { 'match.venue': { $in: matchingVenueNames } } },
      {
        $group: {
          _id: { match_id: '$match_id', inning: '$inning' },
          totalRuns: { $sum: '$total_runs' }
        }
      },
      { $sort: { totalRuns: -1 } },
      { $limit: 1 }
    ]);

    const highestScore = highestScoreData[0]?.totalRuns || 0;

    // Convert win counts to percentages that sum to 100 when matches exist
    let battingFirstWinPercentage = 0;
    let chasingWinPercentage = 0;
    if (totalMatches > 0) {
      battingFirstWinPercentage = Math.round((battingFirstWins / totalMatches) * 100);
      chasingWinPercentage = 100 - battingFirstWinPercentage;
    }

    const data = {
      venueName: decodedVenue,
      totalMatches,
      avgFirstInningsScore: Math.round(firstInningsScores[0]?.avgScore || 0),
      battingFirstWinPercentage,
      chasingWinPercentage,
      tossWinMatchWinPercentage,
      highestScore,
      tossDecisionImpact,
      bestTeamsAtVenue
    };

    res.json({ data });
  } catch (error) {
    console.error('getVenueStats error:', error);
    res.status(500).json({ message: 'Failed to fetch venue statistics' });
  }
};

// GET /api/analytics/umpires (list all umpires)
const getAllUmpires = async (req, res) => {
  try {
    // Get unique umpires from matches
    const umpires = await Match.aggregate([
      {
        $project: {
          umpires: ['$umpire1', '$umpire2', '$umpire3']
        }
      },
      { $unwind: '$umpires' },
      { $match: { umpires: { $ne: null, $ne: '', $exists: true } } },
      {
        $group: {
          _id: '$umpires',
          name: { $first: '$umpires' }
        }
      },
      {
        $project: {
          name: 1
        }
      }
    ]);

    res.json({ data: umpires });
  } catch (error) {
    console.error('getAllUmpires error:', error);
    res.status(500).json({ message: 'Failed to fetch umpires' });
  }
};

const getUmpireStats = async (req, res) => {
  try {
    const { umpireId } = req.params;
    
    if (!umpireId) {
      return res.status(400).json({ message: 'Umpire ID is required' });
    }

    // Decode URL-encoded umpire name
    const decodedUmpireId = decodeURIComponent(umpireId);

    // Find matches where this umpire officiated
    const umpireMatches = await Match.find({
      $or: [
        { umpire1: decodedUmpireId },
        { umpire2: decodedUmpireId },
        { umpire3: decodedUmpireId }
      ]
    });

    if (umpireMatches.length === 0) {
      return res.status(404).json({ message: 'Umpire not found or no matches officiated' });
    }

    // Calculate statistics
    const venueFreq = {};
    const teamFreq = {};
    const seasonFreq = {};

    umpireMatches.forEach(match => {
      if (match.venue) {
        venueFreq[match.venue] = (venueFreq[match.venue] || 0) + 1;
      }
      
      if (match.team1) {
        teamFreq[match.team1] = (teamFreq[match.team1] || 0) + 1;
      }
      if (match.team2) {
        teamFreq[match.team2] = (teamFreq[match.team2] || 0) + 1;
      }
      
      if (match.season) {
        seasonFreq[match.season] = (seasonFreq[match.season] || 0) + 1;
      }
    });

    const venueFrequency = Object.entries(venueFreq)
      .map(([venue, matches]) => ({ venue, matches }))
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 10);

    const teamEncounters = Object.entries(teamFreq)
      .map(([team, matches]) => ({ team, matches }))
      .sort((a, b) => b.matches - a.matches);

    const seasonActivity = Object.entries(seasonFreq)
      .map(([season, matches]) => ({ season: parseInt(season), matches }))
      .sort((a, b) => a.season - b.season);

    // Detect finals/playoffs from match data
    const finalsKeywords = ['final', 'qualifier', 'eliminator', 'playoff'];
    const finalsOfficiated = umpireMatches.filter(match => {
      if (!match.result) return false;
      const result = match.result.toLowerCase();
      return finalsKeywords.some(keyword => result.includes(keyword));
    }).length;

    // Calculate career span
    const seasons = umpireMatches.map(m => m.season).filter(s => s);
    const careerSpan = seasons.length > 0 
      ? `${Math.min(...seasons)}-${Math.max(...seasons)}`
      : 'N/A';

    const data = {
      umpireName: decodedUmpireId,
      totalMatches: umpireMatches.length,
      finalsOfficiated,
      seasonsActive: Object.keys(seasonFreq).length,
      mostFrequentVenue: venueFrequency[0]?.venue || 'N/A',
      teamsEncountered: Object.keys(teamFreq).length,
      careerSpan,
      venueFrequency,
      teamEncounters,
      seasonActivity
    };

    res.json({ data });
  } catch (error) {
    console.error('getUmpireStats error:', error);
    res.status(500).json({ message: 'Failed to fetch umpire statistics' });
  }
};

// GET /api/analytics/partnerships?team=TEAM_NAME
const getPartnerships = async (req, res) => {
  try {
    const { team } = req.query;
    
    if (!team) {
      return res.status(400).json({ message: 'Team parameter is required' });
    }

    // Simplified partnership calculation - group by batsman pairs per match/inning
    const partnerships = await Delivery.aggregate([
      { $match: { batting_team: team } },
      {
        $group: {
          _id: {
            match_id: '$match_id',
            inning: '$inning',
            player1: { $min: ['$batsman', '$non_striker'] },
            player2: { $max: ['$batsman', '$non_striker'] }
          },
          runs: { $sum: '$batsman_runs' },
          balls: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            player1: '$_id.player1',
            player2: '$_id.player2'
          },
          totalRuns: { $sum: '$runs' },
          totalBalls: { $sum: '$balls' },
          partnerships: { $sum: 1 },
          highestPartnership: { $max: '$runs' }
        }
      },
      {
        $project: {
          player1: '$_id.player1',
          player2: '$_id.player2',
          totalRuns: 1,
          totalBalls: 1,
          partnerships: 1,
          averagePartnership: { $divide: ['$totalRuns', '$partnerships'] },
          strikeRate: { 
            $cond: [
              { $gt: ['$totalBalls', 0] },
              { $multiply: [{ $divide: ['$totalRuns', '$totalBalls'] }, 100] },
              0
            ]
          },
          highestPartnership: 1,
          _id: 0
        }
      },
      { $sort: { totalRuns: -1 } },
      { $limit: 30 }
    ]);

    // Calculate summary statistics
    const totalPartnerships = partnerships.reduce((sum, p) => sum + p.partnerships, 0);
    const totalRuns = partnerships.reduce((sum, p) => sum + p.totalRuns, 0);
    const averagePartnership = totalPartnerships > 0 ? Math.round(totalRuns / totalPartnerships) : 0;
    const centuryPartnerships = partnerships.filter(p => p.highestPartnership >= 100).length;
    const highestPartnership = partnerships.length > 0 
      ? Math.max(...partnerships.map(p => p.highestPartnership))
      : 0;

    // Format partnerships for display
    const topPartnerships = partnerships.slice(0, 15).map(p => ({
      player1: p.player1,
      player2: p.player2,
      runs: p.totalRuns,
      balls: p.totalBalls,
      partnerships: p.partnerships,
      averagePartnership: Math.round(p.averagePartnership),
      strikeRate: p.strikeRate.toFixed(2),
      highestPartnership: p.highestPartnership
    }));

    // Simple categorization
    const openingPartnerships = partnerships.slice(0, 8).map(p => ({
      player1: p.player1,
      player2: p.player2,
      runs: p.totalRuns,
      balls: p.totalBalls,
      strikeRate: p.strikeRate.toFixed(2)
    }));

    const middleOrderPartnerships = partnerships.slice(8, 16).map(p => ({
      player1: p.player1,
      player2: p.player2,
      runs: p.totalRuns,
      balls: p.totalBalls,
      strikeRate: p.strikeRate.toFixed(2)
    }));

    const finishingPartnerships = partnerships.slice(16, 24).map(p => ({
      player1: p.player1,
      player2: p.player2,
      runs: p.totalRuns,
      balls: p.totalBalls,
      strikeRate: p.strikeRate.toFixed(2)
    }));

    const data = {
      totalPartnerships,
      highestPartnership: { runs: highestPartnership },
      averagePartnership,
      centuryPartnerships,
      topPartnerships,
      openingPartnerships,
      middleOrderPartnerships,
      finishingPartnerships
    };

    res.json({ data });
  } catch (error) {
    console.error('getPartnerships error:', error);
    res.status(500).json({ message: 'Failed to fetch partnerships' });
  }
};

// GET /api/analytics/seasons/:year
const getSeasonSummary = async (req, res) => {
  try {
    const { year } = req.params;
    const season = parseInt(year);

    // Clamp to available data range 2008-2019
    if (Number.isNaN(season) || season < 2008 || season > 2019) {
      return res.status(400).json({ message: 'Season must be between 2008 and 2019' });
    }

    // Get matches for the season
    const seasonMatches = await Match.find({ season });

    if (!seasonMatches || seasonMatches.length === 0) {
      return res.status(404).json({ message: 'No data available for this season' });
    }

    // Get top run scorers for the season
    const topRunScorers = await Delivery.aggregate([
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: '_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { $match: { 'match.season': season } },
      {
        $group: {
          _id: '$batsman',
          runs: { $sum: '$batsman_runs' }
        }
      },
      {
        $project: {
          player: '$_id',
          runs: 1,
          _id: 0
        }
      },
      { $sort: { runs: -1 } },
      { $limit: 10 }
    ]);

    // Get top wicket takers
    const topWicketTakers = await Delivery.aggregate([
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: '_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { 
        $match: { 
          'match.season': season,
          player_dismissed: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$bowler',
          wickets: { $sum: 1 }
        }
      },
      {
        $project: {
          player: '$_id',
          wickets: 1,
          _id: 0
        }
      },
      { $sort: { wickets: -1 } },
      { $limit: 10 }
    ]);

    // Team win percentages
    const teamStats = {};
    seasonMatches.forEach(match => {
      [match.team1, match.team2].forEach(team => {
        if (!teamStats[team]) {
          teamStats[team] = { matches: 0, wins: 0 };
        }
        teamStats[team].matches++;
        if (match.winner === team) {
          teamStats[team].wins++;
        }
      });
    });

    const teamWinPercentages = Object.entries(teamStats)
      .map(([team, stats]) => ({
        team,
        wins: stats.wins,
        matches: stats.matches,
        winPercentage: Math.round((stats.wins / stats.matches) * 100)
      }))
      .sort((a, b) => b.winPercentage - a.winPercentage);

    // Venue distribution
    const venueFreq = {};
    seasonMatches.forEach(match => {
      if (match.venue) {
        venueFreq[match.venue] = (venueFreq[match.venue] || 0) + 1;
      }
    });

    const venueDistribution = Object.entries(venueFreq)
      .map(([name, matches]) => ({ name, matches }))
      .sort((a, b) => b.matches - a.matches);

    // Calculate season totals from deliveries using numeric match_id join
    const seasonTotals = await Delivery.aggregate([
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { $match: { 'match.season': season } },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: '$total_runs' },
          totalWickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } }
        }
      }
    ]);

    // Highest team total in the season
    const highestTotalAgg = await Delivery.aggregate([
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { $match: { 'match.season': season } },
      {
        $group: {
          _id: { match_id: '$match_id', inning: '$inning', batting_team: '$batting_team' },
          totalRuns: { $sum: '$total_runs' }
        }
      },
      { $sort: { totalRuns: -1 } },
      { $limit: 1 }
    ]);

    // Best chase: highest successful second-innings total
    const bestChaseAgg = await Delivery.aggregate([
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      {
        $match: {
          'match.season': season,
          inning: 2
        }
      },
      {
        $group: {
          _id: { match_id: '$match_id', batting_team: '$batting_team' },
          totalRuns: { $sum: '$total_runs' },
          winner: { $first: '$match.winner' }
        }
      },
      {
        $match: {
          $expr: { $eq: ['$_id.batting_team', '$winner'] }
        }
      },
      { $sort: { totalRuns: -1 } },
      { $limit: 1 }
    ]);

    const seasonStats = seasonTotals[0] || { totalRuns: 0, totalWickets: 0 };
    const highestTotal = highestTotalAgg[0]?.totalRuns || 0;
    const bestChase = bestChaseAgg[0]?.totalRuns || 0;

    // Determine champion as winner of the last match in the season
    const sortedSeasonMatches = [...seasonMatches].sort((a, b) => {
      if (a.date && b.date) {
        return new Date(a.date) - new Date(b.date);
      }
      if (a.match_id != null && b.match_id != null) {
        return a.match_id - b.match_id;
      }
      return 0;
    });

    const lastMatchWithWinner = sortedSeasonMatches
      .slice()
      .reverse()
      .find(m => m.winner && m.winner.trim() !== '');

    const champion = lastMatchWithWinner?.winner || 'TBD';

    const data = {
      totalMatches: seasonMatches.length,
      totalRuns: seasonStats.totalRuns,
      totalWickets: seasonStats.totalWickets,
      highestTotal,
      bestChase,
      champion,
      topRunScorers,
      topWicketTakers,
      teamWinPercentages,
      venueDistribution
    };

    res.json({ data });
  } catch (error) {
    console.error('getSeasonSummary error:', error);
    res.status(500).json({ message: 'Failed to fetch season summary' });
  }
};

// GET /api/analytics/milestones
const getMilestones = async (req, res) => {
  try {
    // Calculate fastest fifties (50+ runs in minimum balls)
    const fastestFifties = await Delivery.aggregate([
      {
        $group: {
          _id: { match_id: '$match_id', inning: '$inning', batsman: '$batsman' },
          runs: { $sum: '$batsman_runs' },
          balls: { $sum: 1 }
        }
      },
      { $match: { runs: { $gte: 50 } } },
      {
        $lookup: {
          from: 'matches',
          localField: '_id.match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: { path: '$match', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          player: '$_id.batsman',
          balls: 1,
          match: {
            $cond: [
              '$match',
              { $concat: ['$match.team1', ' vs ', '$match.team2'] },
              ''
            ]
          },
          season: '$match.season',
          _id: 0
        }
      },
      { $sort: { balls: 1 } },
      { $limit: 10 }
    ]);

    // Calculate fastest hundreds (100+ runs in minimum balls)
    const fastestHundreds = await Delivery.aggregate([
      {
        $group: {
          _id: { match_id: '$match_id', inning: '$inning', batsman: '$batsman' },
          runs: { $sum: '$batsman_runs' },
          balls: { $sum: 1 }
        }
      },
      { $match: { runs: { $gte: 100 } } },
      {
        $lookup: {
          from: 'matches',
          localField: '_id.match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: { path: '$match', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          player: '$_id.batsman',
          balls: 1,
          match: {
            $cond: [
              '$match',
              { $concat: ['$match.team1', ' vs ', '$match.team2'] },
              ''
            ]
          },
          season: '$match.season',
          _id: 0
        }
      },
      { $sort: { balls: 1 } },
      { $limit: 10 }
    ]);

    // Calculate highest individual scores
    const highestScores = await Delivery.aggregate([
      {
        $group: {
          _id: { match_id: '$match_id', inning: '$inning', batsman: '$batsman' },
          runs: { $sum: '$batsman_runs' },
          balls: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'matches',
          localField: '_id.match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: { path: '$match', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          player: '$_id.batsman',
          runs: 1,
          balls: 1,
          match: {
            $cond: [
              '$match',
              { $concat: ['$match.team1', ' vs ', '$match.team2'] },
              ''
            ]
          },
          season: '$match.season',
          _id: 0
        }
      },
      { $sort: { runs: -1 } },
      { $limit: 10 }
    ]);

    // Calculate most sixes in a match
    const mostSixesInMatch = await Delivery.aggregate([
      { $match: { batsman_runs: 6 } },
      {
        $group: {
          _id: { match_id: '$match_id', inning: '$inning', batsman: '$batsman' },
          sixes: { $sum: 1 },
          totalRuns: { $sum: '$batsman_runs' }
        }
      },
      {
        $lookup: {
          from: 'matches',
          localField: '_id.match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: { path: '$match', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          player: '$_id.batsman',
          sixes: 1,
          runs: '$totalRuns',
          match: {
            $cond: [
              '$match',
              { $concat: ['$match.team1', ' vs ', '$match.team2'] },
              ''
            ]
          },
          season: '$match.season',
          _id: 0
        }
      },
      { $sort: { sixes: -1 } },
      { $limit: 10 }
    ]);

    // Calculate best bowling figures (3+ wickets)
    const bestBowlingFigures = await Delivery.aggregate([
      {
        $group: {
          _id: { match_id: '$match_id', inning: '$inning', bowler: '$bowler' },
          wickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } },
          runs: { $sum: '$total_runs' },
          balls: { $sum: 1 }
        }
      },
      { $match: { wickets: { $gte: 3 } } },
      {
        $lookup: {
          from: 'matches',
          localField: '_id.match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: { path: '$match', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          player: '$_id.bowler',
          wickets: 1,
          runs: 1,
          overs: { $round: [{ $divide: ['$balls', 6] }, 1] },
          economy: { $round: [{ $multiply: [{ $divide: ['$runs', '$balls'] }, 6] }, 2] },
          figures: { $concat: [{ $toString: '$wickets' }, '/', { $toString: '$runs' }] },
          match: {
            $cond: [
              '$match',
              { $concat: ['$match.team1', ' vs ', '$match.team2'] },
              ''
            ]
          },
          season: '$match.season',
          _id: 0
        }
      },
      { $sort: { wickets: -1, runs: 1 } },
      { $limit: 10 }
    ]);

    // Calculate most economical spells (minimum 18 balls = 3 overs)
    const mostEconomicalSpells = await Delivery.aggregate([
      {
        $group: {
          _id: { match_id: '$match_id', inning: '$inning', bowler: '$bowler' },
          runs: { $sum: '$total_runs' },
          balls: { $sum: 1 }
        }
      },
      { $match: { balls: { $gte: 18 } } },
      {
        $lookup: {
          from: 'matches',
          localField: '_id.match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: { path: '$match', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          player: '$_id.bowler',
          runs: 1,
          overs: { $round: [{ $divide: ['$balls', 6] }, 1] },
          economy: { $round: [{ $multiply: [{ $divide: ['$runs', '$balls'] }, 6] }, 2] },
          match: {
            $cond: [
              '$match',
              { $concat: ['$match.team1', ' vs ', '$match.team2'] },
              ''
            ]
          },
          season: '$match.season',
          _id: 0
        }
      },
      { $sort: { economy: 1 } },
      { $limit: 10 }
    ]);

    // Fielding records - most catches as fielder
    const mostCatches = await Delivery.aggregate([
      {
        $match: {
          fielder: { $ne: null },
          dismissal_kind: { $regex: /^caught/i }
        }
      },
      {
        $group: {
          _id: '$fielder',
          dismissals: { $sum: 1 }
        }
      },
      {
        $project: {
          player: '$_id',
          dismissals: 1,
          _id: 0
        }
      },
      { $sort: { dismissals: -1 } },
      { $limit: 10 }
    ]);

    // Fielding records - most run outs as fielder (where fielder is credited)
    const mostRunOuts = await Delivery.aggregate([
      {
        $match: {
          fielder: { $ne: null },
          dismissal_kind: { $regex: /run out/i }
        }
      },
      {
        $group: {
          _id: '$fielder',
          dismissals: { $sum: 1 }
        }
      },
      {
        $project: {
          player: '$_id',
          dismissals: 1,
          _id: 0
        }
      },
      { $sort: { dismissals: -1 } },
      { $limit: 10 }
    ]);

    // Calculate highest team totals
    const highestTeamTotals = await Delivery.aggregate([
      {
        $group: {
          _id: { match_id: '$match_id', inning: '$inning', batting_team: '$batting_team' },
          totalRuns: { $sum: '$total_runs' },
          wickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } },
          overs: { $max: '$over' }
        }
      },
      {
        $project: {
          match_id: '$_id.match_id',
          team: '$_id.batting_team',
          runs: '$totalRuns',
          wickets: 1,
          overs: 1
        }
      },
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: { path: '$match', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          team: 1,
          runs: 1,
          wickets: 1,
          overs: 1,
          _id: 0
        }
      },
      { $sort: { runs: -1 } },
      { $limit: 10 }
    ]);

    // Calculate successful chases (second innings wins)
    const successfulChases = await Delivery.aggregate([
      { $match: { inning: 2 } },
      {
        $group: {
          _id: { match_id: '$match_id', batting_team: '$batting_team' },
          totalRuns: { $sum: '$total_runs' },
          wickets: { $sum: { $cond: [{ $ne: ['$player_dismissed', null] }, 1, 0] } },
          overs: { $max: '$over' }
        }
      },
      {
        $project: {
          match_id: '$_id.match_id',
          team: '$_id.batting_team',
          runs: '$totalRuns',
          wickets: 1,
          overs: 1
        }
      },
      {
        $lookup: {
          from: 'matches',
          localField: 'match_id',
          foreignField: 'match_id',
          as: 'match'
        }
      },
      { $unwind: { path: '$match', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          team: 1,
          runs: 1,
          wickets: 1,
          overs: 1,
          _id: 0
        }
      },
      { $sort: { runs: -1 } },
      { $limit: 10 }
    ]);

    const data = {
      fastestFifties,
      fastestHundreds,
      highestScores,
      mostSixesInMatch,
      bestBowlingFigures,
      mostEconomicalSpells,
      mostCatches,
      mostRunOuts,
      hatTricks: [], // Complex ball-by-ball analysis needed
      highestTeamTotals,
      successfulChases,
      lowestDefended: [] // Complex analysis needed
    };

    res.json({ data });
  } catch (error) {
    console.error('getMilestones error:', error);
    res.status(500).json({ message: 'Failed to fetch milestones' });
  }
};

module.exports = {
  getPlayerStats,
  getBowlerStats,
  getAllVenues,
  getVenueStats,
  getAllUmpires,
  getUmpireStats,
  getPartnerships,
  getSeasonSummary,
  getMilestones
};
