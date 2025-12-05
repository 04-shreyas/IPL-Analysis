import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getPhaseAnalysis, getTeams, getAllPlayers } from '../api/apiClient';
import '../styles/PhaseAnalysis.css';

const PhaseAnalysis = () => {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [teamsData, playersData] = await Promise.all([
          getTeams(),
          getAllPlayers()
        ]);

        // Support both wrapped and plain array responses
        const teamsArray = Array.isArray(teamsData?.data) ? teamsData.data : (Array.isArray(teamsData) ? teamsData : []);
        const playersArray = Array.isArray(playersData?.data) ? playersData.data : (Array.isArray(playersData) ? playersData : []);

        setTeams(teamsArray);
        setPlayers(playersArray);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    // Filter players based on selected team (if any), then by name search
    let basePlayers = players;

    if (selectedTeam) {
      const sel = selectedTeam.toLowerCase();
      const byTeam = players.filter(p => {
        const team = (p.team || '').toLowerCase();
        if (!team) return false;
        // Match when either string contains the other to handle short names / aliases
        return team.includes(sel) || sel.includes(team);
      });

      // If team-based filter found players, use it; otherwise fall back to all players
      if (byTeam.length > 0) {
        basePlayers = byTeam;
      }
    }

    if (playerSearch.trim()) {
      const searchLower = playerSearch.toLowerCase();
      basePlayers = basePlayers.filter(p =>
        p.name.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPlayers(basePlayers.slice(0, 20));
  }, [playerSearch, players, selectedTeam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const params = {};
      if (selectedTeam) params.team = selectedTeam;
      if (selectedPlayer) params.player = selectedPlayer;
      if (selectedSeason) params.season = selectedSeason;

      const data = await getPhaseAnalysis(params);
      setAnalysisData(data);
    } catch (err) {
      setError('Failed to fetch phase analysis data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = (playerName) => {
    setSelectedPlayer(playerName);
    setPlayerSearch(playerName);
    setShowPlayerSuggestions(false);
  };

  const formatBattingData = (batting) => {
    if (!batting) return [];
    return batting.map(phase => ({
      // Backend may return phase as `phase` (team/league) or `_id` (player-only)
      phase: phase.phase || phase._id,
      Runs: phase.runsScored,
      Balls: phase.ballsFaced,
      SR: phase.strikeRate ? phase.strikeRate.toFixed(2) : 0,
      Fours: phase.fours,
      Sixes: phase.sixes,
      Wickets: phase.wicketsLost
    }));
  };

  const formatBowlingData = (bowling) => {
    if (!bowling) return [];
    return bowling.map(phase => ({
      // Backend may return phase as `phase` (team/league) or `_id` (player-only)
      phase: phase.phase || phase._id,
      Runs: phase.runsConceded,
      Balls: phase.ballsBowled,
      Economy: phase.economy ? phase.economy.toFixed(2) : 0,
      Wickets: phase.wicketsTaken
    }));
  };

  return (
    <div className="phase-page">
      <h1>Phase-wise Analysis</h1>
      <p className="page-description">
        Analyze batting and bowling performance across Powerplay (1-6), Middle (7-15), and Death (16-20) overs
      </p>

      <div className="analytics-card">
        <h2>Filters</h2>
        <form onSubmit={handleSubmit} className="phase-filters">
          <div className="filter-group">
            <label htmlFor="team-select">Team (Optional)</label>
            <select
              id="team-select"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="">-- Select Team --</option>
              {teams.map(team => (
                <option key={team.name} value={team.name}>{team.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="player-search">Player (Optional)</label>
            <div className="player-search-container">
              <input
                id="player-search"
                type="text"
                value={playerSearch}
                onChange={(e) => {
                  setPlayerSearch(e.target.value);
                  setShowPlayerSuggestions(true);
                }}
                onFocus={() => setShowPlayerSuggestions(true)}
                placeholder="Search player..."
              />
              {playerSearch.trim() && showPlayerSuggestions && filteredPlayers.length > 0 && (
                <ul className="phase-player-suggestions">
                  {filteredPlayers.map(player => (
                    <li
                      key={player.name}
                      onClick={() => handlePlayerSelect(player.name)}
                    >
                      {player.name} {player.team && `(${player.team})`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="season-select">Season (Optional)</label>
            <select
              id="season-select"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
            >
              <option value="">-- All Seasons --</option>
              {Array.from({ length: 2019 - 2008 + 1 }, (_, i) => 2008 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
      </div>

      {error && (
        <div className="analytics-card error-message">
          <p>{error}</p>
        </div>
      )}

      {analysisData && (
        <div className="results-container">
          {/* Batting Analysis */}
          {analysisData.batting && (
            <div className="analytics-card">
              <h2>Batting Performance by Phase</h2>
              <div className="phase-table-container">
                <table className="phase-table">
                  <thead>
                    <tr>
                      <th>Phase</th>
                      <th>Runs</th>
                      <th>Balls</th>
                      <th>Strike Rate</th>
                      <th>Fours</th>
                      <th>Sixes</th>
                      <th>Wickets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formatBattingData(analysisData.batting).map(row => (
                      <tr key={row.phase}>
                        <td className="phase-name">{row.phase}</td>
                        <td>{row.Runs}</td>
                        <td>{row.Balls}</td>
                        <td>{row.SR}</td>
                        <td>{row.Fours}</td>
                        <td>{row.Sixes}</td>
                        <td>{row.Wickets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="chart-container">
                <h3>Runs by Phase</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatBattingData(analysisData.batting)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="phase" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Runs" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Bowling Analysis */}
          {analysisData.bowling && (
            <div className="analytics-card">
              <h2>Bowling Performance by Phase</h2>
              <div className="phase-table-container">
                <table className="phase-table">
                  <thead>
                    <tr>
                      <th>Phase</th>
                      <th>Runs Conceded</th>
                      <th>Balls Bowled</th>
                      <th>Economy</th>
                      <th>Wickets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formatBowlingData(analysisData.bowling).map(row => (
                      <tr key={row.phase}>
                        <td className="phase-name">{row.phase}</td>
                        <td>{row.Runs}</td>
                        <td>{row.Balls}</td>
                        <td>{row.Economy}</td>
                        <td>{row.Wickets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="chart-container">
                <h3>Economy by Phase</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatBowlingData(analysisData.bowling)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="phase" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Economy" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* League-wide stats */}
          {analysisData.leagueStats && (
            <div className="analytics-card">
              <h2>League-wide Phase Statistics</h2>
              <div className="phase-table-container">
                <table className="phase-table">
                  <thead>
                    <tr>
                      <th>Phase</th>
                      <th>Total Runs</th>
                      <th>Total Balls</th>
                      <th>Avg Run Rate</th>
                      <th>Wickets</th>
                      <th>Boundaries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.leagueStats.map(stat => (
                      <tr key={stat._id}>
                        <td className="phase-name">{stat._id}</td>
                        <td>{stat.totalRuns}</td>
                        <td>{stat.totalBalls}</td>
                        <td>{stat.avgRunRate?.toFixed(2)}</td>
                        <td>{stat.totalWickets}</td>
                        <td>{stat.boundaries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhaseAnalysis;
