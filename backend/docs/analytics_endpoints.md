# Advanced Analytics Endpoints

This document describes the new advanced analytics endpoints added to the IPL Analytics API.

## Overview

These endpoints provide deep insights into IPL match data through aggregation pipelines:
- **Phase Analysis**: Performance breakdown by powerplay/middle/death overs
- **Venue Metrics**: Scoring patterns and win percentages at specific venues
- **Impact Index**: Player and team impact scoring based on runs, strike rate, boundaries, and clutch performances
- **Rival Battle**: Head-to-head statistics between batsman and bowler
- **Match Over Stats**: Per-over aggregates for Manhattan and Worm chart visualizations

All endpoints use MongoDB aggregation pipelines for efficient querying.

---

## 1. Phase Analysis

**Endpoint:** `GET /api/analytics/phase`

**Description:** Analyze batting and bowling performance across match phases (powerplay: 1-6, middle: 7-15, death: 16-20 overs).

**Query Parameters:**
- `team` (optional): Team name
- `player` (optional): Player name
- `season` (optional): Season year (e.g., 2020)

**Response:**
```json
{
  "team": "Mumbai Indians",
  "season": "2020",
  "batting": [
    {
      "phase": "POWERPLAY",
      "runsScored": 450,
      "ballsFaced": 360,
      "fours": 45,
      "sixes": 12,
      "wicketsLost": 8,
      "strikeRate": 125.0,
      "avg": 56.25
    }
  ],
  "bowling": [
    {
      "phase": "POWERPLAY",
      "runsConceded": 380,
      "ballsBowled": 360,
      "wicketsTaken": 12,
      "economy": 6.33
    }
  ]
}
```

**Example cURL:**
```bash
# Team phase analysis
curl "http://localhost:5000/api/analytics/phase?team=Mumbai%20Indians&season=2020"

# Player phase analysis
curl "http://localhost:5000/api/analytics/phase?player=Rohit%20Sharma&season=2020"

# League-wide phase stats
curl "http://localhost:5000/api/analytics/phase?season=2020"
```

---

## 2. Venue Metrics

**Endpoint:** `GET /api/analytics/venues/:venue/metrics`

**Description:** Get comprehensive metrics for a specific venue including average scores, win percentages, toss decisions, and top performers.

**Path Parameters:**
- `venue` (required): Venue name (URL encoded)

**Query Parameters:**
- `season` (optional): Filter by season year

**Response:**
```json
{
  "venue": "Wankhede Stadium",
  "season": "all",
  "avgFirstInnings": 162.4,
  "avgSecondInnings": 155.3,
  "winPctBatFirst": 0.56,
  "winPctChase": 0.44,
  "tossDecisionCounts": {
    "bat": 80,
    "field": 120
  },
  "topTeams": [
    { "team": "Mumbai Indians", "wins": 35 },
    { "team": "Chennai Super Kings", "wins": 28 }
  ],
  "topBatsmen": [
    { "player": "Rohit Sharma", "runs": 1250 },
    { "player": "Suresh Raina", "runs": 980 }
  ]
}
```

**Example cURL:**
```bash
# Venue metrics for all seasons
curl "http://localhost:5000/api/analytics/venues/Wankhede%20Stadium/metrics"

# Venue metrics for specific season
curl "http://localhost:5000/api/analytics/venues/Eden%20Gardens/metrics?season=2019"
```

---

## 3. Impact Index

**Endpoint:** `GET /api/analytics/impact`

**Description:** Calculate impact scores for players based on batting (runs, SR, boundaries, clutch) and bowling (wickets, economy, death overs) performance.

**Query Parameters:**
- `player` (optional): Specific player name
- `team` (optional): Team name
- `season` (optional): Season year
- `limit` (optional): Number of results (default: 50)

**Response (League-wide):**
```json
{
  "season": "all",
  "players": [
    {
      "player": "Virat Kohli",
      "impact": 8542.5,
      "runs": 5878,
      "strikeRate": 130.41
    }
  ],
  "meta": {
    "limit": 50
  }
}
```

**Response (Individual Player):**
```json
{
  "player": "Virat Kohli",
  "season": "all",
  "impact": 8542.5,
  "components": {
    "batting": {
      "base": 5878,
      "srBonus": 1532.4,
      "boundariesBonus": 890,
      "clutchBonus": 242.1,
      "total": 8542.5
    }
  }
}
```

**Example cURL:**
```bash
# Top 50 players by impact
curl "http://localhost:5000/api/analytics/impact?limit=50"

# Individual player impact
curl "http://localhost:5000/api/analytics/impact?player=Virat%20Kohli&season=2016"

# Team impact players
curl "http://localhost:5000/api/analytics/impact?team=Royal%20Challengers%20Bangalore&season=2020"
```

---

## 4. Rival Battle

**Endpoint:** `GET /api/analytics/rival`

**Description:** Head-to-head statistics between a specific batsman and bowler across all their encounters.

**Query Parameters:**
- `batsman` (required): Batsman name
- `bowler` (required): Bowler name
- `matchFilter` (optional): Season year to filter encounters

**Response:**
```json
{
  "batsman": "Virat Kohli",
  "bowler": "Lasith Malinga",
  "balls": 56,
  "runs": 78,
  "dismissals": 4,
  "sr": 139.29,
  "fours": 8,
  "sixes": 2,
  "dismissalsBreakdown": {
    "bowled": 2,
    "caught": 2
  },
  "sampleTimeline": [
    {
      "over": 3,
      "ball": 4,
      "runs": 4,
      "wicket": false
    }
  ]
}
```

**Example cURL:**
```bash
# Batsman vs bowler all-time
curl "http://localhost:5000/api/analytics/rival?batsman=Virat%20Kohli&bowler=Lasith%20Malinga"

# Filtered by season
curl "http://localhost:5000/api/analytics/rival?batsman=MS%20Dhoni&bowler=Harbhajan%20Singh&matchFilter=2019"
```

---

## 5. Match Over Stats

**Endpoint:** `GET /api/analytics/matches/:matchId/overs`

**Description:** Per-over aggregates for a specific match, useful for Manhattan (bar) and Worm (cumulative) chart visualizations.

**Path Parameters:**
- `matchId` (required): Match ID (numeric)

**Query Parameters:**
- `inning` (optional): Filter by inning number (1 or 2)

**Response:**
```json
{
  "matchId": 1,
  "innings": [
    {
      "inning": 1,
      "overs": [
        {
          "over": 1,
          "runsInOver": 8,
          "extrasInOver": 1,
          "wicketsInOver": 0,
          "cumulative": 8
        },
        {
          "over": 2,
          "runsInOver": 12,
          "extrasInOver": 0,
          "wicketsInOver": 1,
          "cumulative": 20
        }
      ]
    },
    {
      "inning": 2,
      "overs": [...]
    }
  ]
}
```

**Example cURL:**
```bash
# All innings for a match
curl "http://localhost:5000/api/analytics/matches/335982/overs"

# Specific inning only
curl "http://localhost:5000/api/analytics/matches/335982/overs?inning=1"
```

---

## Error Responses

All endpoints return standard HTTP status codes:

- `200 OK`: Successful response
- `400 Bad Request`: Missing or invalid parameters
- `404 Not Found`: No data found for the given parameters
- `500 Internal Server Error`: Server-side error

**Error Response Format:**
```json
{
  "error": "Error message description"
}
```

---

## Performance Notes

- All endpoints use MongoDB aggregation pipelines with indexes for optimal performance
- Phase analysis and match over stats are the most compute-intensive queries
- Client-side caching (60 seconds) is recommended for frequently accessed data
- Consider pagination for large result sets (use `limit` parameter where available)

---

## Data Requirements

These endpoints require the following collections to be populated:
- `matches`: Match metadata (teams, venue, date, winner, etc.)
- `deliveries`: Ball-by-ball delivery data (runs, wickets, overs, etc.)

Run the data import script to populate these collections:
```bash
cd backend/src/scripts
node importData.js
```
