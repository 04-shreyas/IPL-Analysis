import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ScatterChart, ZAxis } from 'recharts';
import '../styles/MatchOverCharts.css';

const MatchOverCharts = ({ data, selectedInning }) => {
  if (!data || !data.innings || data.innings.length === 0) {
    return <div className="match-over-charts"><p>No over data available</p></div>;
  }

  // Get the selected inning data or both
  const getInningData = () => {
    if (selectedInning === 'both') {
      return data.innings;
    }
    return data.innings.filter(inning => inning.inning === parseInt(selectedInning));
  };

  const inningsData = getInningData();

  // Format data for Manhattan chart (runs per over)
  const getManhattanData = () => {
    if (selectedInning === 'both' && inningsData.length === 2) {
      // Combine both innings
      const maxOvers = Math.max(
        inningsData[0].overs.length,
        inningsData[1].overs.length
      );
      
      const combined = [];
      for (let i = 0; i < maxOvers; i++) {
        const over = i + 1;
        const inning1Over = inningsData[0].overs[i];
        const inning2Over = inningsData[1].overs[i];
        
        combined.push({
          over,
          inning1: inning1Over ? inning1Over.runsInOver : 0,
          inning2: inning2Over ? inning2Over.runsInOver : 0
        });
      }
      return combined;
    } else {
      // Single inning
      return inningsData[0].overs.map(over => ({
        over: over.over,
        runs: over.runsInOver,
        wickets: over.wicketsInOver
      }));
    }
  };

  // Format data for Worm chart (cumulative runs)
  const getWormData = () => {
    if (selectedInning === 'both' && inningsData.length === 2) {
      const maxOvers = Math.max(
        inningsData[0].overs.length,
        inningsData[1].overs.length
      );
      
      const combined = [];
      for (let i = 0; i < maxOvers; i++) {
        const over = i + 1;
        const inning1Over = inningsData[0].overs[i];
        const inning2Over = inningsData[1].overs[i];
        
        combined.push({
          over,
          inning1: inning1Over ? inning1Over.cumulative : (i > 0 ? combined[i-1].inning1 : 0),
          inning2: inning2Over ? inning2Over.cumulative : (i > 0 ? combined[i-1].inning2 : 0)
        });
      }
      return combined;
    } else {
      return inningsData[0].overs.map(over => ({
        over: over.over,
        cumulative: over.cumulative,
        wickets: over.wicketsInOver
      }));
    }
  };

  // Get wicket markers for scatter plot
  const getWicketMarkers = () => {
    const wickets = [];
    inningsData.forEach((inning, inningIndex) => {
      inning.overs.forEach(over => {
        if (over.wicketsInOver > 0) {
          wickets.push({
            over: over.over,
            cumulative: over.cumulative,
            wickets: over.wicketsInOver,
            inning: inning.inning
          });
        }
      });
    });
    return wickets;
  };

  const manhattanData = getManhattanData();
  const wormData = getWormData();
  const wicketMarkers = getWicketMarkers();

  return (
    <div className="match-over-charts">
      {/* Manhattan Chart - Runs per Over */}
      <div className="chart-section">
        <h3>Manhattan Chart - Runs per Over</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={manhattanData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="over" 
              label={{ value: 'Overs', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'Runs', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            <Legend />
            {selectedInning === 'both' ? (
              <>
                <Bar dataKey="inning1" fill="#8884d8" name="1st Innings" />
                <Bar dataKey="inning2" fill="#82ca9d" name="2nd Innings" />
              </>
            ) : (
              <Bar dataKey="runs" fill="#8884d8" name="Runs in Over" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Worm Chart - Cumulative Runs */}
      <div className="chart-section">
        <h3>Worm Chart - Cumulative Runs</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={wormData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="over" 
              label={{ value: 'Overs', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'Total Runs', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            <Legend />
            {selectedInning === 'both' ? (
              <>
                <Line 
                  type="monotone" 
                  dataKey="inning1" 
                  stroke="#8884d8" 
                  strokeWidth={3}
                  name="1st Innings"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="inning2" 
                  stroke="#82ca9d" 
                  strokeWidth={3}
                  name="2nd Innings"
                  dot={{ r: 4 }}
                />
              </>
            ) : (
              <Line 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#8884d8" 
                strokeWidth={3}
                name="Cumulative Runs"
                dot={{ r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Wicket markers overlay */}
        {wicketMarkers.length > 0 && (
          <div className="wicket-markers-info">
            <p className="wicket-legend">
              <span className="wicket-dot"></span> Wickets fell at these overs
            </p>
            <div className="wicket-list">
              {wicketMarkers.map((wicket, index) => (
                <span key={index} className="wicket-tag">
                  Over {wicket.over} ({wicket.wickets}W)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Over-by-over summary table */}
      <div className="over-summary">
        <h3>Over-by-Over Summary</h3>
        <div className="summary-table-container">
          {inningsData.map(inning => (
            <div key={inning.inning} className="inning-summary">
              <h4>Inning {inning.inning}</h4>
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Over</th>
                    <th>Runs</th>
                    <th>Extras</th>
                    <th>Wickets</th>
                    <th>Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {inning.overs.map(over => (
                    <tr key={over.over} className={over.wicketsInOver > 0 ? 'wicket-over' : ''}>
                      <td>{over.over}</td>
                      <td>{over.runsInOver}</td>
                      <td>{over.extrasInOver}</td>
                      <td>{over.wicketsInOver > 0 ? over.wicketsInOver : '-'}</td>
                      <td><strong>{over.cumulative}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatchOverCharts;
