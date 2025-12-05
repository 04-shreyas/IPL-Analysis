import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { getAllPlayers, getBowlerStats } from '../api/apiClient';
import '../styles/BowlerAnalytics.css';

const BowlerAnalytics = () => {
  const [bowlers, setBowlers] = useState([]);
  const [selectedBowler, setSelectedBowler] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [bowlerStats, setBowlerStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showBowlerSuggestions, setShowBowlerSuggestions] = useState(false);

  useEffect(() => {
    const fetchBowlers = async () => {
      try {
        const players = await getAllPlayers();
        // Filter for bowlers or all players who have bowling stats
        setBowlers(players && players.data ? players.data : players || []);
      } catch (err) {
        console.error('Failed to load bowlers:', err);
      }
    };
    fetchBowlers();
  }, []);

  // Refetch stats when season changes for a selected bowler
  useEffect(() => {
    if (selectedBowler) {
      handleBowlerSelect(selectedBowler);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeason]);

  const filteredBowlers = bowlers.filter((bowler) =>
    bowler.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBowlerSelect = async (bowlerId) => {
    if (!bowlerId) return;
    
    setSelectedBowler(bowlerId);
    setLoading(true);
    setError(null);
    
    try {
      const params = {};
      if (selectedSeason) params.season = selectedSeason;

      const stats = await getBowlerStats(bowlerId, params);
      setBowlerStats(stats && stats.data ? stats.data : stats);
    } catch (err) {
      setError('Failed to load bowler statistics');
      setBowlerStats(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-root BowlerAnalytics-page">
      <h1>Bowler Analytics</h1>
      <p>Analyze bowling performance including wickets, economy rates, and death overs statistics.</p>

      <div className="bowler-selector analytics-card">
        <label htmlFor="bowlerSearch">Search Bowler:</label>
        <input
          id="bowlerSearch"
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowBowlerSuggestions(true);
          }}
          onFocus={() => setShowBowlerSuggestions(true)}
          placeholder="Type bowler name..."
        />
        {searchTerm && showBowlerSuggestions && filteredBowlers.length > 0 && (
          <ul className="bowler-suggestions">
            {filteredBowlers.slice(0, 20).map((bowler) => (
              <li
                key={bowler._id}
                onClick={() => {
                  setSearchTerm(bowler.name);
                  setShowBowlerSuggestions(false);
                  handleBowlerSelect(bowler._id);
                }}
              >
                {bowler.name} ({bowler.team})
              </li>
            ))}
          </ul>
        )}

        <div className="season-filter">
          <label htmlFor="bowlerSeason">Season (Optional):</label>
          <select
            id="bowlerSeason"
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

      {loading && <p>Loading bowler statistics...</p>}
      {error && <p className="error">{error}</p>}

      {bowlerStats && (
        <div className="bowler-stats-container">
          <div className="stats-overview analytics-card">
            <h2>{bowlerStats.bowlerName} - Bowling Statistics</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Wickets</h3>
                <div className="stat-value">{bowlerStats.totalWickets || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Total Overs</h3>
                <div className="stat-value">{bowlerStats.totalOvers || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Economy Rate</h3>
                <div className="stat-value">
                  {bowlerStats.totalOvers > 0 
                    ? (bowlerStats.totalRuns / bowlerStats.totalOvers).toFixed(2)
                    : '0.00'}
                </div>
              </div>
              <div className="stat-card">
                <h3>Best Figures</h3>
                <div className="stat-value">{bowlerStats.bestFigures || 'N/A'}</div>
              </div>
              <div className="stat-card">
                <h3>Dot Ball %</h3>
                <div className="stat-value">
                  {bowlerStats.totalBalls > 0 
                    ? ((bowlerStats.dotBalls / bowlerStats.totalBalls) * 100).toFixed(1)
                    : '0.0'}%
                </div>
              </div>
              <div className="stat-card">
                <h3>Death Overs Economy</h3>
                <div className="stat-value">{bowlerStats.deathOversEconomy || 'N/A'}</div>
              </div>
            </div>
          </div>

          {bowlerStats.wicketsVsTeams && bowlerStats.wicketsVsTeams.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Wickets vs Teams</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bowlerStats.wicketsVsTeams}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="team" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="wickets" fill="#8884d8" name="Wickets" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {bowlerStats.economyByOvers && bowlerStats.economyByOvers.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Economy Rate by Overs Phase</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bowlerStats.economyByOvers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="phase" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="economy" fill="#82ca9d" name="Economy Rate" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {bowlerStats.venueEconomy && bowlerStats.venueEconomy.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Economy Rate by Venue (Top 10)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bowlerStats.venueEconomy.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="venue" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="economy" fill="#ffc658" name="Economy Rate" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BowlerAnalytics;
