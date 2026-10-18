"""
Accident Severity Prediction API — FastAPI Backend

Loads the trained XGBoost pipeline from models/ and exposes a /predict endpoint.
Serves the static frontend from static/.
"""

import os
from pathlib import Path
from contextlib import asynccontextmanager

import pandas as pd
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from enum import Enum


# ── Path setup ──────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "accident_severity_model.pkl"
ENCODER_PATH = BASE_DIR / "models" / "severity_label_encoder.pkl"
STATIC_DIR = BASE_DIR / "static"


# ── Global model references ─────────────────────────────────────
pipeline = None
label_encoder = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model and label encoder on startup."""
    global pipeline, label_encoder

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
    if not ENCODER_PATH.exists():
        raise FileNotFoundError(f"Label encoder not found: {ENCODER_PATH}")

    pipeline = joblib.load(MODEL_PATH)
    label_encoder = joblib.load(ENCODER_PATH)
    print(f"[OK] Model loaded from {MODEL_PATH}")
    print(f"[OK] Label encoder loaded - classes: {list(label_encoder.classes_)}")

    yield  # App runs here

    # Cleanup (if needed)
    print("Shutting down...")


# ── Enums for validated input ───────────────────────────────────
class RoadType(str, Enum):
    highway = "highway"
    rural = "rural"
    urban = "urban"


class CurvatureBin(str, Enum):
    straight = "Straight"
    slight_curve = "Slight_Curve"
    moderate_curve = "Moderate_Curve"
    sharp_curve = "Sharp_Curve"


class Lighting(str, Enum):
    daylight = "daylight"
    dim = "dim"
    night = "night"


class Weather(str, Enum):
    clear = "clear"
    foggy = "foggy"
    rainy = "rainy"


class TimeOfDay(str, Enum):
    morning = "morning"
    afternoon = "afternoon"
    evening = "evening"


class SpeedLimit(int, Enum):
    mph_25 = 25
    mph_35 = 35
    mph_45 = 45
    mph_60 = 60
    mph_70 = 70


# ── Request / Response schemas ──────────────────────────────────
class PredictionRequest(BaseModel):
    road_type: RoadType
    curvature_bin: CurvatureBin
    num_lanes: int = Field(ge=1, le=4, description="Number of lanes (1–4)")
    speed_limit: SpeedLimit
    lighting: Lighting
    weather: Weather
    time_of_day: TimeOfDay
    road_signs_present: bool
    public_road: bool
    holiday: bool
    school_season: bool
    num_reported_accidents: int = Field(ge=0, le=7, description="Prior accidents (0–7)")

    model_config = {"json_schema_extra": {
        "examples": [{
            "road_type": "urban",
            "curvature_bin": "Straight",
            "num_lanes": 2,
            "speed_limit": 35,
            "lighting": "daylight",
            "weather": "clear",
            "time_of_day": "morning",
            "road_signs_present": True,
            "public_road": True,
            "holiday": False,
            "school_season": True,
            "num_reported_accidents": 0
        }]
    }}


class PredictionResponse(BaseModel):
    severity: str
    probabilities: dict[str, float]


# ── App ─────────────────────────────────────────────────────────
app = FastAPI(
    title="Accident Severity Predictor",
    description="Predict road accident severity from environmental and road conditions.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.post("/predict", response_model=PredictionResponse)
async def predict(req: PredictionRequest):
    """Predict accident severity from road/environment features."""
    if pipeline is None or label_encoder is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet.")

    # Build a DataFrame row matching the pipeline's expected columns
    # Column order: categorical → numeric → boolean (as defined in the notebook)
    row = pd.DataFrame([{
        "road_type": req.road_type.value,
        "curvature_bin": req.curvature_bin.value,
        "lighting": req.lighting.value,
        "weather": req.weather.value,
        "time_of_day": req.time_of_day.value,
        "num_lanes": req.num_lanes,
        "speed_limit": req.speed_limit.value,
        "num_reported_accidents": req.num_reported_accidents,
        "road_signs_present": int(req.road_signs_present),
        "public_road": int(req.public_road),
        "holiday": int(req.holiday),
        "school_season": int(req.school_season),
    }])

    # Predict
    pred_encoded = pipeline.predict(row)[0]
    pred_label = label_encoder.inverse_transform([pred_encoded])[0]

    # Probabilities
    probabilities = {}
    if hasattr(pipeline.named_steps["classifier"], "predict_proba"):
        probas = pipeline.predict_proba(row)[0]
        for idx, cls_name in enumerate(label_encoder.classes_):
            probabilities[cls_name] = round(float(probas[idx]), 4)
    else:
        # Model doesn't support probabilities — return 1.0 for predicted class
        for cls_name in label_encoder.classes_:
            probabilities[cls_name] = 1.0 if cls_name == pred_label else 0.0

    return PredictionResponse(severity=pred_label, probabilities=probabilities)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "model_loaded": pipeline is not None,
        "classes": list(label_encoder.classes_) if label_encoder else [],
    }


# ── Serve static frontend ──────────────────────────────────────
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
if (STATIC_DIR / "css").exists():
    app.mount("/css", StaticFiles(directory=str(STATIC_DIR / "css")), name="static_css")
if (STATIC_DIR / "js").exists():
    app.mount("/js", StaticFiles(directory=str(STATIC_DIR / "js")), name="static_js")


@app.get("/")
async def root():
    """Serve the main frontend page."""
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "Frontend not built yet. Use /docs for API testing."}
