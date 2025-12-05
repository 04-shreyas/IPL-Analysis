# IPL Analytics

A full-stack IPL (Indian Premier League) analytics project with:

- **Backend** (Node.js + Express + MongoDB) providing cricket analytics APIs.
- **Client** (React) for interactive dashboards and visualizations.
- **ML Service** (FastAPI + Python) for prediction endpoints.

This README explains how to set up the project locally and run all services.

---

## 1. Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (comes with Node.js)
- **Python 3.9+**
- **pip** (Python package manager)
- **MongoDB** running locally on `mongodb://localhost:27017`

Make sure MongoDB is running before you start the backend or import data.

---

## 2. Project Structure

```text
IPL/
  backend/        # Node/Express API + MongoDB models and controllers
  client/         # React frontend
  ml-service/     # FastAPI ML service for predictions
  docs/           # Documentation (feature_overview, backend endpoint docs, etc.)
```

Key docs:

- `docs/feature_overview.txt` – page-by-page overview of all features.
- `backend/docs/analytics_endpoints.md` – examples of advanced analytics API calls.

---

## 3. Backend Setup (Node/Express)

1. Open a terminal in the `backend` folder:

   ```bash
   cd "S:/IPL/backend"
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. (Optional) Configure environment variables:

   Create a `.env` file in `backend/` if you want to override defaults:

   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/ipl
   ```

4. Import IPL data into MongoDB (matches, deliveries, teams, players):

   ```bash
   # Windows PowerShell example
   $env:IMPORT_CLEAR="true"
   npm run import:data
   ```

   This clears existing data (if any) and re-imports from the CSV files bundled with the project.

5. Start the backend API server:

   ```bash
   npm run dev
   ```

   The server should start on `http://localhost:5000`.

---

## 4. ML Service Setup (FastAPI)

1. Open a terminal in the `ml-service` folder:

   ```bash
   cd "S:/IPL/ml-service"
   ```

2. Create and activate a virtual environment (recommended):

   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # PowerShell / CMD on Windows
   ```

3. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI server with Uvicorn:

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

   The ML service will be available at `http://localhost:8000`.

   The backend expects prediction endpoints at:

   - `http://localhost:8000/ml/predict/live` (and any others defined in `app.main`).

---

## 5. Client Setup (React)

1. Open a terminal in the `client` folder:

   ```bash
   cd "S:/IPL/client"
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the React development server:

   ```bash
   npm start
   ```

4. Open the app in your browser:

   ```
   http://localhost:3000
   ```

   The client is configured (via `client/src/api/apiClient.js`) to talk to:

   - Backend API at `http://localhost:5000/api`
   - ML service at `http://localhost:8000`

Ensure both the backend and ML service are running for all features to work (predictions, advanced analytics, etc.).

---

## 6. Main Features

High-level overview (see `docs/feature_overview.txt` for full details):

- **Home dashboard** with tournament summary stats.
- **Head-to-Head** comparisons between teams with optional season filter.
- **Player Analytics** and **Bowler Analytics** with season filters and detailed charts.
- **Venue Analytics** (merged metrics + analytics) with top teams, batsmen, and bowlers.
- **Umpire Statistics** with career overview and charts.
- **Match Details** and **Match Timeline** with advanced over-by-over charts.
- **Phase Analysis**, **Impact Index**, and **Rival Battle** advanced analytics modules.

---

## 7. Running Everything Together

Typical workflow:

1. **Start MongoDB** locally.
2. **Import data** (only needed once or when refreshing data):

   ```bash
   cd "S:/IPL/backend"
   $env:IMPORT_CLEAR="true"  # PowerShell
   npm run import:data
   ```

3. **Run backend**:

   ```bash
   cd "S:/IPL/backend"
   npm run dev
   ```

4. **Run ML service**:

   ```bash
   cd "S:/IPL/ml-service"
   .venv\Scripts\activate
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

5. **Run frontend**:

   ```bash
   cd "S:/IPL/client"
   npm start
   ```

Once all three are running, open `http://localhost:3000` in your browser and explore the dashboards.

---

## 8. Notes

- This project assumes the classic IPL seasons **2008–2019** for all season-based filters.
- If you change ports or hostnames, update the API base URLs in `client/src/api/apiClient.js` accordingly.
- For production deployment, you would typically:
  - Host MongoDB on a managed database service.
  - Run the backend and ML service behind a reverse proxy.
  - Build the React app (`npm run build`) and serve the static files from a web server.
