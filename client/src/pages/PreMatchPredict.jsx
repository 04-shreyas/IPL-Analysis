import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeams, getAllVenues, predictMatchWinner } from '../api/apiClient';
import '../styles/PreMatchPredict.css';

const PreMatchPredict = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [venues, setVenues] = useState([]);
  const [formData, setFormData] = useState({
    team1: '',
    team2: '',
    venue: '',
    tossWinner: '',
    tossDecision: '',
    season: 2019
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [teams, venues] = await Promise.all([
          getTeams(),
          getAllVenues()
        ]);

        setTeams(teams && teams.data ? teams.data : teams || []);
        setVenues(venues && venues.data ? venues.data : venues || []);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };

    fetchInitialData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.team1 || !formData.team2) {
      setError('Please select both teams');
      return;
    }

    if (formData.team1 === formData.team2) {
      setError('Please select different teams');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await predictMatchWinner({
        team1: formData.team1,
        team2: formData.team2,
        venue: formData.venue,
        tossWinner: formData.tossWinner,
        tossDecision: formData.tossDecision,
        season: parseInt(formData.season)
      });
      setResult(response);
    } catch (err) {
      setError('Failed to get match prediction. Please ensure the ML service is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pre-match-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h1>Pre-Match Winner Prediction</h1>
      <p>Predict the winner of an upcoming IPL match based on pre-match conditions.</p>
      
      <form onSubmit={handleSubmit} className="prediction-form">
        <div className="form-group">
          <label htmlFor="team1">Team 1:</label>
          <select
            id="team1"
            name="team1"
            value={formData.team1}
            onChange={handleInputChange}
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

        <div className="form-group">
          <label htmlFor="team2">Team 2:</label>
          <select
            id="team2"
            name="team2"
            value={formData.team2}
            onChange={handleInputChange}
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

        <div className="form-group">
          <label htmlFor="venue">Venue:</label>
          <select
            id="venue"
            name="venue"
            value={formData.venue}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Venue</option>
            {venues.map((venue) => (
              <option key={venue} value={venue}>
                {venue}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tossWinner">Toss Winner:</label>
          <select
            id="tossWinner"
            name="tossWinner"
            value={formData.tossWinner}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Toss Winner</option>
            {formData.team1 && <option value={formData.team1}>{formData.team1}</option>}
            {formData.team2 && <option value={formData.team2}>{formData.team2}</option>}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tossDecision">Toss Decision:</label>
          <select
            id="tossDecision"
            name="tossDecision"
            value={formData.tossDecision}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Decision</option>
            <option value="bat">Bat First</option>
            <option value="field">Field First</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="season">Season (2008-2019):</label>
          <select
            id="season"
            name="season"
            value={formData.season}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Season</option>
            {Array.from({ length: 12 }, (_, i) => 2008 + i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Predicting...' : 'Predict Winner'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="prediction-result">
          <h2>Prediction Results</h2>
          <div className="prediction-summary">
            <div className="predicted-winner">
              <strong>Predicted Winner:</strong> {result.prediction}
            </div>
            <div className="confidence">
              <strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%
            </div>
          </div>
          
          <div className="probability-breakdown">
            <h3>Win Probabilities</h3>
            <div className="prob-item">
              <span className="team-name">{formData.team1}:</span>
              <span className="probability">{(result.team1_win_prob * 100).toFixed(1)}%</span>
            </div>
            <div className="prob-item">
              <span className="team-name">{formData.team2}:</span>
              <span className="probability">{(result.team2_win_prob * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreMatchPredict;
