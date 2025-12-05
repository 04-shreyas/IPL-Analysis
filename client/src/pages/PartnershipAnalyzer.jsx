import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getTeams, getPartnerships } from '../api/apiClient';
import '../styles/PartnershipAnalyzer.css';

const PartnershipAnalyzer = () => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [partnerships, setPartnerships] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [partnershipType, setPartnershipType] = useState('all');

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

  const handleTeamSelect = async (teamName) => {
    if (!teamName) return;
    
    setSelectedTeam(teamName);
    setLoading(true);
    setError(null);
    
    try {
      const partnerships = await getPartnerships(teamName);
      setPartnerships(partnerships && partnerships.data ? partnerships.data : partnerships);
    } catch (err) {
      setError('Failed to load partnership data');
      setPartnerships(null);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPartnerships = () => {
    if (!partnerships) return [];
    
    switch (partnershipType) {
      case 'opening':
        return partnerships.openingPartnerships || [];
      case 'middle':
        return partnerships.middleOrderPartnerships || [];
      case 'finishing':
        return partnerships.finishingPartnerships || [];
      default:
        return partnerships.topPartnerships || [];
    }
  };

  return (
    <div className="page-root PartnershipAnalyzer-page">
      <h1>Partnership Analyzer</h1>
      <p>Analyze batting partnerships including runs scored together and partnership statistics.</p>

      <div className="partnership-controls analytics-card">
        <div className="team-selector">
          <label htmlFor="teamSelect">Select Team:</label>
          <select
            id="teamSelect"
            value={selectedTeam}
            onChange={(e) => handleTeamSelect(e.target.value)}
          >
            <option value="">Choose a team...</option>
            {teams.map((team) => (
              <option key={team._id} value={team.name}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {partnerships && (
          <div className="partnership-type-selector">
            <label htmlFor="typeSelect">Partnership Type:</label>
            <select
              id="typeSelect"
              value={partnershipType}
              onChange={(e) => setPartnershipType(e.target.value)}
            >
              <option value="all">All Partnerships</option>
              <option value="opening">Opening Partnerships</option>
              <option value="middle">Middle Order</option>
              <option value="finishing">Finishing Partnerships</option>
            </select>
          </div>
        )}
      </div>

      {loading && <p>Loading partnership data...</p>}
      {error && <p className="error">{error}</p>}

      {partnerships && (
        <div className="partnerships-container">
          <div className="partnerships-overview analytics-card">
            <h2>{selectedTeam} - Partnership Statistics</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Partnerships</h3>
                <div className="stat-value">{partnerships.totalPartnerships || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Highest Partnership</h3>
                <div className="stat-value">{partnerships.highestPartnership?.runs || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Average Partnership</h3>
                <div className="stat-value">{partnerships.averagePartnership || 0}</div>
              </div>
              <div className="stat-card">
                <h3>100+ Partnerships</h3>
                <div className="stat-value">{partnerships.centuryPartnerships || 0}</div>
              </div>
            </div>
          </div>

          <div className="partnerships-list analytics-card">
            <h3>Top {partnershipType === 'all' ? '' : partnershipType.charAt(0).toUpperCase() + partnershipType.slice(1)} Partnerships</h3>
            <div className="partnerships-table-wrapper">
              <table className="partnerships-table">
                <thead>
                  <tr>
                    <th>Players</th>
                    <th>Runs</th>
                    <th>Balls</th>
                    <th>Strike Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredPartnerships().slice(0, 20).map((partnership, index) => (
                    <tr key={index}>
                      <td>{partnership.player1} &amp; {partnership.player2}</td>
                      <td>{partnership.runs}</td>
                      <td>{partnership.balls}</td>
                      <td>{partnership.balls > 0 ? ((partnership.runs / partnership.balls) * 100).toFixed(2) : '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {getFilteredPartnerships().length > 0 && (
            <div className="charts-section chart-container">
              <h3>Partnership Runs Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getFilteredPartnerships().slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={(entry) => `${entry.player1.split(' ')[0]} & ${entry.player2.split(' ')[0]}`}
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [value, name]}
                    labelFormatter={(label) => `Partnership: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="runs" fill="#8884d8" name="Runs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PartnershipAnalyzer;
