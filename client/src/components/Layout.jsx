import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/teams', label: 'Teams' },
    { path: '/head-to-head', label: 'Head-to-Head' },
    { path: '/predict/pre-match', label: 'Match Prediction' },
    { path: '/predict/score', label: 'Score Prediction' },
    { path: '/players', label: 'Players' },
    { path: '/bowlers', label: 'Bowlers' },
    { path: '/venues', label: 'Venues' },
    { path: '/umpires', label: 'Umpires' },
    { path: '/partnerships', label: 'Partnerships' },
    { path: '/season-summary', label: 'Seasons' },
    { path: '/milestones', label: 'Milestones' },
    // advanced analytics links come immediately after Milestones
    { path: '/analysis/phase', label: 'Phase Analysis' },
    { path: '/analytics/impact', label: 'Impact Index' },
    { path: '/analytics/rival', label: 'Rival Battle' }
  ];

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="header-content">
            <Link to="/" className="logo">
              <h1>IPL Analytics</h1>
            </Link>
            <nav className="nav">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="app-main">
        <div className="app-main-inner">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
