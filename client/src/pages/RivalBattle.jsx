import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getRivalBattle, getAllPlayers } from '../api/apiClient';
import '../styles/RivalBattle.css';

const RivalBattle = () => {
  const [players, setPlayers] = useState([]);
  const [batsman, setBatsman] = useState('');
  const [bowler, setBowler] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [batsmanSearch, setBatsmanSearch] = useState('');
  const [bowlerSearch, setBowlerSearch] = useState('');
  const [filteredBatsmen, setFilteredBatsmen] = useState([]);
  const [filteredBowlers, setFilteredBowlers] = useState([]);
  const [showBatsmanSuggestions, setShowBatsmanSuggestions] = useState(false);
  const [showBowlerSuggestions, setShowBowlerSuggestions] = useState(false);
  const [battleData, setBattleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const data = await getAllPlayers();
        setPlayers(data.data || []);
      } catch (err) {
        console.error('Failed to load players:', err);
      }
    };
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (batsmanSearch) {
      const filtered = players.filter(p =>
        p.name.toLowerCase().includes(batsmanSearch.toLowerCase())
      ).slice(0, 10);
      setFilteredBatsmen(filtered);
    } else {
      setFilteredBatsmen([]);
    }
  }, [batsmanSearch, players]);

  useEffect(() => {
    if (bowlerSearch) {
      const filtered = players.filter(p =>
        p.name.toLowerCase().includes(bowlerSearch.toLowerCase())
      ).slice(0, 10);
      setFilteredBowlers(filtered);
    } else {
      setFilteredBowlers([]);
    }
  }, [bowlerSearch, players]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!batsman || !bowler) {
      setError('Please select both batsman and bowler');
      return;
    }

    setLoading(true);
    setError(null);
    setBattleData(null);

    try {
      const params = {};
      if (selectedSeason) params.matchFilter = selectedSeason;

      const data = await getRivalBattle(batsman, bowler, params);
      setBattleData(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No encounters found between these players');
      } else {
        setError('Failed to fetch rival battle data');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatsmanSelect = (playerName) => {
    setBatsman(playerName);
    setBatsmanSearch(playerName);
    setShowBatsmanSuggestions(false);
  };

  const handleBowlerSelect = (playerName) => {
    setBowler(playerName);
    setBowlerSearch(playerName);
    setShowBowlerSuggestions(false);
  };

  const getDismissalData = () => {
    if (!battleData?.dismissalsBreakdown) return [];
    return Object.entries(battleData.dismissalsBreakdown).map(([type, count]) => ({
      name: type,
      value: count
    }));
  };

  return (
    <div className="rival-page">
      <h1>Rival Battle: Batsman vs Bowler</h1>
      <p className="page-description">
        Head-to-head statistics between a batsman and bowler across all IPL encounters
      </p>

      <div className="analytics-card">
        <h2>Select Players</h2>
        <form onSubmit={handleSubmit} className="rival-filters">
          <div className="filter-group">
            <label htmlFor="batsman-search">Batsman</label>
            <div className="player-search-container">
              <input
                id="batsman-search"
                type="text"
                value={batsmanSearch}
                onChange={(e) => {
                  setBatsmanSearch(e.target.value);
                  setShowBatsmanSuggestions(true);
                }}
                onFocus={() => setShowBatsmanSuggestions(true)}
                placeholder="Search batsman..."
                required
              />
              {showBatsmanSuggestions && filteredBatsmen.length > 0 && (
                <ul className="rival-player-suggestions">
                  {filteredBatsmen.map(player => (
                    <li
                      key={player.name}
                      onClick={() => handleBatsmanSelect(player.name)}
                    >
                      {player.name} {player.team && `(${player.team})`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="bowler-search">Bowler</label>
            <div className="player-search-container">
              <input
                id="bowler-search"
                type="text"
                value={bowlerSearch}
                onChange={(e) => {
                  setBowlerSearch(e.target.value);
                  setShowBowlerSuggestions(true);
                }}
                onFocus={() => setShowBowlerSuggestions(true)}
                placeholder="Search bowler..."
                required
              />
              {showBowlerSuggestions && filteredBowlers.length > 0 && (
                <ul className="rival-player-suggestions">
                  {filteredBowlers.map(player => (
                    <li
                      key={player.name}
                      onClick={() => handleBowlerSelect(player.name)}
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
            {loading ? 'Loading...' : 'Get Battle Stats'}
          </button>
        </form>
      </div>

      {error && (
        <div className="analytics-card error-message">
          <p>{error}</p>
        </div>
      )}

      {battleData && (
        <div className="results-container">
          <div className="battle-header analytics-card">
            <div className="player-vs">
              <div className="player-name batsman-name">{battleData.batsman}</div>
              <div className="vs-text">VS</div>
              <div className="player-name bowler-name">{battleData.bowler}</div>
            </div>
          </div>

          <div className="battle-stats analytics-card">
            <h3>Battle Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Balls Faced</div>
                <div className="stat-value">{battleData.balls}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Runs Scored</div>
                <div className="stat-value">{battleData.runs}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Times Dismissed</div>
                <div className="stat-value">{battleData.dismissals}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Strike Rate</div>
                <div className="stat-value">{battleData.sr}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Fours</div>
                <div className="stat-value">{battleData.fours}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Sixes</div>
                <div className="stat-value">{battleData.sixes}</div>
              </div>
            </div>
          </div>

          {getDismissalData().length > 0 && (
            <div className="analytics-card">
              <h3>Dismissal Breakdown</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getDismissalData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getDismissalData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default RivalBattle;
