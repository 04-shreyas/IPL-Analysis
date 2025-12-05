import React, { useState, useEffect } from 'react';
import { getTeams, getAllVenues, predictScore } from '../api/apiClient';
import '../styles/ScorePredict.css';

const ScorePredict = () => {
  const [teams, setTeams] = useState([]);
  const [venues, setVenues] = useState([]);
  const [formData, setFormData] = useState({
    battingTeam: '',
    bowlingTeam: '',
    venue: '',
    season: 2019,
    currentRuns: 0,
    wickets: 0,
    overs: 0
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
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number'
        ? (value === '' ? '' : parseFloat(value) || 0)
        : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.battingTeam || !formData.bowlingTeam) {
      setError('Please select both batting and bowling teams');
      return;
    }

    if (formData.battingTeam === formData.bowlingTeam) {
      setError('Batting and bowling teams must be different');
      return;
    }

    if (formData.wickets < 0 || formData.wickets > 10) {
      setError('Wickets must be between 0 and 10');
      return;
    }

    if (formData.overs < 0 || formData.overs > 20) {
      setError('Overs must be between 0 and 20');
      return;
    }

    if (formData.currentRuns < 0) {
      setError('Current runs cannot be negative');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await predictScore({
        battingTeam: formData.battingTeam,
        bowlingTeam: formData.bowlingTeam,
        venue: formData.venue,
        season: parseInt(formData.season),
        currentRuns: parseInt(formData.currentRuns),
        wickets: parseInt(formData.wickets),
        overs: parseFloat(formData.overs)
      });
      setResult(response);
    } catch (err) {
      setError('Failed to get score prediction. Please ensure the ML service is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="score-page">
      <h1>In-Match Score Prediction</h1>
      <p>Predict the final first innings score based on current match state.</p>
      
      <form onSubmit={handleSubmit} className="prediction-form">
        <div className="form-group">
          <label htmlFor="battingTeam">Batting Team:</label>
          <select
            id="battingTeam"
            name="battingTeam"
            value={formData.battingTeam}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Batting Team</option>
            {teams.map((team) => (
              <option key={team._id} value={team.name}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="bowlingTeam">Bowling Team:</label>
          <select
            id="bowlingTeam"
            name="bowlingTeam"
            value={formData.bowlingTeam}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Bowling Team</option>
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
          <label htmlFor="season">Season (2008-2019):</label>
          <input
            type="number"
            id="season"
            name="season"
            value={formData.season}
            onChange={handleInputChange}
            min="2008"
            max="2019"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="currentRuns">Current Runs:</label>
            <input
              type="number"
              id="currentRuns"
              name="currentRuns"
              value={formData.currentRuns}
              onChange={handleInputChange}
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="wickets">Wickets Lost:</label>
            <input
              type="number"
              id="wickets"
              name="wickets"
              value={formData.wickets}
              onChange={handleInputChange}
              min="0"
              max="10"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="overs">Overs Completed:</label>
            <input
              type="number"
              id="overs"
              name="overs"
              value={formData.overs}
              onChange={handleInputChange}
              min="0"
              max="20"
              step="0.1"
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Predicting...' : 'Predict Final Score'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="prediction-result">
          <h2>Score Prediction</h2>
          
          <div className="main-prediction">
            <div className="predicted-score">
              <h3>Predicted Final Score</h3>
              <div className="score-value">{Math.round(result.predicted_score)}</div>
            </div>
          </div>

          <div className="prediction-details">
            <h3>Match Analysis</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <strong>Current Score:</strong> {result.current_runs}/{formData.wickets}
              </div>
              <div className="detail-item">
                <strong>Additional Runs Needed:</strong> {Math.round(result.additional_runs_needed)}
              </div>
              <div className="detail-item">
                <strong>Current Run Rate:</strong> {result.current_run_rate.toFixed(2)}
              </div>
              <div className="detail-item">
                <strong>Required Run Rate:</strong> {result.required_run_rate.toFixed(2)}
              </div>
              <div className="detail-item">
                <strong>Wickets in Hand:</strong> {result.wickets_in_hand}
              </div>
              <div className="detail-item">
                <strong>Overs Remaining:</strong> {result.overs_remaining.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScorePredict;
