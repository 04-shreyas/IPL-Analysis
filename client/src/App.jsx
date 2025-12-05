import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import HeadToHead from './pages/HeadToHead';
import PreMatchPredict from './pages/PreMatchPredict';
import ScorePredict from './pages/ScorePredict';
import PlayerAnalytics from './pages/PlayerAnalytics';
import BowlerAnalytics from './pages/BowlerAnalytics';
import VenueAnalytics from './pages/VenueAnalytics';
import UmpireStats from './pages/UmpireStats';
import PartnershipAnalyzer from './pages/PartnershipAnalyzer';
import SeasonSummary from './pages/SeasonSummary';
import Milestones from './pages/Milestones';
import MatchDetails from './pages/MatchDetails';
import MatchTimeline from './pages/MatchTimeline';
import TeamSeasonMatches from './pages/TeamSeasonMatches';
import PhaseAnalysis from './pages/PhaseAnalysis';
import ImpactIndex from './pages/ImpactIndex';
import RivalBattle from './pages/RivalBattle';
import './styles/global.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/players" element={<PlayerAnalytics />} />
          <Route path="/bowlers" element={<BowlerAnalytics />} />
          <Route path="/venues" element={<VenueAnalytics />} />
          <Route path="/umpires" element={<UmpireStats />} />
          <Route path="/partnerships" element={<PartnershipAnalyzer />} />
          <Route path="/season-summary" element={<SeasonSummary />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:name" element={<TeamDetail />} />
          <Route path="/teams/:name/seasons/:season" element={<TeamSeasonMatches />} />
          <Route path="/matches/:id" element={<MatchDetails />} />
          <Route path="/matches/:id/timeline" element={<MatchTimeline />} />
          <Route path="/head-to-head" element={<HeadToHead />} />
          <Route path="/predict/pre-match" element={<PreMatchPredict />} />
          <Route path="/predict/score" element={<ScorePredict />} />
          <Route path="/analysis/phase" element={<PhaseAnalysis />} />
            <Route path="/analytics/impact" element={<ImpactIndex />} />
          <Route path="/analytics/rival" element={<RivalBattle />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App
