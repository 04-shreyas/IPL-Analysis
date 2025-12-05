from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.predictor_live import predict_live_match_state

router = APIRouter()

# Request model
class LivePredictionRequest(BaseModel):
    matchId: int = Field(..., description="Match ID")
    inning: int = Field(..., ge=1, le=2, description="Inning number (1 or 2)")
    overs: float = Field(..., ge=0.0, le=20.0, description="Current overs (e.g., 10.3)")
    currentRuns: int = Field(..., ge=0, description="Current runs scored")
    wickets: int = Field(..., ge=0, le=10, description="Current wickets fallen")

# Response model
class LivePredictionResponse(BaseModel):
    ok: bool
    type: str  # "inning1" or "inning2"
    predicted_final_score: Optional[int] = None  # For inning 1
    predicted_win_prob: Optional[float] = None   # For inning 2
    notes: str

@router.post("/live", response_model=LivePredictionResponse)
async def predict_live(request: LivePredictionRequest):
    """
    Live match prediction endpoint.
    
    For inning 1: Predicts final first innings score
    For inning 2: Predicts win probability for chasing team
    """
    try:
        # Validate input
        if request.inning not in [1, 2]:
            raise HTTPException(status_code=400, detail="Inning must be 1 or 2")
        
        if request.overs < 0 or request.overs > 20:
            raise HTTPException(status_code=400, detail="Overs must be between 0 and 20")
        
        if request.wickets < 0 or request.wickets > 10:
            raise HTTPException(status_code=400, detail="Wickets must be between 0 and 10")
        
        if request.currentRuns < 0:
            raise HTTPException(status_code=400, detail="Current runs cannot be negative")
        
        # Get prediction
        result = predict_live_match_state(
            match_id=request.matchId,
            inning=request.inning,
            overs=request.overs,
            current_runs=request.currentRuns,
            wickets=request.wickets
        )
        
        if not result.get("ok", False):
            raise HTTPException(status_code=500, detail="Prediction failed")
        
        return LivePredictionResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/live/health")
async def live_prediction_health():
    """Health check for live prediction service."""
    return {"status": "healthy", "service": "live_prediction"}
