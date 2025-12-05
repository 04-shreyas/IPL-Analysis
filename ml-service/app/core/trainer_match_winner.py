import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
from pathlib import Path
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.data_loader import load_matches_data
from app.core.features_match_winner import build_training_data

def train_match_winner_model():
    """Train and save the match winner prediction model"""
    
    print("Loading matches data...")
    matches_df = load_matches_data()
    
    print("Building training features...")
    X, y, encoders = build_training_data(matches_df)
    
    if len(X) == 0:
        raise ValueError("No training data available")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Training set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")
    
    # Train model
    print("Training RandomForest model...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\nModel Performance:")
    print(f"Accuracy: {accuracy:.3f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Feature importance
    feature_names = X.columns.tolist()
    importance_df = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\nTop 5 Feature Importances:")
    print(importance_df.head())
    
    # Save model and metadata
    models_dir = Path(__file__).parent.parent / "models"
    models_dir.mkdir(exist_ok=True)
    
    model_data = {
        'model': model,
        'encoders': encoders,
        'feature_names': feature_names,
        'accuracy': accuracy,
        'feature_importance': importance_df.to_dict('records')
    }
    
    model_path = models_dir / "match_winner_model.pkl"
    joblib.dump(model_data, model_path)
    
    print(f"\nModel saved to: {model_path}")
    print(f"Model training completed successfully!")
    
    return model, encoders, accuracy

if __name__ == "__main__":
    try:
        train_match_winner_model()
    except Exception as e:
        print(f"Training failed: {str(e)}")
        sys.exit(1)
