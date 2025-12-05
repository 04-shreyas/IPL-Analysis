import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getMilestones } from '../api/apiClient';
import '../styles/Milestones.css';

const Milestones = () => {
  const [milestones, setMilestones] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('batting');

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const milestones = await getMilestones();
        setMilestones(milestones && milestones.data ? milestones.data : milestones);
      } catch (err) {
        setError('Failed to load milestones data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMilestones();
  }, []);

  if (loading) return <div className="page-root Milestones-page"><p>Loading milestones...</p></div>;
  if (error) return <div className="page-root Milestones-page"><p className="error">{error}</p></div>;
  if (!milestones) return <div className="page-root Milestones-page"><p>No milestones data available</p></div>;

  return (
    <div className="page-root Milestones-page">
      <h1>IPL Milestones & Records</h1>
      <p>Explore the greatest achievements and record-breaking performances in IPL history.</p>

      <div className="milestone-tabs analytics-card">
        <button 
          className={`tab ${activeTab === 'batting' ? 'active' : ''}`}
          onClick={() => setActiveTab('batting')}
        >
          Batting Records
        </button>
        <button 
          className={`tab ${activeTab === 'bowling' ? 'active' : ''}`}
          onClick={() => setActiveTab('bowling')}
        >
          Bowling Records
        </button>
        <button 
          className={`tab ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          Team Records
        </button>
        <button 
          className={`tab ${activeTab === 'fielding' ? 'active' : ''}`}
          onClick={() => setActiveTab('fielding')}
        >
          Fielding Records
        </button>
      </div>

      <div className="milestones-content analytics-card">
        {activeTab === 'batting' && (
          <div className="records-section">
            <div className="record-category">
              <h3>Fastest Fifties</h3>
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Balls</th>
                      <th>Match</th>
                      <th>Season</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.fastestFifties?.map((record, index) => (
                      <tr key={index}>
                        <td>{record.player}</td>
                        <td>{record.balls}</td>
                        <td>{record.match}</td>
                        <td>{record.season}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="record-category">
              <h3>Fastest Hundreds</h3>
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Balls</th>
                      <th>Match</th>
                      <th>Season</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.fastestHundreds?.map((record, index) => (
                      <tr key={index}>
                        <td>{record.player}</td>
                        <td>{record.balls}</td>
                        <td>{record.match}</td>
                        <td>{record.season}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="record-category">
              <h3>Highest Individual Scores</h3>
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Runs</th>
                      <th>Balls</th>
                      <th>Match</th>
                      <th>Season</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.highestScores?.map((record, index) => (
                      <tr key={index}>
                        <td>{record.player}</td>
                        <td>{record.runs}</td>
                        <td>{record.balls}</td>
                        <td>{record.match}</td>
                        <td>{record.season}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="record-category">
              <h3>Most Sixes in a Match</h3>
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Sixes</th>
                      <th>Runs</th>
                      <th>Match</th>
                      <th>Season</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.mostSixesInMatch?.map((record, index) => (
                      <tr key={index}>
                        <td>{record.player}</td>
                        <td>{record.sixes}</td>
                        <td>{record.runs}</td>
                        <td>{record.match}</td>
                        <td>{record.season}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bowling' && (
          <div className="records-section">
            <div className="record-category">
              <h3>Best Bowling Figures</h3>
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Figures</th>
                      <th>Overs</th>
                      <th>Economy</th>
                      <th>Match</th>
                      <th>Season</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.bestBowlingFigures?.map((record, index) => (
                      <tr key={index}>
                        <td>{record.player}</td>
                        <td>{record.figures}</td>
                        <td>{record.overs}</td>
                        <td>{record.economy}</td>
                        <td>{record.match}</td>
                        <td>{record.season}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="record-category">
              <h3>Most Economical Spells</h3>
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Overs</th>
                      <th>Economy</th>
                      <th>Match</th>
                      <th>Season</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.mostEconomicalSpells?.map((record, index) => (
                      <tr key={index}>
                        <td>{record.player}</td>
                        <td>{record.overs}</td>
                        <td>{record.economy}</td>
                        <td>{record.match}</td>
                        <td>{record.season}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {milestones.hatTricks && milestones.hatTricks.length > 0 && (
              <div className="record-category">
                <h3>Hat-tricks</h3>
                <div className="records-table-wrapper">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Match</th>
                        <th>Season</th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.hatTricks.map((record, index) => (
                        <tr key={index}>
                          <td>{record.player}</td>
                          <td>{record.match}</td>
                          <td>{record.season}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="records-section">
            <div className="record-category">
              <h3>Highest Team Totals</h3>
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Runs</th>
                      <th>Wickets</th>
                      <th>Overs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.highestTeamTotals?.map((record, index) => (
                      <tr key={index}>
                        <td>{record.team}</td>
                        <td>{record.runs}</td>
                        <td>{record.wickets}</td>
                        <td>{record.overs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="record-category">
              <h3>Successful Chases</h3>
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Runs</th>
                      <th>Wickets</th>
                      <th>Overs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.successfulChases?.map((record, index) => (
                      <tr key={index}>
                        <td>{record.team}</td>
                        <td>{record.runs}</td>
                        <td>{record.wickets}</td>
                        <td>{record.overs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {milestones.lowestDefended && milestones.lowestDefended.length > 0 && (
              <div className="record-category">
                <h3>Lowest Defended Totals</h3>
                <div className="records-table-wrapper">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>Record Type</th>
                        <th>Team</th>
                        <th>Total</th>
                        <th>Opponent</th>
                        <th>Venue</th>
                        <th>Season</th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.lowestDefended.map((record, index) => (
                        <tr key={index}>
                          <td>Lowest Defended Total</td>
                          <td>{record.team}</td>
                          <td>{record.total}</td>
                          <td>{record.opponent}</td>
                          <td>{record.venue}</td>
                          <td>{record.season}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'fielding' && (
          <div className="records-section">
            <div className="record-category">
              <h3>Most Catches (Fielder)</h3>
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Record Type</th>
                      <th>Fielder</th>
                      <th>Dismissals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.mostCatches?.map((record, index) => (
                      <tr key={index}>
                        <td>Most Catches</td>
                        <td>{record.player}</td>
                        <td>{record.dismissals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="record-category">
              <h3>Most Run Outs (Fielder)</h3>
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Record Type</th>
                      <th>Fielder</th>
                      <th>Dismissals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.mostRunOuts?.map((record, index) => (
                      <tr key={index}>
                        <td>Most Run Outs</td>
                        <td>{record.player}</td>
                        <td>{record.dismissals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Milestones;
