import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAllUmpires, getUmpireStats } from '../api/apiClient';
import '../styles/UmpireStats.css';

const UmpireStats = () => {
  const [umpires, setUmpires] = useState([]);
  const [selectedUmpire, setSelectedUmpire] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [umpireStats, setUmpireStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUmpires = async () => {
      try {
        const umpires = await getAllUmpires();
        setUmpires(umpires && umpires.data ? umpires.data : umpires || []);
      } catch (err) {
        console.error('Failed to load umpires:', err);
      }
    };
    fetchUmpires();
  }, []);

  const filteredUmpires = umpires.filter((umpire) =>
    umpire.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUmpireSelect = async (umpireId) => {
    if (!umpireId) return;
    
    setSelectedUmpire(umpireId);
    setLoading(true);
    setError(null);
    
    try {
      const stats = await getUmpireStats(umpireId);
      setUmpireStats(stats && stats.data ? stats.data : stats);
    } catch (err) {
      setError('Failed to load umpire statistics');
      setUmpireStats(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-root UmpireStats-page">
      <h1>Umpire Statistics</h1>
      <p>Analyze umpire performance including matches officiated, venues, and team encounters.</p>

      <div className="umpire-selector analytics-card">
        <div className="umpire-search-block">
          <label htmlFor="umpireSearch">Search Umpire:</label>
          <input
            id="umpireSearch"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type umpire name..."
          />

          {searchTerm && filteredUmpires.length > 0 && (
            <ul className="umpire-suggestions">
              {filteredUmpires.slice(0, 20).map((umpire) => (
                <li
                  key={umpire._id}
                  onClick={() => {
                    setSearchTerm(umpire.name);
                    setSelectedUmpire(umpire._id);
                    handleUmpireSelect(umpire._id);
                  }}
                >
                  {umpire.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {loading && <p>Loading umpire statistics...</p>}
      {error && <p className="error">{error}</p>}

      {umpireStats && (
        <div className="umpire-stats-container">
          <div className="stats-overview analytics-card">
            <h2>{umpireStats.umpireName} - Career Statistics</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Matches</h3>
                <div className="stat-value">{umpireStats.totalMatches || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Finals Officiated</h3>
                <div className="stat-value">{umpireStats.finalsOfficiated || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Seasons Active</h3>
                <div className="stat-value">{umpireStats.seasonsActive || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Most Frequent Venue</h3>
                <div className="stat-value">{umpireStats.mostFrequentVenue || 'N/A'}</div>
              </div>
              <div className="stat-card">
                <h3>Teams Encountered</h3>
                <div className="stat-value">{umpireStats.teamsEncountered || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Career Span</h3>
                <div className="stat-value">{umpireStats.careerSpan || 'N/A'}</div>
              </div>
            </div>
          </div>

          {umpireStats.venueFrequency && umpireStats.venueFrequency.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Most Frequent Venues</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={umpireStats.venueFrequency.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="venue" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="matches" fill="#8884d8" name="Matches" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {umpireStats.teamEncounters && umpireStats.teamEncounters.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Teams Most Seen</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={umpireStats.teamEncounters}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="team" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="matches" fill="#82ca9d" name="Matches" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {umpireStats.seasonActivity && umpireStats.seasonActivity.length > 0 && (
            <div className="charts-section chart-container">
              <h3>Activity by Season</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={umpireStats.seasonActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="season" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="matches" fill="#ffc658" name="Matches" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UmpireStats;
