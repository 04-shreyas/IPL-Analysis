import pandas as pd
import os
from pathlib import Path


def get_data_path():
    """Get the path to the shared top-level data directory.

    Project layout:
        IPL - Copy/
          backend/
          client/
          ml-service/
          data/   <-- we want this

    This file lives at: ml-service/app/core/data_loader.py
    So we need to go up three levels to reach the project root, then into data/.
    """
    # __file__ -> .../ml-service/app/core/data_loader.py
    # parents[0] = core, [1] = app, [2] = ml-service, [3] = IPL - Copy (project root)
    project_root = Path(__file__).resolve().parents[3]
    return project_root / "data"

def load_matches_data():
    """Load matches_cleaned_original_mode.csv"""
    data_path = get_data_path()
    matches_file = data_path / "matches_cleaned_original_mode.csv"
    
    if not matches_file.exists():
        raise FileNotFoundError(f"Matches file not found: {matches_file}")
    
    df = pd.read_csv(matches_file)
    print(f"Loaded {len(df)} matches from {matches_file}")
    return df

def load_deliveries_data():
    """Load deliveries_cleaned_original_mode.csv"""
    data_path = get_data_path()
    deliveries_file = data_path / "deliveries_cleaned_original_mode.csv"
    
    if not deliveries_file.exists():
        raise FileNotFoundError(f"Deliveries file not found: {deliveries_file}")
    
    df = pd.read_csv(deliveries_file)
    print(f"Loaded {len(df)} deliveries from {deliveries_file}")
    return df

def load_all_data():
    """Load both matches and deliveries data"""
    matches_df = load_matches_data()
    deliveries_df = load_deliveries_data()
    return matches_df, deliveries_df
