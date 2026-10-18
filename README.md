# 🛣️ Sentinel — Road Accident Severity Detection & Telemetry Radar

An **immersive road-perspective interactive web application** and machine learning system for real-time **Road Accident Severity Prediction** (`Low`, `Medium`, `High`).

Built with **FastAPI**, **XGBoost**, and an **HTML5 Canvas 3D Road Perspective Engine**, allowing users to experience simulated road and environmental telemetry as if sitting in the driver's seat.

---

## 📸 Key Features

- **3D Perspective Roadway Simulation**: Real-time canvas engine projecting road curvature (straight to hairpin bend), speed-synced dashed lane markings, dynamic lane counts (1–4 lanes), atmospheric day/dusk/night lighting with headlights, and physics-based particle rain/fog.
- **Full 12-Feature Automotive Cockpit Matrix**: Controls for all environmental, geometric, infrastructure, and historical features styled into clean cockpit instrument panels.
- **Instant AI Inference & Severity Radar**: Sub-10ms predictions served by FastAPI XGBoost pipeline with animated severity gauge and 3-class probability breakdown (`Low`, `Medium`, `High`).
- **Explainable AI Hazard Drivers**: Identifies and flags primary risk contributors (e.g. wet road grip, night sight horizon, speed > 60 MPH, 3+ prior collisions).
- **Authentic US MUTCD Road Signs**: Dynamically updating speed limit signs, caution diamond curve arrows, weather advisory panels, and school zone pentagon signs.
- **Synthesized Audio Engine**: Zero-dependency Web Audio acoustics providing ambient engine hum and severity-specific audio alerts.
- **Interactive Keyboard Hotkeys**: Spacebar to analyze risk, `1`-`4` for quick presets, `V` to toggle full road view, `M` for audio, `C` for camera radar mode.

---

## 📊 Machine Learning Model Benchmarks

Multiple classification architectures were trained and evaluated on the road accident dataset:

| Model Architecture           |     Accuracy     | F1 Score (Macro) |  Training Time  |                   Status                   |
| :--------------------------- | :--------------: | :--------------: | :--------------: | :----------------------------------------: |
| **XGBoost Classifier** | **0.8535** | **0.8528** | **28.05s** | 🏆 **Best Model (Saved & Deployed)** |
| Gradient Boosting            |      0.8532      |      0.8524      |     1013.77s     |     High accuracy, long training time     |
| MLP Neural Network           |      0.8528      |      0.8521      |     101.11s     |       Strong non-linear performance       |
| Decision Tree                |      0.8406      |      0.8404      |      5.84s      |             Fast baseline tree             |
| AdaBoost                     |      0.8369      |      0.8294      |      66.56s      |             Adaptive ensemble             |
| K-Nearest Neighbors (KNN)    |      0.8306      |      0.8301      |      0.76s      |               Distance-based               |
| Random Forest                |      0.8236      |      0.8234      |      74.50s      |              Standard bagging              |
| Extra Trees                  |      0.8220      |      0.8218      |      70.99s      |              Randomized trees              |
| Logistic Regression          |      0.8172      |      0.8165      |      9.94s      |              Linear baseline              |
| Linear SVM                   |      0.7976      |      0.7812      |      4.39s      |         Support vector classifier         |
| SGD Classifier               |      0.7957      |      0.7784      |      9.58s      |        Stochastic gradient descent        |

The final model pipeline (`accident_severity_model.pkl` + `severity_label_encoder.pkl`) combines `OneHotEncoder` for categorical features, `StandardScaler` for numeric features, passthrough for boolean flags, and an optimized `XGBClassifier`.

---

## 🗂️ Project Architecture

```
Road Accident Severity Detection/
├── data/
│   └── train.csv                           # Training dataset
├── models/
│   ├── accident_severity_model.pkl         # Trained XGBoost pipeline
│   └── severity_label_encoder.pkl          # Target label encoder (Low, Medium, High)
├── static/
│   ├── css/
│   │   └── style.css                       # Glassmorphic automotive HUD stylesheet
│   ├── js/
│   │   └── app.js                          # 3D road canvas engine & telemetry synchronizer
│   └── index.html                          # Main cockpit web interface
├── app.py                                  # FastAPI backend serving /predict & static files
├── Classification_Accident_Risk.ipynb      # Complete ML training & evaluation notebook
├── requirements.txt                        # Python dependencies
└── README.md                               # Project documentation
```

---

## 🛠️ Input Features Reference

The model accepts 12 environmental and road parameters:

| Feature Name               | Type        | Allowed / Valid Values                                              | Description                                |
| :------------------------- | :---------- | :------------------------------------------------------------------ | :----------------------------------------- |
| `road_type`              | Categorical | `highway`, `rural`, `urban`                                   | Classification of the roadway corridor     |
| `curvature_bin`          | Categorical | `Straight`, `Slight_Curve`, `Moderate_Curve`, `Sharp_Curve` | Geometric curvature bend angle             |
| `speed_limit`            | Numeric     | `25`, `35`, `45`, `60`, `70`                              | Posted velocity restriction in MPH         |
| `num_lanes`              | Numeric     | `1`, `2`, `3`, `4`                                          | Number of traffic lanes configured         |
| `lighting`               | Categorical | `daylight`, `dim`, `night`                                    | Ambient atmospheric lighting condition     |
| `weather`                | Categorical | `clear`, `foggy`, `rainy`                                     | Meteorological road weather                |
| `time_of_day`            | Categorical | `morning`, `afternoon`, `evening`                             | Diurnal timeline period                    |
| `road_signs_present`     | Boolean     | `true`, `false`                                                 | Regulatory and warning signage visibility  |
| `public_road`            | Boolean     | `true`, `false`                                                 | Public state highway vs private route      |
| `holiday`                | Boolean     | `true`, `false`                                                 | Elevated recreational holiday traffic      |
| `school_season`          | Boolean     | `true`, `false`                                                 | School zone crossing & bus activity        |
| `num_reported_accidents` | Numeric     | `0` to `7`                                                      | Historical collision count at the corridor |

---

## 🚀 Quickstart & Setup

### 1. Clone & Enter Project Directory

```powershell
cd "Road Accident Severity Detection"
```

### 2. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 3. Launch the FastAPI Server

```powershell
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

### 4. Open in Browser

- **Interactive Road Cockpit Demo**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Swagger Interactive API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## ⌨️ Keyboard Shortcuts

|           Shortcut           | Action                                                       |
| :---------------------------: | :----------------------------------------------------------- |
|       <kbd>Space</kbd>       | Analyze severity risk immediately                            |
|         <kbd>1</kbd>         | Load **City Commute** scenario preset                  |
|         <kbd>2</kbd>         | Load **Highway Night** scenario preset                 |
|         <kbd>3</kbd>         | Load **Mountain Rain** scenario preset                 |
|         <kbd>4</kbd>         | Load **Hazard Blackspot** scenario preset              |
|         <kbd>V</kbd>         | Toggle **View Road** (collapse/expand cockpit console) |
|         <kbd>M</kbd>         | Toggle synthesized ambient audio engine                      |
|         <kbd>C</kbd>         | Toggle camera mode (Cockpit / Drone Radar Grid)              |
|         <kbd>J</kbd>         | Open/close raw JSON payload inspector                        |
| <kbd>?</kbd> / <kbd>Esc</kbd> | Open / Close Keyboard Shortcuts Guide                        |

---

## 🔌 API Usage Example

Send a `POST` request to `/predict`:

```python
import requests

payload = {
    "road_type": "rural",
    "curvature_bin": "Sharp_Curve",
    "num_lanes": 2,
    "speed_limit": 45,
    "lighting": "dim",
    "weather": "rainy",
    "time_of_day": "evening",
    "road_signs_present": False,
    "public_road": True,
    "holiday": False,
    "school_season": False,
    "num_reported_accidents": 3
}

response = requests.post("http://127.0.0.1:8000/predict", json=payload)
print(response.json())
```

**Response:**

```json
{
  "severity": "Medium",
  "probabilities": {
    "High": 0.004,
    "Low": 0.0033,
    "Medium": 0.9927
  }
}
```

---

## 📜 License & Credits

Developed as part of the Road Accident Severity Detection Machine Learning Project. Powered by FastAPI, XGBoost, and HTML5 Canvas.
