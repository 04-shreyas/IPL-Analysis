import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import joblib

def build_training_data(deliveries_df, matches_df):
    """
    Build training data for first innings score prediction
    
    Returns:
        X: Feature DataFrame
        y: Target array (final first innings scores)
        encoders: Dictionary of fitted encoders
    """
    # Merge deliveries with matches to get additional context
    deliveries_with_matches = deliveries_df.merge(
        matches_df[['id', 'season', 'venue', 'team1', 'team2']], 
        left_on='match_id', 
        right_on='id', 
        how='left'
    )
    
    # Filter for first innings only
    first_innings = deliveries_with_matches[deliveries_with_matches['inning'] == 1].copy()

    # Derive a wicket flag from player_dismissed (since there is no explicit is_wicket column)
    first_innings['is_wicket_flag'] = (
        first_innings['player_dismissed']
        .fillna('')
        .astype(str)
        .str.strip()
        .ne('')
        .astype(int)
    )
    
    # Calculate cumulative statistics for each match
    first_innings['cumulative_runs'] = first_innings.groupby('match_id')['total_runs'].cumsum()
    first_innings['cumulative_wickets'] = first_innings.groupby('match_id')['is_wicket_flag'].cumsum()
    
    # Calculate over number (ball 1-6 of each over)
    first_innings['over_num'] = (first_innings['ball'] - 1) // 6
    first_innings['ball_in_over'] = ((first_innings['ball'] - 1) % 6) + 1
    
    # Get final statistics for each match (last ball of first innings)
    match_final_stats = first_innings.groupby('match_id').agg({
        'cumulative_runs': 'last',
        'cumulative_wickets': 'last',
        'over_num': 'last',
        'batting_team': 'first',
        'bowling_team': 'first',
        'season': 'first',
        'venue': 'first'
    }).reset_index()
    
    # Rename columns for clarity
    match_final_stats.rename(columns={
        'cumulative_runs': 'final_score',
        'cumulative_wickets': 'final_wickets',
        'over_num': 'final_over'
    }, inplace=True)
    
    # Handle missing values
    match_final_stats['venue'] = match_final_stats['venue'].fillna('Unknown')
    match_final_stats['batting_team'] = match_final_stats['batting_team'].fillna('Unknown')
    match_final_stats['bowling_team'] = match_final_stats['bowling_team'].fillna('Unknown')
    
    # Extract season number (handle formats like 'IPL-2017')
    season_str = match_final_stats['season'].astype(str)

    # First try to grab a 4-digit year
    season_year = season_str.str.extract(r'(\d{4})')[0]

    # Fallback: any digits
    season_any = season_str.str.extract(r'(\d+)')[0]

    # Convert to numeric, coercing errors to NaN
    season_num = pd.to_numeric(season_year, errors='coerce')
    season_num = season_num.fillna(pd.to_numeric(season_any, errors='coerce'))
    season_num = season_num.fillna(2008).astype(float)

    match_final_stats['season_num'] = season_num
    
    # Initialize encoders
    encoders = {}
    
    # Encode categorical features
    categorical_features = ['batting_team', 'bowling_team', 'venue']
    
    for feature in categorical_features:
        encoder = LabelEncoder()
        match_final_stats[f'{feature}_encoded'] = encoder.fit_transform(match_final_stats[feature].astype(str))
        encoders[feature] = encoder
    
    # Create feature matrix
    feature_cols = [f'{f}_encoded' for f in categorical_features] + ['season_num', 'final_wickets', 'final_over']
    X = match_final_stats[feature_cols].copy()
    y = match_final_stats['final_score'].values
    
    # Remove outliers (scores > 300 or < 50 are likely data errors)
    valid_mask = (y >= 50) & (y <= 300)
    X = X[valid_mask]
    y = y[valid_mask]
    
    print(f"Built training data: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"Score range: {y.min():.0f} - {y.max():.0f}, Mean: {y.mean():.1f}")
    
    return X, y, encoders

def build_single_feature_row(input_dict, encoders):
    """
    Build feature row for a single score prediction
    
    Args:
        input_dict: Dictionary with keys: battingTeam, bowlingTeam, venue, season, currentRuns, wickets, overs
        encoders: Dictionary of fitted encoders
    
    Returns:
        Feature array for prediction
    """
    features = {}
    
    # Map input keys to feature names
    key_mapping = {
        'battingTeam': 'batting_team',
        'bowlingTeam': 'bowling_team',
        'venue': 'venue'
    }
    
    # Encode categorical features
    for input_key, feature_name in key_mapping.items():
        if input_key in input_dict and feature_name in encoders:
            value = str(input_dict[input_key])
            encoder = encoders[feature_name]
            
            # Handle unseen categories
            try:
                encoded_value = encoder.transform([value])[0]
            except ValueError:
                # Use the most frequent class for unseen categories
                encoded_value = 0
            
            features[f'{feature_name}_encoded'] = encoded_value
    
    # Handle season
    if 'season' in input_dict:
        season_str = str(input_dict['season'])
        if season_str.isdigit():
            features['season_num'] = float(season_str)
        else:
            # Extract year from formats like 'IPL-2017'
            import re
            match = re.search(r'(\d{4})', season_str)
            features['season_num'] = float(match.group(1)) if match else 2008.0
    else:
        features['season_num'] = 2008.0
    
    # Add current match state features
    features['final_wickets'] = float(input_dict.get('wickets', 0))
    features['final_over'] = float(input_dict.get('overs', 0))
    
    # Create feature array in correct order
    feature_order = [f'{f}_encoded' for f in ['batting_team', 'bowling_team', 'venue']] + ['season_num', 'final_wickets', 'final_over']
    feature_array = np.array([features.get(col, 0) for col in feature_order]).reshape(1, -1)
    
    return feature_array
