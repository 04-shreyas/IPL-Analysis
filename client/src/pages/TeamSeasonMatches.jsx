import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTeamSeasonMatches } from '../api/apiClient';
import '../styles/TeamSeasonMatches.css';

const TeamSeasonMatches = () => {
  const { name, season } = useParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const matches = await getTeamSeasonMatches(name, season);
        setMatches(matches && matches.data ? matches.data : matches || []);
      } catch (err) {
        setError(`Failed to load matches for ${name} in ${season}`);
      } finally {
        setLoading(false);
      }
    };

    if (name && season) {
      fetchMatches();
    }
  }, [name, season]);

  const handleMatchClick = (matchId) => {
    navigate(`/matches/${matchId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatScore = (teamScore, teamName) => {
    if (!teamScore) return 'N/A';
    
    let scoreText = '';
    if (teamScore.innings1) {
      scoreText += `${teamScore.innings1.total}/${teamScore.innings1.wickets}`;
      if (teamScore.innings1.overs) {
        scoreText += ` (${teamScore.innings1.overs})`;
      }
    }
    if (teamScore.innings2) {
      if (scoreText) scoreText += ' & ';
      scoreText += `${teamScore.innings2.total}/${teamScore.innings2.wickets}`;
      if (teamScore.innings2.overs) {
        scoreText += ` (${teamScore.innings2.overs})`;
      }
    }
    
    return scoreText || 'N/A';
  };

  if (loading) return <div className="loading">Loading matches...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="team-season-matches-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="breadcrumb">
        <Link to="/teams">Teams</Link>
        <span> / </span>
        <Link to={`/teams/${encodeURIComponent(name)}`}>{name}</Link>
        <span> / </span>
        <span>IPL {season}</span>
      </div>

      <div className="page-header">
        <h1>{name} - IPL {season}</h1>
        <p className="matches-count">{matches.length} matches played</p>
      </div>

      {matches.length > 0 ? (
        <div className="matches-container">
          <div className="matches-table">
            <div className="table-header">
              <div className="col-date">Date</div>
              <div className="col-opponent">Opponent</div>
              <div className="col-venue">Venue</div>
              <div className="col-toss">Toss</div>
              <div className="col-score">Score</div>
              <div className="col-result">Result</div>
            </div>
            
            {matches.map((match) => (
              <div 
                key={match.matchId} 
                className="match-row"
                onClick={() => handleMatchClick(match.matchId)}
              >
                <div className="col-date">
                  {formatDate(match.date)}
                </div>
                
                <div className="col-opponent">
                  <span className="opponent-name">{match.opponent}</span>
                </div>
                
                <div className="col-venue">
                  <span className="venue-name" title={match.venue}>
                    {match.venue || 'N/A'}
                  </span>
                </div>
                
                <div className="col-toss">
                  {match.tossWinner && (
                    <div className="toss-info">
                      <div className="toss-winner">{match.tossWinner}</div>
                      <div className="toss-decision">
                        {match.tossDecision === 'bat' ? 'Bat' : 'Field'}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="col-score">
                  <div className="score-summary">
                    <div className="team-score">
                      <span className="team-name">{name}</span>
                      <span className="score">{formatScore(match.teamScore, name)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="col-result">
                  {match.winner ? (
                    <span className={`result ${match.winner.toLowerCase() === name.toLowerCase() ? 'won' : 'lost'}`}>
                      {match.winner.toLowerCase() === name.toLowerCase() ? 'Won' : 'Lost'}
                    </span>
                  ) : (
                    <span className="result no-result">
                      {match.result || 'No Result'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-matches">
          <p>No matches found for {name} in IPL {season}</p>
        </div>
      )}
    </div>
  );
};

export default TeamSeasonMatches;
