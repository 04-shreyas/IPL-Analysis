IPL Analytics Platform
Full-Stack MERN + FastAPI ML + Advanced Cricket Analytics (2008–2019)

A complete, end-to-end IPL analytics system built using MongoDB, Express, React, Node.js, and FastAPI with machine learning support.
This platform provides team analytics, player insights, ball-by-ball match breakdowns, over-by-over visualizations, and ML-driven predictions for IPL seasons 2008–2019.

🚀 Key Highlights

Full-stack architecture with 3 coordinated services

Real IPL datasets from 2008–2019

Machine learning models for match winner and score prediction

Deep cricket analytics:

Phase analysis (PP / Middle / Death)

Rival battles (batsman vs bowler)

Impact Index scoring engine

Venue metrics

Complete match timelines + over-by-over stats

Team → Season → Match → Ball-by-Ball drilldown

Extensible modular structure for new analytics modules

📂 Project Structure
IPL/
  backend/        # Node/Express REST API + MongoDB models
  client/         # React frontend (Vite)
  ml-service/     # FastAPI ML microservice
  data/           # CSV/XLSX IPL data (2008–2019)
  docs/           # Documentation + API references
  README.md
  .gitignore

🧠 Architecture Overview
+-------------------+         +------------------------+
|     React UI      | <---->  |      Node Backend      |
|  (client, Vite)   |  API    | Express + MongoDB       |
+-------------------+         +------------------------+
           |                               |
           | ML calls                      | Data access
           v                               v
+------------------------------------------------------+
|            FastAPI ML Service (Python)               |
|   - Match Winner Model (Classification)              |
|   - Score Prediction Model (Regression)              |
+------------------------------------------------------+


React ↔ Backend for analytics and match data
Backend ↔ ML Service for predictions
Backend ↔ MongoDB for structured IPL stats
React ↔ ML Service (optional) for live simulation tools

🛠 Tech Stack
Frontend

React (Vite)

Recharts (visualizations)

Axios

Backend

Node.js + Express

MongoDB + Mongoose

CSV ingestion scripts

Aggregation pipelines for advanced analytics

ML Service

Python 3.9+

FastAPI + Uvicorn

scikit-learn

pandas / numpy

Joblib for model persistence

📊 Main Features
✔ Home Dashboard

Total matches

Matches per season

Wins per team

✔ Teams Module

Team details

Season-wise stats

Team → Season → Matches → Ball-by-ball drilldown

✔ Player Analytics

Career stats

Season performance

Strike rate trends

Bowler difficulty

✔ Bowler Analytics

Economy

Wickets by phase

Venue performance

✔ Venue Analytics

First-innings averages

Toss impact

Best teams & players per venue

✔ Head-to-Head

Win rates

Historic dominance

Match summaries

✔ Match Details

Full scorecard

Fall of wickets

Over-by-over stats

Manhattan & Worm charts

✔ Advanced Analytics

Phase analysis (PP/Middle/Death)

Impact Index (scoring engine)

Rival Battle (batsman vs bowler)

Over aggregation endpoint for charts

✔ ML Predictions

Pre-match winner probabilities

First-innings final score prediction

Live prediction endpoint (optional)

📦 Installing the Project

All paths assume your directory is:
IPL/

1️⃣ Backend Setup (Node + Express)
cd IPL/backend
npm install


Create .env if needed:

PORT=5000
MONGO_URI=mongodb://localhost:27017/ipl

Import Data (first time only)
$env:IMPORT_CLEAR="true"  # PowerShell
npm run import:data

Start Backend
npm run dev


Backend runs at:
http://localhost:5000/api

2️⃣ ML Service Setup (FastAPI)
cd IPL/ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

Start ML API
uvicorn app.main:app --host 0.0.0.0 --port 8000


ML runs at:
http://localhost:8000/ml/...

3️⃣ Frontend Setup (React)
cd IPL/client
npm install
npm start


Frontend runs at:
http://localhost:3000

🧪 Running Everything Together

Start MongoDB

Start backend

Start ML service

Start frontend

Now open:

➡️ http://localhost:3000

📁 Data Assumptions

Dataset covers IPL seasons 2008–2019 including:

matches.csv

deliveries.csv

teams.csv

players.xlsx

teamwise_home_away.csv

most_runs_average_strikerate.csv

If you provide newer seasons, update import scripts accordingly.

🧩 API Summary (Short)
Backend /api
Endpoint	Description
/teams	All teams
/teams/:name	Team profile
/matches	Matches list
/matches/:matchId	Full match details
/matches/:matchId/overs	Over-aggregated stats
/analytics/phase	Phase analysis
/analytics/impact	Impact Index
/analytics/venues/:venue/metrics	Venue analytics
/analytics/rival	Batsman vs bowler battle
ML /ml
Endpoint	Description
/ml/predict/match-winner	Pre-match prediction
/ml/predict/score	First-innings score prediction
/ml/predict/live	In-match simulation (optional)

Complete details in:
docs/feature_overview.txt
backend/docs/analytics_endpoints.md

📜 Notes

Works only with IPL 2008–2019 data

For deployments:

Host MongoDB externally

Deploy backend (Node)

Deploy ML (FastAPI)

Build and serve React frontend

Update API base URL in client/src/api/apiClient.js if deploying
