import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import joblib
from pathlib import Path

def build_training_data(matches_df):
    """
    Build training data for match winner prediction
    
    Returns:
        X: Feature DataFrame
        y: Target array (1 if team1 wins, 0 if team2 wins)
        encoders: Dictionary of fitted encoders
    """
    # Create a copy to avoid modifying original
    df = matches_df.copy()
    
    # Filter out matches without a clear winner
    df = df.dropna(subset=['winner'])
    df = df[df['winner'].str.strip() != '']
    
    # Create target variable: 1 if team1 wins, 0 if team2 wins
    df['team1_wins'] = (df['winner'] == df['team1']).astype(int)
    
    # Select features for training
    feature_columns = ['team1', 'team2', 'venue', 'toss_winner', 'toss_decision', 'season']
    
    # Handle missing values
    for col in feature_columns:
        if col in df.columns:
            df[col] = df[col].fillna('Unknown')
    
    # Extract season number from season column (handle formats like 'IPL-2017')
    if 'season' in df.columns:
        season_str = df['season'].astype(str)

        # First try to grab a 4-digit year
        season_year = season_str.str.extract(r'(\d{4})')[0]

        # Fallback: any digits
        season_any = season_str.str.extract(r'(\d+)')[0]

        # Convert to numeric, coercing errors to NaN
        season_num = pd.to_numeric(season_year, errors='coerce')
        season_num = season_num.fillna(pd.to_numeric(season_any, errors='coerce'))
        season_num = season_num.fillna(2008).astype(float)  # Default to first IPL season

        df['season_num'] = season_num
    else:
        df['season_num'] = 2008.0
    
    # Initialize encoders
    encoders = {}
    
    # Encode categorical features
    categorical_features = ['team1', 'team2', 'venue', 'toss_winner', 'toss_decision']
    
    for feature in categorical_features:
        if feature in df.columns:
            encoder = LabelEncoder()
            df[f'{feature}_encoded'] = encoder.fit_transform(df[feature].astype(str))
            encoders[feature] = encoder
    
    # Create feature matrix
    feature_cols = [f'{f}_encoded' for f in categorical_features if f in df.columns] + ['season_num']
    X = df[feature_cols].copy()
    y = df['team1_wins'].values
    
    print(f"Built training data: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"Target distribution: {np.bincount(y)}")
    
    return X, y, encoders

def build_single_feature_row(input_dict, encoders):
    """
    Build feature row for a single prediction
    
    Args:
        input_dict: Dictionary with keys: team1, team2, venue, tossWinner, tossDecision, season
        encoders: Dictionary of fitted encoders
    
    Returns:
        Feature array for prediction
    """
    features = {}
    
    # Map input keys to feature names
    key_mapping = {
        'team1': 'team1',
        'team2': 'team2', 
        'venue': 'venue',
        'tossWinner': 'toss_winner',
        'tossDecision': 'toss_decision',
        'season': 'season'
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
    
    # Create feature array in correct order
    feature_order = [f'{f}_encoded' for f in ['team1', 'team2', 'venue', 'toss_winner', 'toss_decision'] if f in encoders] + ['season_num']
    feature_array = np.array([features.get(col, 0) for col in feature_order]).reshape(1, -1)
    
    return feature_array
