import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simple in-memory cache for heavy endpoints (60 second TTL)
const cache = {
  store: new Map(),
  set(key, data) {
    this.store.set(key, { data, timestamp: Date.now() });
  },
  get(key, ttl = 60000) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }
};

// Teams API
export const getTeams = async () => {
  const response = await apiClient.get('/teams');
  return response.data;
};

export const getTeam = async (name) => {
  const response = await apiClient.get(`/teams/${encodeURIComponent(name)}`);
  return response.data;
};

// Stats API
export const getSummaryStats = async () => {
  const response = await apiClient.get('/matches/stats/summary');
  return response.data;
};

// Head-to-head API
export const getHeadToHead = async (team1, team2, params = {}) => {
  const response = await apiClient.get('/headtohead', {
    params: { team1, team2, ...params }
  });
  return response.data;
};

// Prediction APIs
export const predictMatchWinner = async (payload) => {
  const response = await apiClient.post('/predict/match-winner', payload);
  return response.data;
};

export const predictScore = async (payload) => {
  const response = await apiClient.post('/predict/score', payload);
  return response.data;
};

// Analytics APIs
export const getPlayerStats = async (playerId, params = {}) => {
  const response = await apiClient.get(`/analytics/players/${playerId}`, { params });
  return response.data;
};

export const getBowlerStats = async (playerId, params = {}) => {
  const response = await apiClient.get(`/analytics/bowlers/${playerId}`, { params });
  return response.data;
};

export const getVenueStats = async (venue) => {
  const response = await apiClient.get(`/analytics/venues/${encodeURIComponent(venue)}`);
  return response.data;
};

export const getUmpireStats = async (umpireId) => {
  const response = await apiClient.get(`/analytics/umpires/${umpireId}`);
  return response.data;
};

export const getPartnerships = async (teamName) => {
  const response = await apiClient.get('/analytics/partnerships', {
    params: { team: teamName }
  });
  return response.data;
};

export const getSeasonSummary = async (year) => {
  const response = await apiClient.get(`/analytics/seasons/${year}`);
  return response.data;
};

// Team seasons and matches APIs
export const getTeamSeasons = async (teamName) => {
  const response = await apiClient.get(`/teams/${encodeURIComponent(teamName)}/seasons`);
  return response.data;
};

export const getTeamSeasonMatches = async (teamName, season) => {
  const response = await apiClient.get(`/teams/${encodeURIComponent(teamName)}/seasons/${season}/matches`);
  return response.data;
};

// Match details APIs
export const getMatchDetails = async (matchId) => {
  const response = await apiClient.get(`/matches/${matchId}`);
  return response.data;
};

export const getMatchDeliveries = async (matchId, options = {}) => {
  const { inning, page = 1, limit = 1000 } = options;
  const params = { page, limit };
  if (inning) params.inning = inning;
  
  const response = await apiClient.get(`/matches/${matchId}/deliveries`, { params });
  return response.data;
};

export const getMatchTimeline = async (matchId) => {
  const response = await apiClient.get(`/matches/${matchId}/timeline`);
  return response.data;
};

// Live prediction API (calling ml-service directly)
export const livePredict = async (payload) => {
  try {
    const mlResponse = await axios.post('http://localhost:8000/ml/predict/live', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return mlResponse.data;
  } catch (error) {
    console.error('ML service call failed:', error);
    throw error;
  }
};

export const getMilestones = async () => {
  const response = await apiClient.get('/analytics/milestones');
  return response.data;
};

export const getAllPlayers = async () => {
  const response = await apiClient.get('/players');
  return response.data;
};

export const getAllVenues = async () => {
  const response = await apiClient.get('/analytics/venues');
  return response.data;
};

export const getAllUmpires = async () => {
  const response = await apiClient.get('/analytics/umpires');
  return response.data;
};

// Advanced Analytics APIs
export const getPhaseAnalysis = async (params = {}) => {
  const cacheKey = `phase_${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const response = await apiClient.get('/analytics/phase', { params });
  cache.set(cacheKey, response.data);
  return response.data;
};

export const getVenueMetrics = async (venue, params = {}) => {
  const response = await apiClient.get(`/analytics/venues/${encodeURIComponent(venue)}/metrics`, { params });
  return response.data;
};

export const getImpactIndex = async (params = {}) => {
  const response = await apiClient.get('/analytics/impact', { params });
  return response.data;
};

export const getRivalBattle = async (batsman, bowler, params = {}) => {
  const response = await apiClient.get('/analytics/rival', {
    params: { batsman, bowler, ...params }
  });
  return response.data;
};

export const getMatchOverStats = async (matchId, params = {}) => {
  const cacheKey = `match_overs_${matchId}_${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const response = await apiClient.get(`/analytics/matches/${matchId}/overs`, { params });
  cache.set(cacheKey, response.data);
  return response.data;
};

export default apiClient;
