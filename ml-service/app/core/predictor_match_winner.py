import joblib
import numpy as np
from pathlib import Path
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.features_match_winner import build_single_feature_row

class MatchWinnerPredictor:
    def __init__(self):
        self.model_data = None
        self.model = None
        self.encoders = None
        self.feature_names = None
        self._load_model()
    
    def _load_model(self):
        """Load the trained model and metadata"""
        models_dir = Path(__file__).parent.parent / "models"
        model_path = models_dir / "match_winner_model.pkl"
        
        if not model_path.exists():
            raise FileNotFoundError(
                f"Match winner model not found at {model_path}. "
                "Please train the model first using: python -m app.core.trainer_match_winner"
            )
        
        try:
            self.model_data = joblib.load(model_path)
            self.model = self.model_data['model']
            self.encoders = self.model_data['encoders']
            self.feature_names = self.model_data['feature_names']
            print("Match winner model loaded successfully")
        except Exception as e:
            raise RuntimeError(f"Failed to load match winner model: {str(e)}")
    
    def predict_match_winner(self, input_dict):
        """
        Predict match winner probabilities
        
        Args:
            input_dict: Dictionary with keys:
                - team1 (str): First team name
                - team2 (str): Second team name  
                - venue (str): Match venue
                - tossWinner (str): Toss winning team
                - tossDecision (str): Toss decision (bat/field)
                - season (int): Season year
        
        Returns:
            Dictionary with team1_win_prob and team2_win_prob
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Please check model file.")
        
        try:
            # Build feature row
            feature_row = build_single_feature_row(input_dict, self.encoders)
            
            # Get prediction probabilities
            probabilities = self.model.predict_proba(feature_row)[0]
            
            # probabilities[0] = probability of team2 winning (class 0)
            # probabilities[1] = probability of team1 winning (class 1)
            team1_win_prob = float(probabilities[1])
            team2_win_prob = float(probabilities[0])
            
            return {
                "team1_win_prob": team1_win_prob,
                "team2_win_prob": team2_win_prob,
                "prediction": input_dict['team1'] if team1_win_prob > team2_win_prob else input_dict['team2'],
                "confidence": max(team1_win_prob, team2_win_prob)
            }
            
        except Exception as e:
            raise RuntimeError(f"Prediction failed: {str(e)}")

# Global predictor instance
_predictor = None

def get_predictor():
    """Get or create the global predictor instance"""
    global _predictor
    if _predictor is None:
        _predictor = MatchWinnerPredictor()
    return _predictor

def predict_match_winner(input_dict):
    """
    Convenience function for match winner prediction
    
    Args:
        input_dict: Dictionary with match details
    
    Returns:
        Dictionary with prediction results
    """
    predictor = get_predictor()
    return predictor.predict_match_winner(input_dict)
