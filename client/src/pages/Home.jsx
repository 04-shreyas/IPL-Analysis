import React, { useState, useEffect } from 'react';
import { getSummaryStats } from '../api/apiClient';
import '../styles/Home.css';

const Home = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const summary = await getSummaryStats();
        // Backend returns { success: true, data: { ... } }, API client returns response.data
        setStats(summary && summary.data ? summary.data : summary);
      } catch (err) {
        setError('Failed to load summary statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="home-page">
      <h1>IPL Analytics Platform</h1>
      <p>Your one-stop destination for IPL statistics, analysis, and predictions.</p>

      {loading && <p>Loading statistics...</p>}
      {error && <p className="error">{error}</p>}

      {stats && (() => {
        const matchesPerSeason = stats.matchesPerSeason || {};
        const winsPerTeam = stats.winsPerTeam || {};
        return (
          <div className="stats-section">
            <h2>Tournament Summary</h2>

            <div className="home-stats-grid">
              <div className="home-stat-card">
                <h3>Total Matches</h3>
                <p className="home-stat-value">{stats.totalMatches}</p>
              </div>

              <div className="home-stat-card">
                <h3>Matches Per Season</h3>
                <div className="home-stat-list">
                  {Object.entries(matchesPerSeason).map(([season, count]) => (
                    <div key={season} className="home-stat-row">
                      <span className="home-stat-label">Season {season}</span>
                      <span className="home-stat-number">{count} matches</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="home-stat-card">
                <h3>Top Team Wins</h3>
                <div className="home-stat-list">
                  {Object.entries(winsPerTeam)
                    .sort(([, a], [, b]) => b - a)
                    .map(([team, wins]) => (
                      <div key={team} className="home-stat-row">
                        <span className="home-stat-label">{team}</span>
                        <span className="home-stat-number">{wins} wins</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Home;
