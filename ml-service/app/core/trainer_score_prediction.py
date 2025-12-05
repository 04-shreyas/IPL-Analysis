import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
from pathlib import Path
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.data_loader import load_all_data
from app.core.features_score_prediction import build_training_data

def train_score_prediction_model():
    """Train and save the score prediction model"""
    
    print("Loading data...")
    matches_df, deliveries_df = load_all_data()
    
    print("Building training features...")
    X, y, encoders = build_training_data(deliveries_df, matches_df)
    
    if len(X) == 0:
        raise ValueError("No training data available")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"Training set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")
    
    # Train model
    print("Training RandomForest regression model...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\nModel Performance:")
    print(f"Mean Absolute Error: {mae:.2f}")
    print(f"Root Mean Squared Error: {rmse:.2f}")
    print(f"R² Score: {r2:.3f}")
    
    # Feature importance
    feature_names = X.columns.tolist()
    importance_df = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\nTop 5 Feature Importances:")
    print(importance_df.head())
    
    # Show some predictions vs actual
    print(f"\nSample Predictions vs Actual:")
    sample_indices = np.random.choice(len(y_test), min(10, len(y_test)), replace=False)
    for i in sample_indices:
        # y_test is a NumPy array here, so use direct indexing instead of .iloc
        print(f"Predicted: {y_pred[i]:.0f}, Actual: {y_test[i]:.0f}")
    
    # Save model and metadata
    models_dir = Path(__file__).parent.parent / "models"
    models_dir.mkdir(exist_ok=True)
    
    model_data = {
        'model': model,
        'encoders': encoders,
        'feature_names': feature_names,
        'mae': mae,
        'rmse': rmse,
        'r2_score': r2,
        'feature_importance': importance_df.to_dict('records')
    }
    
    model_path = models_dir / "score_prediction_model.pkl"
    joblib.dump(model_data, model_path)
    
    print(f"\nModel saved to: {model_path}")
    print(f"Model training completed successfully!")
    
    return model, encoders, mae

if __name__ == "__main__":
    try:
        train_score_prediction_model()
    except Exception as e:
        print(f"Training failed: {str(e)}")
        sys.exit(1)
