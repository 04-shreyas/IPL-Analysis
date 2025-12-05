import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTeam, getTeamSeasons } from '../api/apiClient';
import '../styles/TeamDetail.css';

const TeamDetail = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seasonsLoading, setSeasonsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const team = await getTeam(name);
        setTeam(team && team.data ? team.data : team);
      } catch (err) {
        setError(`Failed to load team details for ${name}`);
      } finally {
        setLoading(false);
      }
    };

    const fetchSeasons = async () => {
      try {
        const seasons = await getTeamSeasons(name);
        setSeasons(seasons && seasons.data ? seasons.data : seasons || []);
      } catch (err) {
        console.error('Failed to load team seasons:', err);
        setSeasons([]);
      } finally {
        setSeasonsLoading(false);
      }
    };

    if (name) {
      fetchTeam();
      fetchSeasons();
    }
  }, [name]);

  const handleSeasonClick = (season) => {
    navigate(`/teams/${encodeURIComponent(name)}/seasons/${season}`);
  };

  if (loading) return <p>Loading team details...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!team) return <p>Team not found.</p>;

  return (
    <div className="team-detail-page">
      <div className="breadcrumb">
        <Link to="/teams" className="back-button">← Back to Teams</Link>
      </div>

      <h1>{team.name}</h1>
      
      <div className="team-info">
        <div className="basic-info">
          <h2>Team Information</h2>
          {team.shortName && (
            <div className="info-item">
              <strong>Short Name:</strong> {team.shortName}
            </div>
          )}
          {team.city && (
            <div className="info-item">
              <strong>City:</strong> {team.city}
            </div>
          )}
          {team.homeVenue && (
            <div className="info-item">
              <strong>Home Venue:</strong> {team.homeVenue}
            </div>
          )}
        </div>

        <div className="performance-stats">
          <h2>Performance Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Matches</h3>
              <div className="stat-value">{team.totalMatches || 0}</div>
            </div>
            <div className="stat-card">
              <h3>Total Wins</h3>
              <div className="stat-value">{team.totalWins || 0}</div>
            </div>
            <div className="stat-card">
              <h3>Home Wins</h3>
              <div className="stat-value">{team.homeWins || 0}</div>
            </div>
            <div className="stat-card">
              <h3>Away Wins</h3>
              <div className="stat-value">{team.awayWins || 0}</div>
            </div>
            <div className="stat-card">
              <h3>Win Rate</h3>
              <div className="stat-value">
                {team.totalMatches > 0 
                  ? ((team.totalWins / team.totalMatches) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
            <div className="stat-card">
              <h3>Home Win Rate</h3>
              <div className="stat-value">
                {team.totalWins > 0 
                  ? ((team.homeWins / team.totalWins) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
          </div>
        </div>

        <div className="seasons-section">
          <h2>Season-wise Performance</h2>
          {seasonsLoading ? (
            <p>Loading seasons...</p>
          ) : seasons.length > 0 ? (
            <div className="seasons-grid">
              {seasons.map((season) => (
                <div 
                  key={season.season} 
                  className="season-card"
                  onClick={() => handleSeasonClick(season.season)}
                >
                  <div className="season-header">
                    <h3>IPL {season.season}</h3>
                  </div>
                  <div className="season-stats">
                    <div className="stat-row">
                      <span className="stat-label">Matches:</span>
                      <span className="stat-value">{season.matchesPlayed}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Wins:</span>
                      <span className="stat-value">{season.wins}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Losses:</span>
                      <span className="stat-value">{season.losses}</span>
                    </div>
                    {(season.ties > 0 || season.noResult > 0) && (
                      <div className="stat-row">
                        <span className="stat-label">Ties/NR:</span>
                        <span className="stat-value">{season.ties + season.noResult}</span>
                      </div>
                    )}
                    <div className="stat-row">
                      <span className="stat-label">Runs Scored:</span>
                      <span className="stat-value">{season.runsScored}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Avg Score:</span>
                      <span className="stat-value">{season.averageScore}</span>
                    </div>
                  </div>
                  <div className="season-footer">
                    <span className="click-hint">Click to view matches →</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No season data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamDetail;
