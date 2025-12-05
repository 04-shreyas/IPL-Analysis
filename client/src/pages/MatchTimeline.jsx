import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getMatchDetails, getMatchDeliveries, getMatchOverStats } from '../api/apiClient';
import MatchOverCharts from '../components/MatchOverCharts';
import '../styles/MatchTimeline.css';

const MatchTimeline = () => {
  const { id } = useParams();
  const [timelineData, setTimelineData] = useState([]);
  const [wicketsData, setWicketsData] = useState([]);
  const [matchInfo, setMatchInfo] = useState(null);
  const [overStatsData, setOverStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInnings, setSelectedInnings] = useState('both');
  const [viewMode, setViewMode] = useState('legacy'); // 'legacy' or 'advanced'

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const [matchResponse, deliveriesResponse, overStatsResponse] = await Promise.all([
          getMatchDetails(id),
          getMatchDeliveries(id, { limit: 5000 }),
          getMatchOverStats(id).catch(() => null) // Gracefully handle if endpoint fails
        ]);
        
        setMatchInfo(matchResponse);
        
        // Process deliveries into timeline data
        const processedData = processDeliveriesForTimeline(deliveriesResponse.data || []);
        setTimelineData(processedData.timeline);
        setWicketsData(processedData.wickets);
        
        // Set over stats data if available
        if (overStatsResponse) {
          setOverStatsData(overStatsResponse);
        }
        
      } catch (err) {
        setError('Failed to load match timeline data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const processDeliveriesForTimeline = (deliveries) => {
    const timeline = [];
    const wickets = [];
    const overData = {};
    
    // Group deliveries by inning and over
    deliveries.forEach(delivery => {
      const inning = delivery.inning;
      const over = delivery.over;
      const totalRuns = delivery.totalRuns || delivery.total_runs || 0;
      const batsmanRuns = delivery.batsmanRuns || delivery.batsman_runs || 0;
      
      const key = `${inning}-${over}`;
      
      if (!overData[key]) {
        overData[key] = {
          inning,
          over,
          runs: 0,
          cumulativeRuns: 0,
          wickets: 0
        };
      }
      
      overData[key].runs += totalRuns;
      
      // Track wickets
      if (delivery.player_dismissed) {
        overData[key].wickets++;
        wickets.push({
          inning,
          over: delivery.over,
          ball: delivery.ball,
          player: delivery.player_dismissed,
          overBall: `${delivery.over}.${delivery.ball}`
        });
      }
    });
    
    // Convert to timeline format and calculate cumulative runs
    const sortedOvers = Object.values(overData).sort((a, b) => {
      if (a.inning !== b.inning) return a.inning - b.inning;
      return a.over - b.over;
    });
    
    let inning1Cumulative = 0;
    let inning2Cumulative = 0;
    
    sortedOvers.forEach(overData => {
      if (overData.inning === 1) {
        inning1Cumulative += overData.runs;
        timeline.push({
          over: overData.over,
          inning1Runs: overData.runs,
          inning1Cumulative,
          inning2Runs: 0,
          inning2Cumulative: 0,
          wickets: overData.wickets
        });
      } else {
        inning2Cumulative += overData.runs;
        // Find existing entry or create new one
        let existingEntry = timeline.find(entry => entry.over === overData.over);
        if (existingEntry) {
          existingEntry.inning2Runs = overData.runs;
          existingEntry.inning2Cumulative = inning2Cumulative;
          existingEntry.wickets += overData.wickets;
        } else {
          timeline.push({
            over: overData.over,
            inning1Runs: 0,
            inning1Cumulative: inning1Cumulative,
            inning2Runs: overData.runs,
            inning2Cumulative,
            wickets: overData.wickets
          });
        }
      }
    });
    
    return { timeline: timeline.sort((a, b) => a.over - b.over), wickets };
  };

  const getFilteredData = () => {
    if (!timelineData) return [];
    
    switch (selectedInnings) {
      case 'first':
        return timelineData.map(d => ({
          over: d.over,
          runs: d.inning1Runs,
          cumulative: d.inning1Cumulative,
          wickets: d.wickets
        }));
      case 'second':
        return timelineData.map(d => ({
          over: d.over,
          runs: d.inning2Runs,
          cumulative: d.inning2Cumulative,
          wickets: d.wickets
        }));
      case 'both':
      default:
        return timelineData;
    }
  };

  if (loading) return <div className="match-timeline-page"><p>Loading match timeline...</p></div>;
  if (error) return <div className="match-timeline-page"><p className="error">{error}</p></div>;
  if (!timelineData.length) return <div className="match-timeline-page"><p>No timeline data available</p></div>;

  const filteredData = getFilteredData();

  return (
    <div className="match-timeline-page">
      <div className="breadcrumb">
        <Link to={`/matches/${id}`}>← Back to Match Details</Link>
      </div>
      
      <h1>Match Timeline & Momentum</h1>
      
      {matchInfo && (
        <div className="match-header analytics-card">
          <h2>{matchInfo.match?.team1} vs {matchInfo.match?.team2}</h2>
          <p>{matchInfo.match?.venue} • {new Date(matchInfo.match?.date).toLocaleDateString()}</p>
          <p><strong>Winner:</strong> {matchInfo.match?.winner}</p>
        </div>
      )}

      <div className="timeline-controls analytics-card">
        <div className="control-group">
          <label htmlFor="inningsSelect">Show Innings:</label>
          <select
            id="inningsSelect"
            value={selectedInnings}
            onChange={(e) => setSelectedInnings(e.target.value)}
          >
            <option value="both">Both Innings</option>
            <option value="first">First Innings Only</option>
            <option value="second">Second Innings Only</option>
          </select>
        </div>

        {overStatsData && (
          <div className="control-group">
            <label htmlFor="viewMode">Chart View:</label>
            <select
              id="viewMode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
            >
              <option value="legacy">Legacy View</option>
              <option value="advanced">Advanced Charts</option>
            </select>
          </div>
        )}
      </div>

      {viewMode === 'advanced' && overStatsData ? (
        <MatchOverCharts 
          data={overStatsData} 
          selectedInning={selectedInnings === 'first' ? '1' : selectedInnings === 'second' ? '2' : 'both'}
        />
      ) : (
        <div className="charts-container">
        {/* Cumulative Runs Chart */}
        <div className="chart-section analytics-card">
          <h3>Cumulative Runs Timeline</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="over" 
                label={{ value: 'Overs', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                label={{ value: 'Total Runs', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, name) => [value, name]}
                labelFormatter={(over) => `Over ${over}`}
              />
              <Legend />
              {selectedInnings === 'both' ? (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="inning1Cumulative" 
                    stroke="#8884d8" 
                    name="1st Innings"
                    strokeWidth={3}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="inning2Cumulative" 
                    stroke="#82ca9d" 
                    name="2nd Innings"
                    strokeWidth={3}
                  />
                </>
              ) : (
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#8884d8" 
                  name="Cumulative Runs"
                  strokeWidth={3}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Runs Per Over Chart */}
        <div className="chart-section analytics-card">
          <h3>Runs Per Over</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="over" 
                label={{ value: 'Overs', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                label={{ value: 'Runs', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, name) => [value, name]}
                labelFormatter={(over) => `Over ${over}`}
              />
              <Legend />
              {selectedInnings === 'both' ? (
                <>
                  <Bar dataKey="inning1Runs" fill="#8884d8" name="1st Innings" />
                  <Bar dataKey="inning2Runs" fill="#82ca9d" name="2nd Innings" />
                </>
              ) : (
                <Bar dataKey="runs" fill="#8884d8" name="Runs in Over" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Wickets Timeline */}
        {wicketsData.length > 0 && (
          <div className="wickets-timeline analytics-card">
            <h3>Fall of Wickets</h3>
            <div className="wickets-list">
              {wicketsData.map((wicket, index) => (
                <div key={index} className="wicket-item">
                  <span className="wicket-over">{wicket.overBall}</span>
                  <span className="wicket-player">{wicket.player}</span>
                  <span className="wicket-inning">Inning {wicket.inning}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default MatchTimeline;
