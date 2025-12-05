const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const Delivery = require('../models/Delivery');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for data import');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Normalize team names to avoid duplicate variants (e.g. Rising Pune Supergiant vs Supergiants)
const normalizeTeamName = (rawName) => {
  if (!rawName) return rawName;
  const name = String(rawName).trim();

  const aliasMap = {
    'Rising Pune Supergiant': 'Rising Pune Supergiants',
    'Rising Pune Supergiants': 'Rising Pune Supergiants',
  };

  return aliasMap[name] || name;
};

// Helper function to read CSV files
const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return resolve([]);
    }
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

// Helper function to read Excel files
const readExcel = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return [];
    }
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } catch (error) {
    console.error(`Error reading Excel file ${filePath}:`, error.message);
    return [];
  }
};

// Helper to safely parse season values like "IPL-2017" -> 2017
const parseSeason = (seasonValue, dateValue) => {
  if (seasonValue) {
    const match = String(seasonValue).match(/\d{4}/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }

  const parsedDate = parseDate(dateValue);
  return parsedDate ? parsedDate.getFullYear() : null;
};

// Helper to safely parse dates in formats like DD-MM-YYYY
const parseDate = (dateStr) => {
  if (!dateStr) return null;

  // Handle strings like 05-04-2017 or 2017-04-05
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    let day;
    let month;
    let year;

    // Heuristic: if first part has 4 digits, assume YYYY-MM-DD, else DD-MM-YYYY
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }

    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  }

  // Fallback to native Date parsing
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
};

// Import teams data
const importTeams = async () => {
  try {
    console.log('Importing teams data...');
    const dataPath = path.join(__dirname, '../../../data');
    const teamsData = await readCSV(path.join(dataPath, 'teams.csv'));
    
    if (teamsData.length === 0) {
      console.log('No teams data found');
      return;
    }
    
    // Clear existing teams
    await Team.deleteMany({});
    
    // Use a map keyed by normalized team name to avoid duplicate documents
    const teamsMap = new Map();
    
    teamsData.forEach((row) => {
      const rawName = row.team_name || row.name || row.Team || row.team1;
      const name = normalizeTeamName(rawName);

      // Skip rows without a valid name (e.g. empty/footer rows)
      if (!name) {
        return;
      }

      const teamDoc = {
        name,
        shortName:
          row.short_name ||
          row.shortName ||
          (name
            ? String(name).substring(0, 3).toUpperCase()
            : undefined),
        city: row.city || row.City || '',
        homeVenue: row.home_venue || row.venue || row.Venue || '',
        totalMatches: row.total_matches ? parseInt(row.total_matches, 10) : 0,
        totalWins: row.total_wins ? parseInt(row.total_wins, 10) : 0,
        homeWins: row.home_wins ? parseInt(row.home_wins, 10) : 0,
        awayWins: row.away_wins ? parseInt(row.away_wins, 10) : 0,
      };

      // If this team name already exists, keep the first occurrence
      // (source CSV may contain duplicates for the same franchise)
      if (!teamsMap.has(name)) {
        teamsMap.set(name, teamDoc);
      }
    });

    const teams = Array.from(teamsMap.values());

    if (!teams.length) {
      console.log('No valid teams found to import');
      return;
    }

    await Team.insertMany(teams);
    console.log(`Imported ${teams.length} teams`);
  } catch (error) {
    console.error('Error importing teams:', error.message);
  }
};

// Import players data
const importPlayers = async () => {
  try {
    console.log('Importing players data...');
    const dataPath = path.join(__dirname, '../../../data');
    
    // Read CSV data
    const runsData = await readCSV(path.join(dataPath, 'most_runs_average_strikerate.csv'));
    
    // Read Excel data
    const playersExcelData = readExcel(path.join(dataPath, 'Players.xlsx'));
    
    if (runsData.length === 0 && playersExcelData.length === 0) {
      console.log('No players data found');
      return;
    }
    
    // Clear existing players
    await Player.deleteMany({});
    
    const playersMap = new Map();
    
    // Process runs data
    runsData.forEach(row => {
      const playerName = row.batsman || row.player || row.Player || row.name;
      if (playerName) {
        playersMap.set(playerName, {
          name: playerName,
          team: normalizeTeamName(row.team || row.Team || ''),
          role: row.role || 'Batsman',
          totalRuns: parseInt(row.runs) || parseInt(row.total_runs) || 0,
          average: parseFloat(row.average) || parseFloat(row.avg) || 0,
          strikeRate: parseFloat(row.strike_rate) || parseFloat(row.sr) || 0
        });
      }
    });
    
    // Process Excel data and merge
    playersExcelData.forEach(row => {
      const playerName = row.Player || row.name || row.player_name;
      if (playerName) {
        const existing = playersMap.get(playerName) || {};
        playersMap.set(playerName, {
          name: playerName,
          team: normalizeTeamName(row.Team || existing.team || ''),
          role: row.Role || existing.role || 'Unknown',
          battingStyle: row.Batting_Style || row.batting_style || '',
          bowlingStyle: row.Bowling_Style || row.bowling_style || '',
          totalRuns: existing.totalRuns || 0,
          average: existing.average || 0,
          strikeRate: existing.strikeRate || 0
        });
      }
    });
    
    const players = Array.from(playersMap.values());
    
    if (players.length > 0) {
      await Player.insertMany(players);
      console.log(`Imported ${players.length} players`);
    }
  } catch (error) {
    console.error('Error importing players:', error.message);
  }
};

// Import matches data
const importMatches = async () => {
  try {
    console.log('Importing matches data...');
    const dataPath = path.join(__dirname, '../../../data');
    const matchesData = await readCSV(
      path.join(dataPath, 'matches_cleaned_original_mode.csv')
    );
    
    if (matchesData.length === 0) {
      console.log('No matches data found');
      return;
    }
    
    // Clear existing matches
    await Match.deleteMany({});
    
    const matches = [];

    matchesData.forEach((row) => {
      const season = parseSeason(row.season || row.Season, row.date);
      if (!season) {
        // Skip rows where we cannot determine a valid season
        return;
      }

      const date = parseDate(row.date);
      const idValue = row.id || row.match_id || row.matchId;
      const parsedMatchId = idValue ? parseInt(idValue, 10) : NaN;

      const matchDoc = {
        // Always set required matchId, and also legacy match_id for compatibility
        matchId: !isNaN(parsedMatchId) ? parsedMatchId : undefined,
        match_id: !isNaN(parsedMatchId) ? parsedMatchId : undefined,
        season,
        city: row.city || row.City || '',
        date: date,
        team1: normalizeTeamName(row.team1 || row.Team1 || ''),
        team2: normalizeTeamName(row.team2 || row.Team2 || ''),
        tossWinner: row.toss_winner || row.TossWinner || '',
        tossDecision: row.toss_decision || row.TossDecision || '',
        result: row.result || row.Result || '',
        winner: normalizeTeamName(row.winner || row.Winner || ''),
        player_of_match: row.player_of_match || row.playerOfMatch || row.man_of_the_match || '',
        venue: row.venue || row.Venue || '',
        umpire1: row.umpire1 || row.Umpire1 || '',
        umpire2: row.umpire2 || row.Umpire2 || '',
        umpire3: row.umpire3 || row.Umpire3 || '',
        firstInningsScore: row.first_innings_score
          ? parseInt(row.first_innings_score, 10)
          : null,
        secondInningsScore: row.second_innings_score
          ? parseInt(row.second_innings_score, 10)
          : null,
      };

      matches.push(matchDoc);
    });

    if (!matches.length) {
      console.log('No valid matches found to import');
      return;
    }
    
    await Match.insertMany(matches);
    console.log(`Imported ${matches.length} matches`);
  } catch (error) {
    console.error('Error importing matches:', error.message);
  }
};

// Update team statistics based on matches
const updateTeamStats = async () => {
  try {
    console.log('Updating team statistics...');
    const teams = await Team.find();
    
    for (const team of teams) {
      const teamMatches = await Match.find({
        $or: [
          { team1: team.name },
          { team2: team.name }
        ]
      });

      const totalWins = await Match.countDocuments({ winner: team.name });

      // Home wins: matches this team won either at its homeVenue OR as the "home" team (team1)
      let homeWins = 0;
      const homeConditions = [{ team1: team.name }];
      if (team.homeVenue) {
        homeConditions.push({ venue: team.homeVenue });
      }

      homeWins = await Match.countDocuments({
        winner: team.name,
        $or: homeConditions
      });

      const awayWins = Math.max(0, totalWins - homeWins);

      await Team.findByIdAndUpdate(team._id, {
        totalMatches: teamMatches.length,
        totalWins,
        homeWins,
        awayWins
      });
    }
    
    console.log('Team statistics updated');
  } catch (error) {
    console.error('Error updating team stats:', error.message);
  }
};

// Import deliveries data
// NOTE: Deliveries are used by advanced analytics endpoints for:
// - Phase-wise analysis (powerplay/middle/death stats)
// - Venue metrics and scoring patterns
// - Impact index calculations
// - Rival player battles (batsman vs bowler)
// - Match over-by-over aggregates for Manhattan/Worm charts
const importDeliveries = async () => {
  try {
    console.log('Importing deliveries data...');
    
    // Check if we should clear existing data
    if (process.env.IMPORT_CLEAR === 'true') {
      console.log('Clearing existing deliveries...');
      await Delivery.deleteMany({});
      console.log('Existing deliveries cleared.');
    } else {
      // Check if deliveries already exist
      const existingCount = await Delivery.countDocuments();
      if (existingCount > 0) {
        console.log(`Deliveries already exist (${existingCount} records). Skipping import.`);
        console.log('Set IMPORT_CLEAR=true to clear existing data before import.');
        return;
      }
    }
    
    const deliveriesPath = path.join(__dirname, '../../../data/deliveries_cleaned_original_mode.csv');
    const deliveriesData = await readCSV(deliveriesPath);
    
    if (deliveriesData.length === 0) {
      console.log('No deliveries data found');
      return;
    }
    
    console.log(`Found ${deliveriesData.length} delivery records`);
    
    // Process deliveries in batches to avoid memory issues
    const batchSize = 5000;
    let processed = 0;
    
    for (let i = 0; i < deliveriesData.length; i += batchSize) {
      const batch = deliveriesData.slice(i, i + batchSize);
      
      const deliveriesToInsert = batch.map(row => {
        const matchId = parseInt(row.match_id) || 0;
        
        return {
          // New camelCase fields
          matchId: matchId,
          inning: parseInt(row.inning) || 1,
          over: parseInt(row.over) || 1,
          ball: parseInt(row.ball) || 1,
          battingTeam: normalizeTeamName(row.batting_team || ''),
          bowlingTeam: normalizeTeamName(row.bowling_team || ''),
          batsman: row.batsman || '',
          nonStriker: row.non_striker || '',
          bowler: row.bowler || '',
          isSuperOver: parseInt(row.is_super_over) === 1,
          wideRuns: parseInt(row.wide_runs) || 0,
          byeRuns: parseInt(row.bye_runs) || 0,
          legbyeRuns: parseInt(row.legbye_runs) || 0,
          noballRuns: parseInt(row.noball_runs) || 0,
          penaltyRuns: parseInt(row.penalty_runs) || 0,
          batsmanRuns: parseInt(row.batsman_runs) || 0,
          extraRuns: parseInt(row.extra_runs) || 0,
          totalRuns: parseInt(row.total_runs) || 0,
          player_dismissed: row.player_dismissed || null,
          dismissal_kind: row.dismissal_kind || null,
          dismissal_fielders: row.fielder || null,
          
          // Legacy fields for backward compatibility
          match_id: matchId,
          batting_team: normalizeTeamName(row.batting_team || ''),
          bowling_team: normalizeTeamName(row.bowling_team || ''),
          non_striker: row.non_striker || '',
          is_super_over: parseInt(row.is_super_over) || 0,
          wide_runs: parseInt(row.wide_runs) || 0,
          bye_runs: parseInt(row.bye_runs) || 0,
          legbye_runs: parseInt(row.legbye_runs) || 0,
          noball_runs: parseInt(row.noball_runs) || 0,
          penalty_runs: parseInt(row.penalty_runs) || 0,
          batsman_runs: parseInt(row.batsman_runs) || 0,
          extra_runs: parseInt(row.extra_runs) || 0,
          total_runs: parseInt(row.total_runs) || 0,
          fielder: row.fielder || null
        };
      });
      
      await Delivery.insertMany(deliveriesToInsert, { ordered: false });
      processed += batch.length;
      
      console.log(`Processed ${processed}/${deliveriesData.length} deliveries...`);
    }
    
    console.log(`Successfully imported ${processed} deliveries`);
  } catch (error) {
    console.error('Error importing deliveries:', error.message);
  }
};

// Main import function
const importAllData = async () => {
  try {
    await connectDB();
    
    // Clear collections if requested
    if (process.env.IMPORT_CLEAR === 'true') {
      console.log('Clearing existing matches and deliveries...');
      await Match.deleteMany({});
      await Delivery.deleteMany({});
      console.log('Existing data cleared.');
    }
    
    console.log('Starting data import...');
    await importTeams();
    await importPlayers();
    await importMatches();
    await importDeliveries();
    await updateTeamStats();
    
    console.log('Data import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
};

// Run the import if this script is executed directly
if (require.main === module) {
  importAllData();
}

module.exports = { importAllData };
