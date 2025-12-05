import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getAllVenues, getVenueStats, getVenueMetrics } from '../api/apiClient';
import '../styles/VenueAnalytics.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const VenueAnalytics = () => {
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [venueStats, setVenueStats] = useState(null);
  const [venueMetrics, setVenueMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const venues = await getAllVenues();
        setVenues(venues && venues.data ? venues.data : venues || []);
      } catch (err) {
        console.error('Failed to load venues:', err);
      }
    };
    fetchVenues();
  }, []);

  const filteredVenues = venues.filter((venue) =>
    venue.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchVenueData = async (venue, season) => {
    if (!venue) return;

    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (season) params.season = season;

      const [stats, metrics] = await Promise.all([
        getVenueStats(venue),
        getVenueMetrics(venue, params)
      ]);

      setVenueStats(stats && stats.data ? stats.data : stats);
      setVenueMetrics(metrics && metrics.data ? metrics.data : metrics);
    } catch (err) {
      setError('Failed to load venue statistics');
      setVenueStats(null);
      setVenueMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVenueSelect = async (venue) => {
    if (!venue) return;
    setSelectedVenue(venue);
    fetchVenueData(venue, selectedSeason);
  };

  const handleSeasonChange = async (season) => {
    setSelectedSeason(season);
    if (selectedVenue) {
      fetchVenueData(selectedVenue, season);
    }
  };

  return (
    <div className="page-root VenueAnalytics-page">
      <h1>Venue Analytics</h1>
      <p>Analyze venue characteristics including scoring patterns, toss impact, and team performance.</p>

      <div className="venue-selector analytics-card">
        <label htmlFor="venueSearch">Search Venue:</label>
        <input
          id="venueSearch"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type venue name..."
        />

        {searchTerm && filteredVenues.length > 0 && (
          <ul className="venue-analytics-suggestions">
            {filteredVenues.slice(0, 20).map((venue, index) => (
              <li
                key={index}
                onClick={() => {
                  setSearchTerm(venue);
                  handleVenueSelect(venue);
                }}
              >
                {venue}
              </li>
            ))}
          </ul>
        )}

        <div className="season-filter">
          <label htmlFor="venueSeason">Season (Optional):</label>
          <select
            id="venueSeason"
            value={selectedSeason}
            onChange={(e) => handleSeasonChange(e.target.value)}
          >
            <option value="">All Seasons</option>
            {Array.from({ length: 2019 - 2008 + 1 }, (_, i) => 2008 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p>Loading venue statistics...</p>}
      {error && <p className="error">{error}</p>}

      {venueStats && (
        <div className="venue-stats-container">
          <div className="stats-overview analytics-card">
            <h2>{venueStats.venueName} - Statistics</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Matches Played</h3>
                <div className="stat-value">{venueStats.totalMatches || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Avg 1st Innings Score</h3>
                <div className="stat-value">{venueStats.avgFirstInningsScore || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Batting First Win %</h3>
                <div className="stat-value">
                  {venueStats.battingFirstWinPercentage || 0}%
                </div>
              </div>
              <div className="stat-card">
                <h3>Chasing Win %</h3>
                <div className="stat-value">
                  {venueStats.chasingWinPercentage || 0}%
                </div>
              </div>
              <div className="stat-card">
                <h3>Toss Win = Match Win</h3>
                <div className="stat-value">
                  {venueStats.tossWinMatchWinPercentage || 0}%
                </div>
              </div>
              <div className="stat-card">
                <h3>Highest Score</h3>
                <div className="stat-value">{venueStats.highestScore || 0}</div>
              </div>
            </div>
          </div>

          {venueStats.tossDecisionImpact && (
            <div className="charts-section chart-container">
              <h3>Toss Decision Impact</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={venueStats.tossDecisionImpact}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, value}) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {venueStats.tossDecisionImpact.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {venueStats.bestTeamsAtVenue && venueStats.bestTeamsAtVenue.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Best Performing Teams at Venue</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={venueStats.bestTeamsAtVenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="team" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="winPercentage" fill="#8884d8" name="Win %" />
                  <Bar dataKey="matches" fill="#82ca9d" name="Matches" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {venueMetrics && (
            <>
              <div className="charts-section analytics-card">
                <h3>Average Innings Scores (Selected Season)</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>1st Innings Average</h3>
                    <div className="stat-value">{venueMetrics.avgFirstInnings}</div>
                  </div>
                  <div className="stat-card">
                    <h3>2nd Innings Average</h3>
                    <div className="stat-value">{venueMetrics.avgSecondInnings}</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={[
                    { innings: '1st Innings', score: venueMetrics.avgFirstInnings },
                    { innings: '2nd Innings', score: venueMetrics.avgSecondInnings }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="innings" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="charts-section analytics-card">
                <h3>Bat First vs Chase Win % (Selected Season)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={[
                    { name: 'Bat First Wins', value: (venueMetrics.winPctBatFirst * 100).toFixed(1) },
                    { name: 'Chase Wins', value: (venueMetrics.winPctChase * 100).toFixed(1) }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Win %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#34d399" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {venueMetrics.topTeams && venueMetrics.topTeams.length > 0 && (
                <div className="charts-section analytics-card">
                  <h3>Top Teams at this Venue (Selected Season)</h3>
                  <div className="top-list">
                    {venueMetrics.topTeams.map((team, index) => (
                      <div key={team.team} className="top-item">
                        <span className="rank">#{index + 1}</span>
                        <span className="name">{team.team}</span>
                        <span className="value">{team.wins} wins</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {venueMetrics.topBatsmen && venueMetrics.topBatsmen.length > 0 && (
                <div className="charts-section analytics-card">
                  <h3>Top Run Scorers at this Venue (Selected Season)</h3>
                  <div className="top-list">
                    {venueMetrics.topBatsmen.map((batsman, index) => (
                      <div key={batsman.player} className="top-item">
                        <span className="rank">#{index + 1}</span>
                        <span className="name">{batsman.player}</span>
                        <span className="value">{batsman.runs} runs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {venueMetrics.topBowlers && venueMetrics.topBowlers.length > 0 && (
                <div className="charts-section analytics-card">
                  <h3>Top Bowlers at this Venue (Selected Season)</h3>
                  <div className="top-list">
                    {venueMetrics.topBowlers.map((bowler, index) => (
                      <div key={bowler.player} className="top-item">
                        <span className="rank">#{index + 1}</span>
                        <span className="name">{bowler.player}</span>
                        <span className="value">{bowler.wickets} wkts @ {bowler.economy}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VenueAnalytics;
