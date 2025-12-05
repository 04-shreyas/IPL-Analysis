import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTeams } from '../api/apiClient';
import '../styles/Teams.css';

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teams = await getTeams();
        setTeams(teams && teams.data ? teams.data : teams || []);
      } catch (err) {
        setError('Failed to load teams');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) return <p>Loading teams...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="teams-page">
      <h1>IPL Teams</h1>
      
      {teams.length === 0 ? (
        <p>No teams found.</p>
      ) : (
        <div className="teams-grid">
          {teams.map((team) => (
            <Link
              key={team._id}
              to={`/teams/${encodeURIComponent(team.name)}`}
              className="team-card team-card-link"
            >
              <h3>{team.name}</h3>
              {team.shortName && <p className="team-short-name">{team.shortName}</p>}
              {team.city && <p className="team-city">City: {team.city}</p>}
              <div className="team-stats">
                <div className="stat">
                  <strong>Total Matches:</strong> {team.totalMatches || 0}
                </div>
                <div className="stat">
                  <strong>Total Wins:</strong> {team.totalWins || 0}
                </div>
                <div className="stat">
                  <strong>Win Rate:</strong> {
                    team.totalMatches > 0 
                      ? ((team.totalWins / team.totalMatches) * 100).toFixed(1)
                      : 0
                  }%
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Teams;
