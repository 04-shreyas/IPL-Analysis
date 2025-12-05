from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.predictor_match_winner import predict_match_winner
from app.core.predictor_score_prediction import predict_score

router = APIRouter()

# Request models
class MatchWinnerRequest(BaseModel):
    team1: str
    team2: str
    venue: str
    tossWinner: str
    tossDecision: str
    season: int

class ScorePredictionRequest(BaseModel):
    battingTeam: str
    bowlingTeam: str
    venue: str
    season: int
    currentRuns: int = 0
    wickets: int = 0
    overs: float = 0.0

# Response models
class MatchWinnerResponse(BaseModel):
    team1_win_prob: float
    team2_win_prob: float
    prediction: str
    confidence: float
    success: bool = True

class ScorePredictionResponse(BaseModel):
    predicted_score: float
    current_runs: int
    additional_runs_needed: float
    current_run_rate: float
    required_run_rate: float
    wickets_in_hand: int
    overs_remaining: float
    success: bool = True

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    message: str

@router.post("/match-winner", response_model=MatchWinnerResponse)
async def predict_match_winner_endpoint(request: MatchWinnerRequest):
    """
    Predict the winner of a cricket match based on pre-match conditions
    
    - **team1**: First team name
    - **team2**: Second team name
    - **venue**: Match venue
    - **tossWinner**: Team that won the toss
    - **tossDecision**: Toss decision (bat/field)
    - **season**: Season year (e.g., 2023)
    """
    try:
        # Convert request to dictionary
        input_dict = {
            "team1": request.team1,
            "team2": request.team2,
            "venue": request.venue,
            "tossWinner": request.tossWinner,
            "tossDecision": request.tossDecision,
            "season": request.season
        }
        
        # Get prediction
        result = predict_match_winner(input_dict)
        
        return MatchWinnerResponse(**result)
        
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "success": False,
                "error": "Model not available",
                "message": "Match winner prediction model not found. Please train the model first."
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "Prediction failed",
                "message": str(e)
            }
        )

@router.post("/score", response_model=ScorePredictionResponse)
async def predict_score_endpoint(request: ScorePredictionRequest):
    """
    Predict the final first innings score based on current match state
    
    - **battingTeam**: Team currently batting
    - **bowlingTeam**: Team currently bowling
    - **venue**: Match venue
    - **season**: Season year (e.g., 2023)
    - **currentRuns**: Current runs scored (default: 0)
    - **wickets**: Current wickets lost (default: 0)
    - **overs**: Current overs completed (default: 0.0)
    """
    try:
        # Validate input ranges
        if request.wickets < 0 or request.wickets > 10:
            raise ValueError("Wickets must be between 0 and 10")
        
        if request.overs < 0 or request.overs > 20:
            raise ValueError("Overs must be between 0 and 20")
        
        if request.currentRuns < 0:
            raise ValueError("Current runs cannot be negative")
        
        # Convert request to dictionary
        input_dict = {
            "battingTeam": request.battingTeam,
            "bowlingTeam": request.bowlingTeam,
            "venue": request.venue,
            "season": request.season,
            "currentRuns": request.currentRuns,
            "wickets": request.wickets,
            "overs": request.overs
        }
        
        # Get prediction
        result = predict_score(input_dict)
        
        return ScorePredictionResponse(**result)
        
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "success": False,
                "error": "Model not available",
                "message": "Score prediction model not found. Please train the model first."
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error": "Invalid input",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "Prediction failed",
                "message": str(e)
            }
        )

@router.get("/status")
async def prediction_status():
    """Check the status of prediction models"""
    try:
        from app.core.predictor_match_winner import get_predictor as get_match_predictor
        from app.core.predictor_score_prediction import get_predictor as get_score_predictor
        
        status = {
            "match_winner_model": "available",
            "score_prediction_model": "available",
            "status": "ready"
        }
        
        # Try to load predictors to verify models are available
        try:
            get_match_predictor()
        except FileNotFoundError:
            status["match_winner_model"] = "not_trained"
            status["status"] = "partial"
        except Exception as e:
            status["match_winner_model"] = f"error: {str(e)}"
            status["status"] = "error"
        
        try:
            get_score_predictor()
        except FileNotFoundError:
            status["score_prediction_model"] = "not_trained"
            status["status"] = "partial"
        except Exception as e:
            status["score_prediction_model"] = f"error: {str(e)}"
            status["status"] = "error"
        
        return status
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
