import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, Tuple
import os
from pathlib import Path

from app.core.data_loader import load_matches_data, load_deliveries_data
from app.core.predictor_score_prediction import predict_score


def predict_live_match_state(
    match_id: int,
    inning: int,
    overs: float,
    current_runs: int,
    wickets: int
) -> Dict[str, Any]:
    """
    Predict live match state based on current situation.
    
    Args:
        match_id: Match identifier
        inning: 1 or 2
        overs: Current overs (e.g., 10.3)
        current_runs: Current runs scored
        wickets: Current wickets fallen
        
    Returns:
        Dictionary with prediction results
    """
    try:
        # Load data
        matches_df = load_matches_data()
        deliveries_df = load_deliveries_data()
        
        # Find match details
        match_info = matches_df[matches_df['match_id'] == match_id]
        if match_info.empty:
            # Use heuristic if match not found
            return _heuristic_prediction(inning, overs, current_runs, wickets)
        
        match_row = match_info.iloc[0]
        
        if inning == 1:
            return _predict_first_innings_score(
                match_row, overs, current_runs, wickets, deliveries_df
            )
        else:
            return _predict_chase_probability(
                match_row, overs, current_runs, wickets, deliveries_df
            )
            
    except Exception as e:
        print(f"Error in live prediction: {e}")
        # Fall back to heuristic
        return _heuristic_prediction(inning, overs, current_runs, wickets)


def _predict_first_innings_score(
    match_row: pd.Series,
    overs: float,
    current_runs: int,
    wickets: int,
    deliveries_df: pd.DataFrame
) -> Dict[str, Any]:
    """Predict final first innings score."""
    
    # Try to use existing score prediction model
    try:
        # Check if we have trained models
        models_path = Path(__file__).resolve().parents[1] / "models"
        if (models_path / "score_prediction_model.pkl").exists():
            # Use the existing score predictor
            prediction_result = predict_score(
                battingTeam=match_row.get('team1', 'Unknown'),
                bowlingTeam=match_row.get('team2', 'Unknown'),
                venue=match_row.get('venue', 'Unknown'),
                season=int(match_row.get('season', 2019)),
                currentRuns=current_runs,
                wickets=wickets,
                overs=overs
            )
            
            return {
                "ok": True,
                "type": "inning1",
                "predicted_final_score": round(prediction_result.get('predicted_score', current_runs)),
                "notes": "used model"
            }
    except Exception as e:
        print(f"Model prediction failed: {e}")
    
    # Fall back to heuristic
    return _heuristic_first_innings_score(overs, current_runs, wickets)


def _predict_chase_probability(
    match_row: pd.Series,
    overs: float,
    current_runs: int,
    wickets: int,
    deliveries_df: pd.DataFrame
) -> Dict[str, Any]:
    """Predict chase win probability."""
    
    # Get target from match data or estimate
    target = match_row.get('firstInningsScore', 160)  # Default if not available
    if pd.isna(target) or target == 0:
        # Try to get from deliveries
        match_deliveries = deliveries_df[deliveries_df['match_id'] == match_row['match_id']]
        if not match_deliveries.empty:
            first_innings = match_deliveries[match_deliveries['inning'] == 1]
            target = first_innings['total_runs'].sum() if not first_innings.empty else 160
        else:
            target = 160
    
    required_runs = target - current_runs
    overs_remaining = 20.0 - overs
    
    if overs_remaining <= 0:
        # Match over
        win_prob = 1.0 if current_runs >= target else 0.0
        return {
            "ok": True,
            "type": "inning2",
            "predicted_win_prob": win_prob,
            "notes": "match completed"
        }
    
    if required_runs <= 0:
        # Already won
        return {
            "ok": True,
            "type": "inning2",
            "predicted_win_prob": 1.0,
            "notes": "target achieved"
        }
    
    # Try historical analysis
    try:
        win_prob = _calculate_chase_probability_from_history(
            deliveries_df, required_runs, overs_remaining, wickets
        )
        return {
            "ok": True,
            "type": "inning2",
            "predicted_win_prob": round(win_prob, 3),
            "notes": "used historical data"
        }
    except Exception as e:
        print(f"Historical analysis failed: {e}")
        # Fall back to heuristic
        return _heuristic_chase_probability(required_runs, overs_remaining, wickets)


def _calculate_chase_probability_from_history(
    deliveries_df: pd.DataFrame,
    required_runs: int,
    overs_remaining: float,
    wickets: int
) -> float:
    """Calculate win probability based on historical similar situations."""
    
    # Define similar situations (bucketing)
    over_bucket = int(overs_remaining)  # Round down overs remaining
    wicket_bucket = min(wickets, 7)  # Cap at 7 wickets
    required_rr = required_runs / overs_remaining if overs_remaining > 0 else 20
    rr_bucket = round(required_rr)  # Round required run rate
    
    # Find similar situations in historical data
    # Group deliveries by match and inning to get match states
    match_states = []
    
    for match_id in deliveries_df['match_id'].unique():
        match_deliveries = deliveries_df[deliveries_df['match_id'] == match_id]
        
        # Get second innings only
        second_innings = match_deliveries[match_deliveries['inning'] == 2]
        if second_innings.empty:
            continue
            
        # Get first innings total
        first_innings = match_deliveries[match_deliveries['inning'] == 1]
        if first_innings.empty:
            continue
            
        first_innings_total = first_innings['total_runs'].sum()
        
        # Track running totals and wickets
        running_runs = 0
        running_wickets = 0
        
        for _, delivery in second_innings.iterrows():
            running_runs += delivery['total_runs']
            if pd.notna(delivery['player_dismissed']) and delivery['player_dismissed'] != '':
                running_wickets += 1
            
            current_over = delivery['over'] + (delivery['ball'] / 10.0)
            overs_left = 20.0 - current_over
            runs_needed = first_innings_total - running_runs
            
            if overs_left > 0 and overs_left <= 15:  # Only consider meaningful states
                state_rr = runs_needed / overs_left if overs_left > 0 else 20
                
                # Check if this state is similar to our query
                if (abs(overs_left - overs_remaining) <= 2 and
                    abs(running_wickets - wickets) <= 1 and
                    abs(state_rr - required_rr) <= 2):
                    
                    # Determine if team won from this state
                    final_runs = second_innings['total_runs'].sum()
                    won = final_runs >= first_innings_total
                    
                    match_states.append({
                        'overs_left': overs_left,
                        'wickets': running_wickets,
                        'required_rr': state_rr,
                        'won': won
                    })
    
    if len(match_states) < 5:  # Not enough data, use heuristic
        return _heuristic_chase_probability_value(required_runs, overs_remaining, wickets)
    
    # Calculate win percentage from similar states
    wins = sum(1 for state in match_states if state['won'])
    win_probability = wins / len(match_states)
    
    return max(0.0, min(1.0, win_probability))  # Clamp between 0 and 1


def _heuristic_prediction(inning: int, overs: float, current_runs: int, wickets: int) -> Dict[str, Any]:
    """Fallback heuristic prediction when no data/models available."""
    
    if inning == 1:
        return _heuristic_first_innings_score(overs, current_runs, wickets)
    else:
        # Assume target of 160 for heuristic
        required_runs = 160 - current_runs
        overs_remaining = 20.0 - overs
        return _heuristic_chase_probability(required_runs, overs_remaining, wickets)


def _heuristic_first_innings_score(overs: float, current_runs: int, wickets: int) -> Dict[str, Any]:
    """Heuristic first innings score prediction."""
    
    overs_remaining = 20.0 - overs
    current_rr = current_runs / overs if overs > 0 else 0
    
    # Adjust run rate based on wickets
    wicket_factor = max(0.7, 1.0 - (wickets * 0.05))  # Reduce rate as wickets fall
    
    # Project remaining runs
    if overs_remaining > 0:
        projected_rr = current_rr * wicket_factor
        remaining_runs = projected_rr * overs_remaining
        
        # Add death overs boost if applicable
        if overs >= 15:
            death_overs = min(5, overs_remaining)
            remaining_runs += death_overs * 2  # Extra 2 runs per death over
    else:
        remaining_runs = 0
    
    predicted_score = current_runs + remaining_runs
    
    return {
        "ok": True,
        "type": "inning1",
        "predicted_final_score": round(max(current_runs, predicted_score)),
        "notes": "used heuristic"
    }


def _heuristic_chase_probability(required_runs: int, overs_remaining: float, wickets: int) -> Dict[str, Any]:
    """Heuristic chase probability calculation."""
    
    win_prob = _heuristic_chase_probability_value(required_runs, overs_remaining, wickets)
    
    return {
        "ok": True,
        "type": "inning2",
        "predicted_win_prob": round(win_prob, 3),
        "notes": "used heuristic"
    }


def _heuristic_chase_probability_value(required_runs: int, overs_remaining: float, wickets: int) -> float:
    """Calculate heuristic chase win probability."""
    
    if overs_remaining <= 0:
        return 0.0 if required_runs > 0 else 1.0
    
    if required_runs <= 0:
        return 1.0
    
    required_rr = required_runs / overs_remaining
    wickets_remaining = 10 - wickets
    
    # Base probability based on required run rate
    if required_rr <= 6:
        base_prob = 0.8
    elif required_rr <= 8:
        base_prob = 0.6
    elif required_rr <= 10:
        base_prob = 0.4
    elif required_rr <= 12:
        base_prob = 0.25
    else:
        base_prob = 0.1
    
    # Adjust for wickets remaining
    wicket_factor = min(1.0, wickets_remaining / 6.0)
    
    # Adjust for overs remaining
    if overs_remaining < 2:
        time_factor = 0.5  # Pressure situation
    elif overs_remaining > 10:
        time_factor = 1.1  # Plenty of time
    else:
        time_factor = 1.0
    
    win_prob = base_prob * wicket_factor * time_factor
    
    return max(0.0, min(1.0, win_prob))
