import joblib
import numpy as np
from pathlib import Path
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.features_score_prediction import build_single_feature_row

class ScorePredictor:
    def __init__(self):
        self.model_data = None
        self.model = None
        self.encoders = None
        self.feature_names = None
        self._load_model()
    
    def _load_model(self):
        """Load the trained model and metadata"""
        models_dir = Path(__file__).parent.parent / "models"
        model_path = models_dir / "score_prediction_model.pkl"
        
        if not model_path.exists():
            raise FileNotFoundError(
                f"Score prediction model not found at {model_path}. "
                "Please train the model first using: python -m app.core.trainer_score_prediction"
            )
        
        try:
            self.model_data = joblib.load(model_path)
            self.model = self.model_data['model']
            self.encoders = self.model_data['encoders']
            self.feature_names = self.model_data['feature_names']
            print("Score prediction model loaded successfully")
        except Exception as e:
            raise RuntimeError(f"Failed to load score prediction model: {str(e)}")
    
    def predict_score(self, input_dict):
        """
        Predict final first innings score
        
        Args:
            input_dict: Dictionary with keys:
                - battingTeam (str): Batting team name
                - bowlingTeam (str): Bowling team name
                - venue (str): Match venue
                - season (int): Season year
                - currentRuns (int): Current runs scored
                - wickets (int): Current wickets lost
                - overs (float): Current overs completed
        
        Returns:
            Dictionary with predicted_score
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Please check model file.")
        
        try:
            # Build feature row
            feature_row = build_single_feature_row(input_dict, self.encoders)
            
            # Get prediction
            predicted_score = self.model.predict(feature_row)[0]
            
            # Ensure reasonable bounds
            predicted_score = max(50, min(300, predicted_score))
            
            # Calculate additional insights
            current_runs = input_dict.get('currentRuns', 0)
            current_overs = input_dict.get('overs', 0)
            wickets = input_dict.get('wickets', 0)
            
            # Calculate projected additional runs
            additional_runs = max(0, predicted_score - current_runs)
            
            # Calculate current run rate
            current_run_rate = current_runs / max(current_overs, 0.1) if current_overs > 0 else 0
            
            # Calculate required run rate for remaining overs
            remaining_overs = max(0, 20 - current_overs)
            required_run_rate = additional_runs / max(remaining_overs, 0.1) if remaining_overs > 0 else 0
            
            return {
                "predicted_score": float(predicted_score),
                "current_runs": current_runs,
                "additional_runs_needed": float(additional_runs),
                "current_run_rate": float(current_run_rate),
                "required_run_rate": float(required_run_rate),
                "wickets_in_hand": max(0, 10 - wickets),
                "overs_remaining": float(remaining_overs)
            }
            
        except Exception as e:
            raise RuntimeError(f"Prediction failed: {str(e)}")

# Global predictor instance
_predictor = None

def get_predictor():
    """Get or create the global predictor instance"""
    global _predictor
    if _predictor is None:
        _predictor = ScorePredictor()
    return _predictor

def predict_score(input_dict):
    """
    Convenience function for score prediction
    
    Args:
        input_dict: Dictionary with match state details
    
    Returns:
        Dictionary with prediction results
    """
    predictor = get_predictor()
    return predictor.predict_score(input_dict)
