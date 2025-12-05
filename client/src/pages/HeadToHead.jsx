import React, { useState, useEffect } from 'react';
import { getTeams, getHeadToHead } from '../api/apiClient';
import '../styles/HeadToHead.css';

const HeadToHead = () => {
  const [teams, setTeams] = useState([]);
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teams = await getTeams();
        setTeams(teams && teams.data ? teams.data : teams || []);
      } catch (err) {
        console.error('Failed to load teams:', err);
      }
    };

    fetchTeams();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!team1 || !team2) {
      setError('Please select both teams');
      return;
    }

    if (team1 === team2) {
      setError('Please select different teams');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = {};
      if (selectedSeason) params.season = selectedSeason;

      const headToHead = await getHeadToHead(team1, team2, params);
      setResult(headToHead && headToHead.data ? headToHead.data : headToHead);
    } catch (err) {
      setError('Failed to fetch head-to-head data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="headtohead-page">
      <h1>Head-to-Head Comparison</h1>
      
      <form onSubmit={handleSubmit} className="head-to-head-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="team1">Team 1:</label>
            <select
              id="team1"
              value={team1}
              onChange={(e) => setTeam1(e.target.value)}
              required
            >
              <option value="">Select Team 1</option>
              {teams.map((team) => (
                <option key={team._id} value={team.name}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="vs-divider">VS</div>

          <div className="form-group">
            <label htmlFor="team2">Team 2:</label>
            <select
              id="team2"
              value={team2}
              onChange={(e) => setTeam2(e.target.value)}
              required
            >
              <option value="">Select Team 2</option>
              {teams.map((team) => (
                <option key={team._id} value={team.name}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row season-row">
          <div className="form-group">
            <label htmlFor="season">Season (Optional):</label>
            <select
              id="season"
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

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Loading...' : 'Compare Teams'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="head-to-head-result">
          <h2>Head-to-Head Results</h2>
          <div className="comparison-header">
            <h3>{result.team1} vs {result.team2}</h3>
          </div>
          
          <div className="stats-comparison">
            <div className="stat-item">
              <strong>Total Matches Between Teams:</strong> {result.totalMatchesBetween}
            </div>
            
            <div className="wins-comparison">
              <div className="team-wins">
                <div className="team-name">{result.team1}</div>
                <div className="wins-count">{result.winsTeam1} wins</div>
                <div className="win-percentage">
                  {result.totalMatchesBetween > 0 
                    ? ((result.winsTeam1 / result.totalMatchesBetween) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
              
              <div className="team-wins">
                <div className="team-name">{result.team2}</div>
                <div className="wins-count">{result.winsTeam2} wins</div>
                <div className="win-percentage">
                  {result.totalMatchesBetween > 0 
                    ? ((result.winsTeam2 / result.totalMatchesBetween) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
            </div>

            {result.tiesOrNoResult > 0 && (
              <div className="stat-item">
                <strong>Ties/No Result:</strong> {result.tiesOrNoResult}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeadToHead;
