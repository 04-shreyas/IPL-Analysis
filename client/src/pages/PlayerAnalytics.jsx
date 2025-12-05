import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { getAllPlayers, getPlayerStats } from '../api/apiClient';
import '../styles/PlayerAnalytics.css';

const PlayerAnalytics = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [playerStats, setPlayerStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const players = await getAllPlayers();
        setPlayers(players && players.data ? players.data : players || []);
      } catch (err) {
        console.error('Failed to load players:', err);
      }
    };
    fetchPlayers();
  }, []);

  // Refetch stats when season changes for a selected player
  useEffect(() => {
    if (selectedPlayer) {
      handlePlayerSelect(selectedPlayer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeason]);

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePlayerSelect = async (playerId) => {
    if (!playerId) return;
    
    setSelectedPlayer(playerId);
    setLoading(true);
    setError(null);
    
    try {
      const params = {};
      if (selectedSeason) params.season = selectedSeason;

      const stats = await getPlayerStats(playerId, params);
      setPlayerStats(stats && stats.data ? stats.data : stats);
    } catch (err) {
      setError('Failed to load player statistics');
      setPlayerStats(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-root PlayerAnalytics-page">
      <h1>Player Analytics</h1>
      <p>Analyze individual player performance across seasons, venues, and match situations.</p>

      <div className="player-selector analytics-card">
        <label htmlFor="playerSearch">Search Player:</label>
        <input
          id="playerSearch"
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowPlayerSuggestions(true);
          }}
          onFocus={() => setShowPlayerSuggestions(true)}
          placeholder="Type player name..."
        />
        {searchTerm && showPlayerSuggestions && filteredPlayers.length > 0 && (
          <ul className="player-suggestions">
            {filteredPlayers.slice(0, 20).map((player) => (
              <li
                key={player._id}
                onClick={() => {
                  setSearchTerm(player.name);
                  setShowPlayerSuggestions(false);
                  handlePlayerSelect(player._id);
                }}
              >
                {player.name} ({player.team})
              </li>
            ))}
          </ul>
        )}

        <div className="season-filter">
          <label htmlFor="playerSeason">Season (Optional):</label>
          <select
            id="playerSeason"
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
          >
            <option value="">All Seasons</option>
            {Array.from({ length: 2019 - 2008 + 1 }, (_, i) => 2008 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p>Loading player statistics...</p>}
      {error && <p className="error">{error}</p>}

      {playerStats && (
        <div className="player-stats-container">
          {/* Batting statistics */}
          <div className="stats-overview analytics-card">
            <h2>{playerStats.playerName} - Batting Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Runs</h3>
                <div className="stat-value">{playerStats.totalRuns || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Total Balls</h3>
                <div className="stat-value">{playerStats.totalBalls || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Strike Rate</h3>
                <div className="stat-value">
                  {playerStats.totalBalls > 0 
                    ? ((playerStats.totalRuns / playerStats.totalBalls) * 100).toFixed(2)
                    : '0.00'}
                </div>
              </div>
              <div className="stat-card">
                <h3>Fours</h3>
                <div className="stat-value">{playerStats.fours || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Sixes</h3>
                <div className="stat-value">{playerStats.sixes || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Best Venue</h3>
                <div className="stat-value">{playerStats.bestVenue || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Bowling & Fielding statistics */}
          {(playerStats.bowlingSummary || playerStats.fieldingSummary) && (
            <div className="stats-overview analytics-card">
              <h2>{playerStats.playerName} - Bowling & Fielding</h2>
              <div className="stats-grid">
                {playerStats.bowlingSummary && (
                  <>
                    <div className="stat-card">
                      <h3>Total Wickets</h3>
                      <div className="stat-value">{playerStats.bowlingSummary.totalWickets || 0}</div>
                    </div>
                    <div className="stat-card">
                      <h3>Overs Bowled</h3>
                      <div className="stat-value">{playerStats.bowlingSummary.totalOvers || '0.0'}</div>
                    </div>
                    <div className="stat-card">
                      <h3>Economy Rate</h3>
                      <div className="stat-value">{playerStats.bowlingSummary.economy || '0.00'}</div>
                    </div>
                    <div className="stat-card">
                      <h3>Best Figures</h3>
                      <div className="stat-value">{playerStats.bowlingSummary.bestFigures || '0/0'}</div>
                    </div>
                  </>
                )}

                {playerStats.fieldingSummary && (
                  <>
                    <div className="stat-card">
                      <h3>Total Catches</h3>
                      <div className="stat-value">{playerStats.fieldingSummary.catches || 0}</div>
                    </div>
                    <div className="stat-card">
                      <h3>Run Outs</h3>
                      <div className="stat-value">{playerStats.fieldingSummary.runOuts || 0}</div>
                    </div>
                    <div className="stat-card">
                      <h3>Total Dismissals</h3>
                      <div className="stat-value">{playerStats.fieldingSummary.totalDismissals || 0}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {playerStats.seasonPerformance && playerStats.seasonPerformance.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Performance by Season</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={playerStats.seasonPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="season" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="runs" stroke="#8884d8" name="Runs" />
                  <Line type="monotone" dataKey="strikeRate" stroke="#82ca9d" name="Strike Rate" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {playerStats.venuePerformance && playerStats.venuePerformance.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Performance by Venue (Top 10)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={playerStats.venuePerformance.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="venue" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="runs" fill="#8884d8" name="Runs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerAnalytics;
