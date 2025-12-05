import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getMatchDetails, getMatchDeliveries, livePredict } from '../api/apiClient';
import '../styles/MatchDetails.css';

const MatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [matchData, setMatchData] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [deliveryInning, setDeliveryInning] = useState(1); // which innings to show in ball-by-ball table
  const [deliveryPage, setDeliveryPage] = useState(0); // 0-based page index for ball-by-ball table
  const [showLivePredict, setShowLivePredict] = useState(false);
  const [liveForm, setLiveForm] = useState({
    inning: 1,
    overs: 0,
    currentRuns: 0,
    wickets: 0
  });
  const [livePrediction, setLivePrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (!id) return;
      
      try {
        const response = await getMatchDetails(id);
        setMatchData(response);
        
        // Pre-fill live form with last delivery state if available
        if (response.innings && response.innings.length > 0) {
          const lastInning = response.innings[response.innings.length - 1];
          setLiveForm({
            inning: lastInning.inning,
            overs: lastInning.oversPlayed || 0,
            currentRuns: lastInning.totalRuns || 0,
            wickets: lastInning.wickets || 0
          });
        }
      } catch (err) {
        setError('Failed to load match details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatchDetails();
  }, [id]);

  const fetchDeliveries = async () => {
    if (!id) return;
    
    setDeliveriesLoading(true);
    try {
      const deliveries = await getMatchDeliveries(id, { limit: 2000 });
      setDeliveries(deliveries && deliveries.data ? deliveries.data : deliveries || []);
      // Reset filters whenever we (re)load deliveries
      setDeliveryInning(1);
      setDeliveryPage(0);
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const handleLivePrediction = async () => {
    try {
      const payload = {
        matchId: parseInt(id),
        inning: liveForm.inning,
        overs: parseFloat(liveForm.overs),
        currentRuns: parseInt(liveForm.currentRuns),
        wickets: parseInt(liveForm.wickets)
      };
      
      const result = await livePredict(payload);
      setLivePrediction(result);
    } catch (err) {
      console.error('Live prediction failed:', err);
      setLivePrediction({ error: 'Prediction failed' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTopPerformers = () => {
    if (!matchData?.innings) return null;
    
    let highestScorer = null;
    let bestBowler = null;
    
    matchData.innings.forEach(inning => {
      // Find highest scorer
      if (inning.batsmenStats) {
        inning.batsmenStats.forEach(batsman => {
          if (!highestScorer || batsman.runs > highestScorer.runs) {
            highestScorer = batsman;
          }
        });
      }
      
      // Find best bowler
      if (inning.bowlersStats) {
        inning.bowlersStats.forEach(bowler => {
          if (!bestBowler || bowler.wickets > bestBowler.wickets || 
              (bowler.wickets === bestBowler.wickets && bowler.economy < bestBowler.economy)) {
            bestBowler = bowler;
          }
        });
      }
    });
    
    return { highestScorer, bestBowler };
  };

  const getMatchResultDescription = () => {
    if (!matchData?.innings || matchData.innings.length < 2) return null;

    const firstInnings = matchData.innings.find((inn) => inn.inning === 1);
    const secondInnings = matchData.innings.find((inn) => inn.inning === 2);
    if (!firstInnings || !secondInnings) return null;

    const firstRuns = firstInnings.totalRuns ?? 0;
    const secondRuns = secondInnings.totalRuns ?? 0;

    // Tie / draw
    if (firstRuns === secondRuns) {
      return `Match tied: both teams scored ${firstRuns} runs`;
    }

    const totalBalls = 120; // 20 overs * 6 balls
    const secondOvers = Number(secondInnings.oversPlayed ?? 0);
    const ballsUsed = Math.min(totalBalls, Math.round(secondOvers * 6));
    const ballsRemaining = Math.max(0, totalBalls - ballsUsed);

    if (secondRuns > firstRuns) {
      // Chasing team won
      if (ballsRemaining > 0) {
        return `${secondInnings.battingTeam} won by ${ballsRemaining} ball${ballsRemaining !== 1 ? 's' : ''} remaining`;
      }
      return `${secondInnings.battingTeam} won on the last ball`;
    }

    // Defending team won by runs
    const runsMargin = firstRuns - secondRuns;
    return `${firstInnings.battingTeam} won by ${runsMargin} run${runsMargin !== 1 ? 's' : ''}`;
  };

  if (loading) return <div className="match-details-page"><p>Loading match details...</p></div>;
  if (error) return <div className="match-details-page"><p className="error">{error}</p></div>;
  if (!matchData) return <div className="match-details-page"><p>Match not found</p></div>;

  const topPerformers = getTopPerformers();
  const explicitManOfTheMatch = matchData.match
    ? (matchData.match.player_of_match || matchData.match.playerOfMatch || matchData.match.manOfTheMatch)
    : null;
  const manOfTheMatch = explicitManOfTheMatch || topPerformers?.highestScorer?.batsman || null;
  const matchResultDescription = getMatchResultDescription();

  return (
    <div className="match-details-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      {/* Match Header */}
      <div className="match-header analytics-card">
        <h1>{matchData.match?.team1} vs {matchData.match?.team2}</h1>
        <div className="match-info">
          <p><strong>Date:</strong> {formatDate(matchData.match?.date)}</p>
          <p><strong>Venue:</strong> {matchData.match?.venue}</p>
          <p><strong>Season:</strong> IPL {matchData.match?.season}</p>
          {matchData.match?.tossWinner && (
            <p><strong>Toss:</strong> {matchData.match.tossWinner} won and chose to {matchData.match.tossDecision}</p>
          )}
          {matchData.match?.winner && (
            <p><strong>Winner:</strong> {matchData.match.winner}</p>
          )}
        </div>
      </div>

      {/* Quick Insights */}
      {topPerformers && (
        <div className="quick-insights analytics-card">
          <h2>Quick Insights</h2>
          <div className="insights-grid">
            {topPerformers.highestScorer && (
              <div className="insight-card">
                <h4>Highest Scorer</h4>
                <p>{topPerformers.highestScorer.batsman} - {topPerformers.highestScorer.runs} runs</p>
              </div>
            )}
            {topPerformers.bestBowler && (
              <div className="insight-card">
                <h4>Best Bowling</h4>
                <p>{topPerformers.bestBowler.bowler} - {topPerformers.bestBowler.wickets}/{topPerformers.bestBowler.runs}</p>
              </div>
            )}
            {manOfTheMatch && (
              <div className="insight-card">
                <h4>Man of the Match</h4>
                <p>
                  {manOfTheMatch}
                  {topPerformers?.highestScorer && topPerformers.highestScorer.batsman === manOfTheMatch && (
                    <> - {topPerformers.highestScorer.runs} runs</>
                  )}
                </p>
              </div>
            )}
            {matchData.match?.winner && (
              <div className="insight-card">
                <h4>Winner</h4>
                <p>{matchData.match.winner}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Innings Scorecards */}
      <div className="scorecards">
        {matchData.innings?.map((inning) => (
          <div key={inning.inning} className="scorecard analytics-card">
            <h2>
              {inning.inning === 1 ? 'First' : 'Second'} Innings - {inning.battingTeam}
            </h2>
            <div className="innings-summary">
              <div className="total-score">
                {inning.totalRuns}/{inning.wickets}
                <span className="overs">({inning.oversPlayed} overs)</span>
              </div>
            </div>
            
            {/* Batting Stats */}
            <div className="batting-card">
              <h3>Batting</h3>
              <table className="scorecard-table">
                <thead>
                  <tr>
                    <th>Batsman</th>
                    <th>Runs</th>
                    <th>Balls</th>
                    <th>4s</th>
                    <th>6s</th>
                    <th>SR</th>
                  </tr>
                </thead>
                <tbody>
                  {inning.batsmenStats?.map((batsman, index) => (
                    <tr key={index}>
                      <td>{batsman.batsman}</td>
                      <td>{batsman.runs}</td>
                      <td>{batsman.balls}</td>
                      <td>{batsman.fours}</td>
                      <td>{batsman.sixes}</td>
                      <td>{batsman.strikeRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bowling Stats */}
            <div className="bowling-card">
              <h3>Bowling</h3>
              <table className="scorecard-table">
                <thead>
                  <tr>
                    <th>Bowler</th>
                    <th>Overs</th>
                    <th>Runs</th>
                    <th>Wickets</th>
                    <th>Economy</th>
                  </tr>
                </thead>
                <tbody>
                  {inning.bowlersStats?.map((bowler, index) => (
                    <tr key={index}>
                      <td>{bowler.bowler}</td>
                      <td>{bowler.overs}</td>
                      <td>{bowler.runs}</td>
                      <td>{bowler.wickets}</td>
                      <td>{bowler.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fall of Wickets */}
            {inning.fallOfWickets?.length > 0 && (
              <div className="fall-of-wickets">
                <h4>Fall of Wickets</h4>
                <div className="wickets-timeline">
                  {inning.fallOfWickets.map((wicket, index) => (
                    <span key={index} className="wicket-fall">
                      {wicket.overBall} - {wicket.player} ({wicket.scoreAtFall})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Ball-by-ball deliveries */}
      <div className="deliveries-section analytics-card">
        <div className="deliveries-header">
          <h2>Ball-by-ball Commentary</h2>
          <button 
            className="toggle-btn"
            onClick={() => {
              setShowDeliveries(!showDeliveries);
              if (!showDeliveries && deliveries.length === 0) {
                fetchDeliveries();
              }
            }}
          >
            {showDeliveries ? 'Hide' : 'Show'} Deliveries
          </button>
        </div>
        
        {showDeliveries && (
          <div className="deliveries-content">
            {deliveriesLoading ? (
              <p>Loading deliveries...</p>
            ) : deliveries.length > 0 ? (
              (() => {
                const inningDeliveries = deliveries.filter(
                  (d) => (d.inning ?? 1) === deliveryInning
                );

                // Fixed over ranges per innings
                const overRanges = [
                  { label: '1-6', startOver: 1, endOver: 6 },
                  { label: '7-15', startOver: 7, endOver: 15 },
                  { label: '16-20', startOver: 16, endOver: 20 }
                ];

                const safePage = Math.min(deliveryPage, overRanges.length - 1);
                const currentRange = overRanges[safePage];

                const pageSlice = inningDeliveries
                  .filter((d) => {
                    const overNum = d.over ?? 0;
                    return (
                      overNum >= currentRange.startOver &&
                      overNum <= currentRange.endOver
                    );
                  })
                  .sort((a, b) => {
                    if ((a.over ?? 0) !== (b.over ?? 0)) {
                      return (a.over ?? 0) - (b.over ?? 0);
                    }
                    return (a.ball ?? 0) - (b.ball ?? 0);
                  });

                const totalBalls = inningDeliveries.length;

                // Compute innings score at end of this over period
                const periodDeliveries = inningDeliveries.filter((d) => {
                  const overNum = d.over ?? 0;
                  return overNum <= currentRange.endOver;
                });

                let periodRuns = 0;
                let periodWickets = 0;
                periodDeliveries.forEach((d) => {
                  const batsmanRuns = d.batsmanRuns ?? d.batsman_runs ?? 0;
                  const extras = (d.extraRuns ?? d.extra_runs ?? 0) ||
                    (d.wideRuns ?? d.wide_runs ?? 0) +
                    (d.byeRuns ?? d.bye_runs ?? 0) +
                    (d.legbyeRuns ?? d.legbye_runs ?? 0) +
                    (d.noballRuns ?? d.noball_runs ?? 0) +
                    (d.penaltyRuns ?? d.penalty_runs ?? 0);
                  const total = d.totalRuns ?? d.total_runs ?? batsmanRuns + extras;
                  periodRuns += total;
                  if (d.player_dismissed) {
                    periodWickets += 1;
                  }
                });

                // Current run rate for this innings at end of the period
                const ballsBowledInPeriod = periodDeliveries.length;
                const oversBowledInPeriod = ballsBowledInPeriod / 6;
                const currentRunRate = oversBowledInPeriod > 0 ? (periodRuns / oversBowledInPeriod) : null;

                // For second innings, compute chase requirement at end of this period
                let requiredSummary = null;
                if (deliveryInning === 2 && matchData?.innings && matchData.innings.length > 0) {
                  const firstInnings = matchData.innings.find((inn) => inn.inning === 1);
                  const targetScore = firstInnings ? firstInnings.totalRuns : null;
                  if (typeof targetScore === 'number') {
                    const currentScore = periodRuns;
                    const ballsBowled = ballsBowledInPeriod;
                    const totalBalls = 120; // 20 overs * 6 balls
                    const ballsRemaining = Math.max(0, totalBalls - ballsBowled);
                    const runsRequired = Math.max(0, targetScore + 1 - currentScore);

                    if (ballsRemaining > 0 && runsRequired > 0) {
                      const oversRemaining = ballsRemaining / 6;
                      const reqPerOver = oversRemaining > 0 ? runsRequired / oversRemaining : runsRequired;
                      requiredSummary = {
                        runsRequired,
                        ballsRemaining,
                        oversRemaining,
                        reqPerOver: reqPerOver.toFixed(2),
                        currentRR: currentRunRate != null ? currentRunRate.toFixed(2) : null
                      };
                    } else if (runsRequired <= 0) {
                      requiredSummary = { message: 'Chase completed in this period' };
                    } else {
                      requiredSummary = { message: 'No balls remaining' };
                    }
                  }
                }

                return (
                  <>
                    {/* Inning selector and range selector */}
                    <div className="deliveries-range-controls">
                      <label>
                        Inning:
                        <select
                          value={deliveryInning}
                          onChange={(e) => {
                            const nextInning = parseInt(e.target.value, 10) || 1;
                            setDeliveryInning(nextInning);
                            setDeliveryPage(0);
                          }}
                        >
                          <option value={1}>1st Innings</option>
                          <option value={2}>2nd Innings</option>
                        </select>
                      </label>

                      <label>
                        Show balls:
                        <select
                          value={safePage}
                          onChange={(e) => setDeliveryPage(parseInt(e.target.value, 10) || 0)}
                        >
                          {overRanges.map((range, idx) => (
                            <option key={idx} value={idx}>
                              Overs {range.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="deliveries-table-wrapper">
                <table className="scorecard-table deliveries-table">
                  <thead>
                    <tr>
                      <th>Inning</th>
                      <th>Over.Ball</th>
                      <th>Batting Team</th>
                      <th>Batsman</th>
                      <th>Bowler</th>
                      <th>Batsman Runs</th>
                      <th>Extras</th>
                      <th>Total Runs</th>
                      <th>Dismissal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows = [];
                      let currentOver = null;
                      let overTotal = 0;
                      let overBowlers = new Set();
                      let overBatsmen = new Set();

                      const pushSummaryRow = (overNumber) => {
                        const bowlerList = Array.from(overBowlers).join(', ') || '-';
                        const batsmanList = Array.from(overBatsmen).join(', ') || '-';

                        // Compute cumulative runs and RR from start of innings up to this over
                        const cumulativeDeliveries = inningDeliveries.filter((d) => {
                          const o = d.over ?? 0;
                          return o <= overNumber;
                        });
                        let cumulativeRuns = 0;
                        const overSet = new Set();
                        cumulativeDeliveries.forEach((d) => {
                          const batsmanRuns = d.batsmanRuns ?? d.batsman_runs ?? 0;
                          const extras = (d.extraRuns ?? d.extra_runs ?? 0) ||
                            (d.wideRuns ?? d.wide_runs ?? 0) +
                            (d.byeRuns ?? d.bye_runs ?? 0) +
                            (d.legbyeRuns ?? d.legbye_runs ?? 0) +
                            (d.noballRuns ?? d.noball_runs ?? 0) +
                            (d.penaltyRuns ?? d.penalty_runs ?? 0);
                          const tot = d.totalRuns ?? d.total_runs ?? batsmanRuns + extras;
                          cumulativeRuns += tot;
                          overSet.add(d.over ?? 0);
                        });
                        const oversCount = overSet.size || 1;
                        const overRunRate = overTotal; // runs in this over
                        const cumulativeRR = cumulativeRuns / oversCount;

                        rows.push(
                          <tr
                            key={`summary-${deliveryInning}-${overNumber}-${rows.length}`}
                            className="over-summary-row"
                          >
                            <td colSpan={5}>
                              Over {Math.max(0, overNumber - 1)} summary :
                            </td>
                            <td colSpan={2} className="over-summary-runs">
                              Total runs in over: {overTotal}
                            </td>
                            <td colSpan={2}>
                              <div className="over-summary-extra">
                                <div><strong>Bowler(s):</strong> {bowlerList}</div>
                                <div><strong>Batsman(s):</strong> {batsmanList}</div>
                                <div><strong>Runs in Over:</strong> {overRunRate.toFixed(2)} runs/over</div>
                                <div><strong>Current RR (innings):</strong> {cumulativeRR.toFixed(2)} runs/over</div>
                              </div>
                            </td>
                          </tr>
                        );
                      };

                      pageSlice.forEach((delivery, index) => {
                        const batsmanRuns = delivery.batsmanRuns ?? delivery.batsman_runs ?? 0;
                        const extras = (delivery.extraRuns ?? delivery.extra_runs ?? 0) ||
                          (delivery.wideRuns ?? delivery.wide_runs ?? 0) +
                          (delivery.byeRuns ?? delivery.bye_runs ?? 0) +
                          (delivery.legbyeRuns ?? delivery.legbye_runs ?? 0) +
                          (delivery.noballRuns ?? delivery.noball_runs ?? 0) +
                          (delivery.penaltyRuns ?? delivery.penalty_runs ?? 0);
                        const total = delivery.totalRuns ?? delivery.total_runs ?? batsmanRuns + extras;

                        const battingTeam = delivery.battingTeam || delivery.batting_team;

                        // Build rich dismissal description including how and by whom
                        let dismissal = '';
                        if (delivery.player_dismissed) {
                          const kind = delivery.dismissal_kind || 'out';
                          const bowlerName = delivery.bowler || '';
                          const fielderRaw = delivery.dismissal_fielders || delivery.fielder || '';
                          let byPart = '';

                          if (bowlerName && fielderRaw) {
                            byPart = ` by ${fielderRaw} off ${bowlerName}`;
                          } else if (bowlerName) {
                            byPart = ` by ${bowlerName}`;
                          } else if (fielderRaw) {
                            byPart = ` by ${fielderRaw}`;
                          }

                          dismissal = `${delivery.player_dismissed} (${kind}${byPart})`;
                        }
                        const overNum = delivery.over ?? 0;
                        const displayOver = Math.max(0, overNum - 1);

                        // Initialize current over
                        if (currentOver === null) {
                          currentOver = overNum;
                        }

                        // If over changes, push a summary row for the previous over
                        if (overNum !== currentOver) {
                          pushSummaryRow(currentOver);
                          currentOver = overNum;
                          overTotal = 0;
                          overBowlers = new Set();
                          overBatsmen = new Set();
                        }

                        overTotal += total;
                        if (delivery.bowler) {
                          overBowlers.add(delivery.bowler);
                        }
                        if (delivery.batsman) {
                          overBatsmen.add(delivery.batsman);
                        }

                        rows.push(
                          <tr
                            key={`${delivery.inning}-${delivery.over}-${delivery.ball}-${index}`}
                            className={index % 2 === 0 ? 'ball-row even' : 'ball-row odd'}
                          >
                            <td>{delivery.inning}</td>
                            <td>{displayOver}.{delivery.ball}</td>
                            <td>{battingTeam}</td>
                            <td>{delivery.batsman}</td>
                            <td>{delivery.bowler}</td>
                            <td>{batsmanRuns}</td>
                            <td>{extras}</td>
                            <td>{total}</td>
                            <td className={dismissal ? 'wicket-cell' : ''}>{dismissal || '-'}</td>
                          </tr>
                        );

                        // If this is the last delivery in the slice, push the summary row for its over
                        if (index === pageSlice.length - 1 && currentOver !== null) {
                          pushSummaryRow(currentOver);
                        }
                      });

                      return rows;
                    })()}
                    {/* Period summary row for this over range */}
                    <tr className="period-summary-row">
                      <td colSpan={9}>
                        Inning {deliveryInning} score at end of overs {currentRange.label}: {periodRuns}/{periodWickets}
                        {' '}
                        <span className="period-extra-text">
                          (total balls in innings: {totalBalls})
                        </span>
                        {currentRunRate != null && (
                          <span className="period-extra-text">
                            {' '}• Current RR: {currentRunRate.toFixed(2)} runs/over
                          </span>
                        )}
                        {requiredSummary && (
                          <span className="period-extra-text">
                            {' '}
                            {requiredSummary.message
                              ? `• ${requiredSummary.message}`
                              : `• Required: ${requiredSummary.runsRequired} runs from ${requiredSummary.oversRemaining.toFixed(1)} overs (Req RR: ${requiredSummary.reqPerOver} runs/over)`}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {currentRange.label === '16-20' && matchResultDescription && (
                  <div className="match-result-summary-inline">
                    <h3>Match Summary</h3>
                    <p>{matchResultDescription}</p>
                  </div>
                )}
              </div>
              </>
                );
              })()
            ) : (
              <p>No delivery data available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchDetails;
