import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getSeasonSummary } from '../api/apiClient';
import { iplWinners } from '../data/iplWinners';
import '../styles/SeasonSummary.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const SeasonSummary = () => {
  const [selectedSeason, setSelectedSeason] = useState('2019');
  const [seasonData, setSeasonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate seasons only for available data range 2008-2019
  const seasons = [];
  const startSeason = 2008;
  const endSeason = 2019;
  for (let year = startSeason; year <= endSeason; year++) {
    seasons.push(year.toString());
  }

  useEffect(() => {
    if (selectedSeason) {
      handleSeasonSelect(selectedSeason);
    }
  }, []);

  const handleSeasonSelect = async (season) => {
    if (!season) return;
    
    setSelectedSeason(season);
    setLoading(true);
    setError(null);
    
    try {
      const seasonData = await getSeasonSummary(season);
      const seasonNum = parseInt(season, 10);
      const winnerEntry = iplWinners.find((w) => w.season === seasonNum);
      const data = seasonData && seasonData.data ? seasonData.data : seasonData;
      const champion = winnerEntry ? winnerEntry.winner : data.champion;

      setSeasonData({
        ...data,
        champion,
      });
    } catch (err) {
      setError('Failed to load season summary');
      setSeasonData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-root SeasonSummary-page">
      <h1>Season Summary Dashboard</h1>
      <p>Comprehensive analysis of IPL season performance, records, and statistics.</p>

      <div className="season-selector analytics-card">
        <label htmlFor="seasonSelect">Select Season:</label>
        <select
          id="seasonSelect"
          value={selectedSeason}
          onChange={(e) => handleSeasonSelect(e.target.value)}
        >
          <option value="">Choose a season...</option>
          {seasons.map((season) => (
            <option key={season} value={season}>
              IPL {season}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading season summary...</p>}
      {error && <p className="error">{error}</p>}

      {seasonData && (
        <div className="season-stats-container">
          <div className="season-overview analytics-card">
            <h2>IPL {selectedSeason} - Season Overview</h2>
            
            <div className="overview-stats">
              <div className="stat-card">
                <h3>Total Matches</h3>
                <div className="stat-value">{seasonData.totalMatches || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Total Runs</h3>
                <div className="stat-value">{seasonData.totalRuns || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Total Wickets</h3>
                <div className="stat-value">{seasonData.totalWickets || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Highest Total</h3>
                <div className="stat-value">{seasonData.highestTotal || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Best Chase</h3>
                <div className="stat-value">{seasonData.bestChase || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Champion</h3>
                <div className="stat-value">{seasonData.champion || 'TBD'}</div>
              </div>
            </div>
          </div>

          {seasonData.topRunScorers && seasonData.topRunScorers.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Top Run Scorers</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={seasonData.topRunScorers.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="player" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="runs" fill="#8884d8" name="Runs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {seasonData.topWicketTakers && seasonData.topWicketTakers.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Top Wicket Takers</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={seasonData.topWicketTakers.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="player" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="wickets" fill="#82ca9d" name="Wickets" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {seasonData.teamWinPercentages && seasonData.teamWinPercentages.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Team Win Percentages</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={seasonData.teamWinPercentages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="team" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="winPercentage" fill="#ffc658" name="Win %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {seasonData.venueDistribution && (
            <div className="charts-section chart-container">
              <h3>Matches by Venue</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={seasonData.venueDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, value}) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="matches"
                  >
                    {seasonData.venueDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeasonSummary;
