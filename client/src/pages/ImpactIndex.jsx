import React, { useState, useEffect } from 'react';
import { getImpactIndex, getTeams, getAllPlayers } from '../api/apiClient';
import '../styles/ImpactIndex.css';

const ImpactIndex = () => {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [limit, setLimit] = useState(50);
  const [playerSearch, setPlayerSearch] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false);
  const [impactData, setImpactData] = useState(null);
  const [selectedPlayerDetail, setSelectedPlayerDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [teamsData, playersData] = await Promise.all([
          getTeams(),
          getAllPlayers()
        ]);
        setTeams(teamsData.data || []);
        setPlayers(playersData.data || []);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    // Load top players on initial mount
    fetchImpactData({});
  }, []);

  useEffect(() => {
    if (playerSearch) {
      const filtered = players.filter(p =>
        p.name.toLowerCase().includes(playerSearch.toLowerCase())
      ).slice(0, 10);
      setFilteredPlayers(filtered);
    } else {
      setFilteredPlayers([]);
    }
  }, [playerSearch, players]);

  const fetchImpactData = async (params) => {
    setLoading(true);
    setError(null);
    // When fetching league/top lists, clear detail; when fetching specific player, we may set detail instead
    if (!params || !params.player) {
      setImpactData(null);
      setSelectedPlayerDetail(null);
    }

    try {
      const data = await getImpactIndex(params);
      // If this is a player-specific query (no players array), treat as detail response
      if (params && params.player && !data.players) {
        setSelectedPlayerDetail(data);
        setImpactData(null);
      } else {
        setImpactData(data);
        setSelectedPlayerDetail(null);
      }
    } catch (err) {
      setError('Failed to fetch impact index data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const params = {};
    if (selectedPlayer) params.player = selectedPlayer;
    if (selectedTeam) params.team = selectedTeam;
    if (selectedSeason) params.season = selectedSeason;
    if (limit) params.limit = limit;

    fetchImpactData(params);
  };

  const handlePlayerSelect = (playerName) => {
    setSelectedPlayer(playerName);
    setPlayerSearch(playerName);
    setShowPlayerSuggestions(false);
  };

  const handlePlayerClick = async (playerName) => {
    setLoading(true);
    try {
      const params = { player: playerName };
      if (selectedSeason) params.season = selectedSeason;
      const data = await getImpactIndex(params);
      setSelectedPlayerDetail(data);
    } catch (err) {
      console.error('Failed to fetch player detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedPlayer('');
    setSelectedTeam('');
    setSelectedSeason('');
    setPlayerSearch('');
    setLimit(50);
    fetchImpactData({});
  };

  return (
    <div className="impact-page">
      <h1>Impact Index</h1>
      <p className="page-description">
        Discover the most impactful players based on runs, strike rate, boundaries, and clutch performances
      </p>

      <div className="analytics-card">
        <h2>Filters</h2>
        <form onSubmit={handleSubmit} className="impact-filters">
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
              {showPlayerSuggestions && filteredPlayers.length > 0 && (
                <div className="player-suggestions">
                  {filteredPlayers.map(player => (
                    <div
                      key={player.name}
                      className="suggestion-item"
                      onClick={() => handlePlayerSelect(player.name)}
                    >
                      {player.name} {player.team && `(${player.team})`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="team-select">Team (Optional)</label>
            <select
              id="team-select"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="">-- All Teams --</option>
              {teams.map(team => (
                <option key={team.name} value={team.name}>{team.name}</option>
              ))}
            </select>
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

          <div className="filter-group">
            <label htmlFor="limit-input">Limit</label>
            <input
              id="limit-input"
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              min="1"
              max="200"
            />
          </div>

          <div className="button-group">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Loading...' : 'Get Impact Index'}
            </button>
            <button type="button" className="reset-btn" onClick={handleReset}>
              Reset
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="analytics-card error-message">
          <p>{error}</p>
        </div>
      )}

      {/* Player Detail Panel */}
      {selectedPlayerDetail && (
        <div className="analytics-card player-detail-panel">
          <h2>Impact Breakdown: {selectedPlayerDetail.player}</h2>
          <div className="impact-summary">
            <div className="total-impact">
              <span className="label">Total Impact Score</span>
              <span className="value">{selectedPlayerDetail.impact}</span>
            </div>
          </div>

          {selectedPlayerDetail.components && (
            <div className="components-grid">
              {selectedPlayerDetail.components.batting && (
                <div className="component-card">
                  <h3>Batting Impact</h3>
                  <div className="component-details">
                    <div className="detail-row">
                      <span>Base Runs:</span>
                      <span>{selectedPlayerDetail.components.batting.base}</span>
                    </div>
                    <div className="detail-row">
                      <span>SR Bonus:</span>
                      <span>{selectedPlayerDetail.components.batting.srBonus}</span>
                    </div>
                    <div className="detail-row">
                      <span>Boundaries Bonus:</span>
                      <span>{selectedPlayerDetail.components.batting.boundariesBonus}</span>
                    </div>
                    <div className="detail-row">
                      <span>Clutch Bonus:</span>
                      <span>{selectedPlayerDetail.components.batting.clutchBonus}</span>
                    </div>
                    <div className="detail-row total">
                      <span>Total:</span>
                      <span>{selectedPlayerDetail.components.batting.total}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedPlayerDetail.components.bowling && (
                <div className="component-card">
                  <h3>Bowling Impact</h3>
                  <div className="component-details">
                    <div className="detail-row">
                      <span>Base Wickets:</span>
                      <span>{selectedPlayerDetail.components.bowling.baseWickets}</span>
                    </div>
                    <div className="detail-row">
                      <span>Economy Bonus:</span>
                      <span>{selectedPlayerDetail.components.bowling.economyBonus}</span>
                    </div>
                    <div className="detail-row">
                      <span>Death Wickets Bonus:</span>
                      <span>{selectedPlayerDetail.components.bowling.deathWicketsBonus}</span>
                    </div>
                    <div className="detail-row total">
                      <span>Total:</span>
                      <span>{selectedPlayerDetail.components.bowling.total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {impactData && impactData.players && (
        <div className="analytics-card">
          <h2>Impact Index Leaderboard</h2>
          {impactData.meta && <p className="meta-info">Showing top {impactData.meta.limit} players</p>}
          
          <div className="leaderboard-table-container">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Impact Score</th>
                  <th>Runs</th>
                  <th>Strike Rate</th>
                  <th>Wickets</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {impactData.players.map((player, index) => (
                  <tr key={player.player || index}>
                    <td className="rank-cell">{index + 1}</td>
                    <td className="player-name">{player.player}</td>
                    <td className="impact-score">{player.impact}</td>
                    <td>{player.runs || '-'}</td>
                    <td>{player.strikeRate || '-'}</td>
                    <td>{player.wickets || '-'}</td>
                    <td>
                      <button
                        className="detail-btn"
                        onClick={() => handlePlayerClick(player.player)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Team Players */}
      {impactData && impactData.team && impactData.players && (
        <div className="analytics-card">
          <h2>Top Impact Players for {impactData.team}</h2>
          <div className="team-players-list">
            {impactData.players.map((player, index) => (
              <div key={player.player} className="team-player-card">
                <div className="player-rank">#{index + 1}</div>
                <div className="player-info">
                  <div className="player-name">{player.player}</div>
                  <div className="player-role">{player.role}</div>
                </div>
                <div className="player-stats">
                  <div className="stat">
                    <span className="stat-label">Impact:</span>
                    <span className="stat-value">{player.impact}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Runs:</span>
                    <span className="stat-value">{player.runs}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Wickets:</span>
                    <span className="stat-value">{player.wickets}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImpactIndex;
