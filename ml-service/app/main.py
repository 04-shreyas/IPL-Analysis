from fastapi import FastAPI
from app.routes.health import router as health_router
from app.routes.predict import router as predict_router
from app.routes.predict_live import router as predict_live_router

app = FastAPI(
    title="IPL Analytics ML Service", 
    version="1.0.0",
    description="Machine Learning service for IPL match predictions and score forecasting"
)

app.include_router(health_router, prefix="/ml")
app.include_router(predict_router, prefix="/ml/predict")
app.include_router(predict_live_router, prefix="/ml/predict")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
