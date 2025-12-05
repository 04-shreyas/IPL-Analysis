const Match = require('../models/Match');
const Delivery = require('../models/Delivery');

// GET /api/matches/:matchId
const getMatchDetails = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    if (!matchId) {
      return res.status(400).json({ message: 'Match ID is required' });
    }

    const matchIdNum = parseInt(matchId, 10);
    if (isNaN(matchIdNum)) {
      return res.status(400).json({ message: 'Invalid match ID' });
    }

    // Fetch match document
    const match = await Match.findOne({
      $or: [
        { matchId: matchIdNum },
        { match_id: matchIdNum }
      ]
    }).lean();

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Fetch all deliveries for this match
    const deliveries = await Delivery.find({
      $or: [
        { matchId: matchIdNum },
        { match_id: matchIdNum }
      ]
    }).lean().sort({ inning: 1, over: 1, ball: 1 });

    if (deliveries.length === 0) {
      return res.json({
        match: match,
        innings: [],
        deliveries: []
      });
    }

    // Group deliveries by innings
    const inningsMap = {};
    let runningScore = {};

    deliveries.forEach(delivery => {
      const inning = delivery.inning;
      const battingTeam = delivery.battingTeam || delivery.batting_team;
      const bowlingTeam = delivery.bowlingTeam || delivery.bowling_team;
      const totalRuns = delivery.totalRuns || delivery.total_runs || 0;
      const batsmanRuns = delivery.batsmanRuns || delivery.batsman_runs || 0;

      if (!inningsMap[inning]) {
        inningsMap[inning] = {
          inning,
          battingTeam,
          bowlingTeam,
          totalRuns: 0,
          wickets: 0,
          oversPlayed: 0,
          batsmenStats: {},
          bowlersStats: {},
          fallOfWickets: [],
          deliveries: []
        };
        runningScore[inning] = 0;
      }

      const innings = inningsMap[inning];
      innings.deliveries.push(delivery);
      innings.totalRuns += totalRuns;
      runningScore[inning] += totalRuns;

      // Track wickets and fall of wickets
      if (delivery.player_dismissed) {
        innings.wickets++;
        const overBall = `${delivery.over}.${delivery.ball}`;
        innings.fallOfWickets.push({
          overBall,
          player: delivery.player_dismissed,
          scoreAtFall: runningScore[inning]
        });
      }

      // Track batsman stats
      const batsman = delivery.batsman;
      if (!innings.batsmenStats[batsman]) {
        innings.batsmenStats[batsman] = {
          batsman,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0
        };
      }
      
      innings.batsmenStats[batsman].runs += batsmanRuns;
      innings.batsmenStats[batsman].balls++;
      
      if (batsmanRuns === 4) innings.batsmenStats[batsman].fours++;
      if (batsmanRuns === 6) innings.batsmenStats[batsman].sixes++;

      // Track bowler stats
      const bowler = delivery.bowler;
      if (!innings.bowlersStats[bowler]) {
        innings.bowlersStats[bowler] = {
          bowler,
          overs: 0,
          runs: 0,
          wickets: 0,
          economy: 0,
          balls: 0
        };
      }
      
      innings.bowlersStats[bowler].runs += totalRuns;
      innings.bowlersStats[bowler].balls++;
      
      if (delivery.player_dismissed) {
        innings.bowlersStats[bowler].wickets++;
      }
    });

    // Process innings data
    const inningsArray = Object.values(inningsMap).map(innings => {
      // Calculate overs played
      const lastDelivery = innings.deliveries[innings.deliveries.length - 1];
      if (lastDelivery) {
        const lastOver = lastDelivery.over;
        const lastBall = lastDelivery.ball;
        innings.oversPlayed = parseFloat((lastOver + (lastBall / 10)).toFixed(1));
      }

      // Calculate batsmen strike rates
      innings.batsmenStats = Object.values(innings.batsmenStats).map(batsman => ({
        ...batsman,
        strikeRate: batsman.balls > 0 ? parseFloat(((batsman.runs / batsman.balls) * 100).toFixed(2)) : 0
      }));

      // Calculate bowler overs and economy
      innings.bowlersStats = Object.values(innings.bowlersStats).map(bowler => {
        const overs = parseFloat((bowler.balls / 6).toFixed(1));
        const economy = overs > 0 ? parseFloat((bowler.runs / overs).toFixed(2)) : 0;
        
        return {
          ...bowler,
          overs,
          economy
        };
      });

      // Remove deliveries from innings summary (too large)
      delete innings.deliveries;
      
      return innings;
    });

    // Sort innings by inning number
    inningsArray.sort((a, b) => a.inning - b.inning);

    res.json({
      match: match,
      innings: inningsArray,
      deliveries: deliveries.slice(0, 100) // Return first 100 deliveries, use separate endpoint for full list
    });

  } catch (error) {
    console.error('getMatchDetails error:', error);
    res.status(500).json({ message: 'Failed to fetch match details' });
  }
};

// GET /api/matches/:matchId/deliveries
const getMatchDeliveries = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { inning, page = 1, limit = 1000 } = req.query;
    
    if (!matchId) {
      return res.status(400).json({ message: 'Match ID is required' });
    }

    const matchIdNum = parseInt(matchId, 10);
    if (isNaN(matchIdNum)) {
      return res.status(400).json({ message: 'Invalid match ID' });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: 'Invalid page number' });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 5000) {
      return res.status(400).json({ message: 'Invalid limit (1-5000)' });
    }

    // Build match query
    const matchQuery = {
      $or: [
        { matchId: matchIdNum },
        { match_id: matchIdNum }
      ]
    };

    // Add inning filter if provided
    if (inning) {
      const inningNum = parseInt(inning, 10);
      if (!isNaN(inningNum)) {
        matchQuery.inning = inningNum;
      }
    }

    // Get total count for pagination
    const totalCount = await Delivery.countDocuments(matchQuery);
    
    // Calculate pagination
    const skip = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(totalCount / limitNum);

    // Fetch deliveries with pagination
    const deliveries = await Delivery.find(matchQuery)
      .lean()
      .sort({ inning: 1, over: 1, ball: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      data: deliveries,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });

  } catch (error) {
    console.error('getMatchDeliveries error:', error);
    res.status(500).json({ message: 'Failed to fetch match deliveries' });
  }
};

module.exports = {
  getMatchDetails,
  getMatchDeliveries
};
