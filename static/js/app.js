/**
 * Sentinel Road Telemetry Engine
 * Task 4: Real-Time Severity AI Prediction Engine & HUD Telemetry
 */

// ==========================================================================
// 12-Feature Model Payload State
// ==========================================================================
const modelFeatures = {
    road_type: 'urban',               // 'highway' | 'rural' | 'urban'
    curvature_bin: 'Straight',        // 'Straight' | 'Slight_Curve' | 'Moderate_Curve' | 'Sharp_Curve'
    num_lanes: 2,                     // 1 | 2 | 3 | 4
    speed_limit: 35,                  // 25 | 35 | 45 | 60 | 70
    lighting: 'daylight',             // 'daylight' | 'dim' | 'night'
    weather: 'clear',                 // 'clear' | 'foggy' | 'rainy'
    time_of_day: 'morning',           // 'morning' | 'afternoon' | 'evening'
    road_signs_present: true,         // boolean
    public_road: true,                // boolean
    holiday: false,                   // boolean
    school_season: true,              // boolean
    num_reported_accidents: 0         // 0 to 7
};

// Simulation Math & Graphics State
const simState = {
    roadOffset: 0,
    curveBend: 0,
    targetCurveBend: 0,
    cameraMode: 'cockpit',
    audioActive: false,
    liveSync: true,
    predicting: false,
    lastSeverity: 'Low',
    fps: 60
};

// Preset Scenarios
const PRESETS = {
    city: {
        road_type: 'urban',
        curvature_bin: 'Straight',
        num_lanes: 2,
        speed_limit: 35,
        lighting: 'daylight',
        weather: 'clear',
        time_of_day: 'morning',
        road_signs_present: true,
        public_road: true,
        holiday: false,
        school_season: true,
        num_reported_accidents: 0
    },
    highway: {
        road_type: 'highway',
        curvature_bin: 'Slight_Curve',
        num_lanes: 4,
        speed_limit: 70,
        lighting: 'night',
        weather: 'clear',
        time_of_day: 'evening',
        road_signs_present: true,
        public_road: true,
        holiday: true,
        school_season: false,
        num_reported_accidents: 1
    },
    mountain: {
        road_type: 'rural',
        curvature_bin: 'Sharp_Curve',
        num_lanes: 2,
        speed_limit: 45,
        lighting: 'dim',
        weather: 'rainy',
        time_of_day: 'evening',
        road_signs_present: false,
        public_road: true,
        holiday: false,
        school_season: false,
        num_reported_accidents: 3
    },
    blackspot: {
        road_type: 'rural',
        curvature_bin: 'Sharp_Curve',
        num_lanes: 1,
        speed_limit: 60,
        lighting: 'night',
        weather: 'foggy',
        time_of_day: 'evening',
        road_signs_present: false,
        public_road: false,
        holiday: true,
        school_season: false,
        num_reported_accidents: 7
    }
};

// ==========================================================================
// 3D Perspective Road Canvas Engine
// ==========================================================================
class RoadRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.rainDrops = [];
        this.stars = [];

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initParticles();
    }

    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
        this.horizonY = this.height * 0.44;
    }

    initParticles() {
        this.rainDrops = [];
        for (let i = 0; i < 300; i++) {
            this.rainDrops.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                len: 15 + Math.random() * 20,
                speed: 16 + Math.random() * 12,
                opacity: 0.2 + Math.random() * 0.5
            });
        }

        this.stars = [];
        for (let i = 0; i < 120; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.height * 0.44),
                r: Math.random() * 1.5,
                alpha: 0.3 + Math.random() * 0.7
            });
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Curvature interpolation
        simState.curveBend += (simState.targetCurveBend - simState.curveBend) * 0.05;

        // Animate road motion with speed limit
        const speedFactor = modelFeatures.speed_limit / 35;
        simState.roadOffset = (simState.roadOffset + 4 * speedFactor) % 80;

        // 1. Sky & Atmosphere
        this.drawSky();

        // 2. Horizon Silhouettes
        this.drawHorizonSilhouettes();

        // 3. Roadside Ground
        this.drawGround();

        // 4. 3D Asphalt Highway & Markings
        this.drawRoad();

        // 5. Rain particles if rainy
        if (modelFeatures.weather === 'rainy') {
            this.drawRain();
        }

        // 6. Drone Grid if in drone mode
        if (simState.cameraMode === 'drone') {
            this.drawDroneGrid();
        }
    }

    drawSky() {
        const { ctx, width, horizonY } = this;
        let skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);

        if (modelFeatures.lighting === 'daylight') {
            skyGrad.addColorStop(0, '#1a508b');
            skyGrad.addColorStop(0.6, '#4f8fc0');
            skyGrad.addColorStop(1, '#a6cde2');
        } else if (modelFeatures.lighting === 'dim') {
            skyGrad.addColorStop(0, '#19122e');
            skyGrad.addColorStop(0.4, '#472143');
            skyGrad.addColorStop(0.75, '#99443c');
            skyGrad.addColorStop(1, '#ff8a50');
        } else {
            skyGrad.addColorStop(0, '#030611');
            skyGrad.addColorStop(0.7, '#070f21');
            skyGrad.addColorStop(1, '#111931');
        }

        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, horizonY);

        if (modelFeatures.lighting === 'night' && modelFeatures.weather !== 'foggy') {
            ctx.fillStyle = '#ffffff';
            for (let star of this.stars) {
                ctx.globalAlpha = star.alpha;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        }

        if (modelFeatures.lighting === 'daylight' && modelFeatures.weather !== 'foggy') {
            ctx.save();
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#fff3c4';
            ctx.fillStyle = '#fff9d6';
            ctx.beginPath();
            ctx.arc(width * 0.75, horizonY * 0.35, 34, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (modelFeatures.lighting === 'dim') {
            ctx.save();
            ctx.shadowBlur = 35;
            ctx.shadowColor = '#ff6b35';
            ctx.fillStyle = '#ff9e64';
            ctx.beginPath();
            ctx.arc(width * 0.5, horizonY * 0.85, 38, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    drawHorizonSilhouettes() {
        const { ctx, width, horizonY } = this;
        ctx.save();

        let color = modelFeatures.lighting === 'daylight' ? '#2b415b' : (modelFeatures.lighting === 'dim' ? '#1c1527' : '#080c18');
        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= width; x += 50) {
            let y = horizonY - Math.sin((x + 100) * 0.004) * 35 - Math.cos(x * 0.015) * 15;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width, horizonY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawGround() {
        const { ctx, width, height, horizonY } = this;
        let groundGrad = ctx.createLinearGradient(0, horizonY, 0, height);

        if (modelFeatures.lighting === 'daylight') {
            groundGrad.addColorStop(0, '#2d4a22');
            groundGrad.addColorStop(1, '#1b3215');
        } else if (modelFeatures.lighting === 'dim') {
            groundGrad.addColorStop(0, '#1c1f18');
            groundGrad.addColorStop(1, '#0e120d');
        } else {
            groundGrad.addColorStop(0, '#0a0d14');
            groundGrad.addColorStop(1, '#04060a');
        }

        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, horizonY, width, height - horizonY);
    }

    drawRoad() {
        const { ctx, width, height, horizonY } = this;
        const centerX = width * 0.5;
        const curveOffset = simState.curveBend * (width * 0.28);

        const lanes = modelFeatures.num_lanes;
        const bottomRoadWidth = Math.min(width * 0.82, 380 * lanes);
        const topRoadWidth = Math.min(width * 0.08, 40 * lanes);

        const leftTopX = (centerX + curveOffset) - topRoadWidth / 2;
        const rightTopX = (centerX + curveOffset) + topRoadWidth / 2;
        const leftBottomX = centerX - bottomRoadWidth / 2;
        const rightBottomX = centerX + bottomRoadWidth / 2;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(leftTopX, horizonY);
        ctx.lineTo(rightTopX, horizonY);
        ctx.lineTo(rightBottomX, height);
        ctx.lineTo(leftBottomX, height);
        ctx.closePath();

        let asphaltGrad = ctx.createLinearGradient(0, horizonY, 0, height);
        if (modelFeatures.lighting === 'daylight') {
            asphaltGrad.addColorStop(0, '#333a46');
            asphaltGrad.addColorStop(1, '#1e242d');
        } else if (modelFeatures.lighting === 'dim') {
            asphaltGrad.addColorStop(0, '#262832');
            asphaltGrad.addColorStop(1, '#14161d');
        } else {
            asphaltGrad.addColorStop(0, '#101319');
            asphaltGrad.addColorStop(1, '#080a0e');
        }
        ctx.fillStyle = asphaltGrad;
        ctx.fill();

        if (modelFeatures.weather === 'rainy') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fill();
        }

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(leftTopX, horizonY);
        ctx.lineTo(leftBottomX, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rightTopX, horizonY);
        ctx.lineTo(rightBottomX, height);
        ctx.stroke();

        if (lanes > 1) {
            for (let laneIdx = 1; laneIdx < lanes; laneIdx++) {
                const laneRatio = laneIdx / lanes;
                const isDoubleYellow = (modelFeatures.road_type === 'rural' && lanes === 2 && laneIdx === 1);

                ctx.strokeStyle = isDoubleYellow ? '#ffcc00' : '#ffffff';
                ctx.lineWidth = isDoubleYellow ? 3 : 2.5;

                const totalSlices = 24;
                for (let s = 0; s < totalSlices; s++) {
                    let progressStart = ((s * 80 + simState.roadOffset) % (totalSlices * 80)) / (totalSlices * 80);
                    let progressEnd = progressStart + 0.025;

                    if (progressEnd > 1.0) continue;

                    let pStart = Math.pow(progressStart, 2.2);
                    let pEnd = Math.pow(progressEnd, 2.2);

                    let y1 = horizonY + (height - horizonY) * pStart;
                    let y2 = horizonY + (height - horizonY) * pEnd;

                    let topX = leftTopX + (rightTopX - leftTopX) * laneRatio;
                    let bottomX = leftBottomX + (rightBottomX - leftBottomX) * laneRatio;

                    let x1 = topX + (bottomX - topX) * pStart;
                    let x2 = topX + (bottomX - topX) * pEnd;

                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();

                    if (isDoubleYellow) {
                        ctx.beginPath();
                        ctx.moveTo(x1 + 6 * pStart, y1);
                        ctx.lineTo(x2 + 6 * pEnd, y2);
                        ctx.stroke();
                    }
                }
            }
        }

        ctx.restore();
    }

    drawRain() {
        const { ctx } = this;
        ctx.save();
        ctx.strokeStyle = 'rgba(210, 235, 255, 0.6)';
        ctx.lineWidth = 1.5;

        for (let drop of this.rainDrops) {
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x - 3, drop.y + drop.len);
            ctx.stroke();

            drop.y += drop.speed;
            drop.x -= 1.5;

            if (drop.y > this.height) {
                drop.y = -drop.len;
                drop.x = Math.random() * this.width;
            }
        }
        ctx.restore();
    }

    drawDroneGrid() {
        const { ctx, width, height } = this;
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
        ctx.lineWidth = 1;

        for (let x = 0; x < width; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += 60) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.strokeRect(width * 0.5 - 70, height * 0.55 - 40, 140, 80);
        ctx.font = '10px "JetBrains Mono"';
        ctx.fillStyle = '#00f2fe';
        ctx.fillText('TARGET SECTOR 01', width * 0.5 - 60, height * 0.55 - 46);
        ctx.restore();
    }
}

// ==========================================================================
// Mini GPS Radar Scanner
// ==========================================================================
class MiniRadar {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.render();
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();

        ctx.fillStyle = '#00f59b';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 20);
        const curveOffset = simState.targetCurveBend * 18;
        ctx.quadraticCurveTo(cx, cy, cx + curveOffset, cy - 26);
        ctx.stroke();
    }
}

// ==========================================================================
// Web Audio Synthesizer & Sound FX Chimes
// ==========================================================================
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.gainNode = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, this.ctx.currentTime);

        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setValueAtTime(0.06, this.ctx.currentTime);

        this.engineOsc.connect(filter);
        filter.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);
        this.engineOsc.start();
    }

    updateSpeed(speed) {
        if (!this.engineOsc || !this.ctx) return;
        const targetFreq = 35 + (speed / 70) * 45;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    }

    playSeverityChime(severity) {
        if (!this.ctx || !simState.audioActive || this.ctx.state !== 'running') return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const chimeGain = this.ctx.createGain();
            osc.connect(chimeGain);
            chimeGain.connect(this.ctx.destination);

            if (severity === 'Low') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18); // G5
                chimeGain.gain.setValueAtTime(0.08, now);
                chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (severity === 'Medium') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, now); // A4
                osc.frequency.setValueAtTime(554.37, now + 0.12); // C#5
                chimeGain.gain.setValueAtTime(0.1, now);
                chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else {
                // High Severity Alarm
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(700, now);
                osc.frequency.setValueAtTime(350, now + 0.1);
                osc.frequency.setValueAtTime(700, now + 0.2);
                chimeGain.gain.setValueAtTime(0.12, now);
                chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
            }
        } catch (e) {
            console.warn('Audio chime notice:', e);
        }
    }

    toggle() {
        if (!this.ctx) {
            this.init();
            simState.audioActive = true;
            return true;
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
            simState.audioActive = true;
            return true;
        } else if (this.ctx.state === 'running') {
            this.ctx.suspend();
            simState.audioActive = false;
            return false;
        }
        return false;
    }
}

// ==========================================================================
// Master Cockpit Synchronizer & Prediction Controller
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const roadRenderer = new RoadRenderer('roadCanvas');
    const miniRadar = new MiniRadar('radarCanvas');
    const audio = new AudioEngine();

    // DOM Elements
    const body = document.body;
    const hudSpeedVal = document.getElementById('hud-speed-val');
    const speedDialArc = document.getElementById('speed-dial-arc');
    const signSpeedNum = document.getElementById('sign-speed-num');
    const hudCurve = document.getElementById('hud-curve');
    const hudLanes = document.getElementById('hud-lanes');
    const hudGrip = document.getElementById('hud-grip');
    const hudVisibility = document.getElementById('hud-visibility');
    const hudAccidentStat = document.getElementById('hud-accident-stat');
    const hudSignStat = document.getElementById('hud-sign-stat');
    const advisoryIcon = document.getElementById('advisory-icon');
    const advisoryDesc = document.getElementById('advisory-desc');
    const lblActiveWeather = document.getElementById('lbl-active-weather');
    const lblActiveRoad = document.getElementById('lbl-active-road');
    const lblActiveSeverity = document.getElementById('lbl-active-severity');
    const lblLatency = document.getElementById('lbl-latency');
    const svgCurveArrow = document.getElementById('svg-curve-arrow');
    const valTime = document.getElementById('val-time');
    const valInferenceTime = document.getElementById('val-inference-time');
    const signSchoolBox = document.getElementById('sign-school-box');
    const rightSignsPanel = document.getElementById('right-signs-panel');
    const jsonCodePreview = document.getElementById('json-code-preview');
    const jsonDrawer = document.getElementById('json-drawer');
    const btnToggleJson = document.getElementById('btn-toggle-json');

    // Stepper Elements
    const stepperAccidentNum = document.getElementById('stepper-accident-num');
    const stepperAccidentDesc = document.getElementById('stepper-accident-desc');
    const badgeHazardLevel = document.getElementById('badge-hazard-level');
    const hazardMeterBars = document.getElementById('hazard-meter-bars');

    // Prediction Trigger Elements
    const btnRunPredict = document.getElementById('btn-run-predict');
    const switchLiveSync = document.getElementById('switch-live-sync');
    const predictionStatusDot = document.getElementById('prediction-status-dot');
    const predictionStatusText = document.getElementById('prediction-status-text');
    const indicatorAiState = document.getElementById('indicator-ai-state');

    // Severity Display Elements
    const severityCard = document.getElementById('severity-card');
    const sevGaugeRing = document.getElementById('sev-gauge-ring');
    const sevValTitle = document.getElementById('sev-val-title');
    const sevSubtext = document.getElementById('sev-subtext');
    const probNumLow = document.getElementById('prob-num-low');
    const probBarLow = document.getElementById('prob-bar-low');
    const probNumMed = document.getElementById('prob-num-med');
    const probBarMed = document.getElementById('prob-bar-med');
    const probNumHigh = document.getElementById('prob-num-high');
    const probBarHigh = document.getElementById('prob-bar-high');
    const riskChipsWrap = document.getElementById('risk-chips-wrap');

    // Tab Navigation
    const tabButtons = document.querySelectorAll('.cockpit-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // Preset Buttons
    const presetButtons = document.querySelectorAll('.preset-pill');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const presetKey = btn.getAttribute('data-preset');
            if (PRESETS[presetKey]) {
                applyPreset(PRESETS[presetKey]);
            }
        });
    });

    // 1. Road Type
    bindPillGroup('#ctrl-road-type', (val) => {
        modelFeatures.road_type = val;
        updateRoadDisplay();
        onFeatureChange();
    });

    // 2. Curvature
    bindPillGroup('#ctrl-curvature', (val) => {
        modelFeatures.curvature_bin = val;
        updateCurvatureDisplay();
        onFeatureChange();
    });

    // 3. Speed Limit
    bindPillGroup('#ctrl-speed-pills', (val) => {
        modelFeatures.speed_limit = parseInt(val, 10);
        updateSpeedDisplay();
        onFeatureChange();
    });

    // 4. Lanes
    bindPillGroup('#ctrl-lanes', (val) => {
        modelFeatures.num_lanes = parseInt(val, 10);
        hudLanes.textContent = `${modelFeatures.num_lanes} ACTIVE`;
        onFeatureChange();
    });

    // 5. Lighting
    bindPillGroup('#ctrl-lighting', (val) => {
        modelFeatures.lighting = val;
        updateLightingDisplay();
        onFeatureChange();
    });

    // 6. Weather
    bindPillGroup('#ctrl-weather', (val) => {
        modelFeatures.weather = val;
        updateWeatherDisplay();
        onFeatureChange();
    });

    // 7. Time of Day
    bindPillGroup('#ctrl-time-of-day', (val) => {
        modelFeatures.time_of_day = val;
        updateTimeDisplay();
        onFeatureChange();
    });

    // 8. Road Signs Present Switch
    const switchRoadSigns = document.getElementById('switch-road-signs');
    switchRoadSigns.addEventListener('change', (e) => {
        modelFeatures.road_signs_present = e.target.checked;
        if (modelFeatures.road_signs_present) {
            hudSignStat.textContent = 'POSTED';
        } else {
            hudSignStat.textContent = 'ABSENT';
        }
        onFeatureChange();
    });

    // 9. Public Road Switch
    const switchPublicRoad = document.getElementById('switch-public-road');
    switchPublicRoad.addEventListener('change', (e) => {
        modelFeatures.public_road = e.target.checked;
        onFeatureChange();
    });

    // 10. Holiday Switch
    const switchHoliday = document.getElementById('switch-holiday');
    switchHoliday.addEventListener('change', (e) => {
        modelFeatures.holiday = e.target.checked;
        onFeatureChange();
    });

    // 11. School Season Switch
    const switchSchoolSeason = document.getElementById('switch-school-season');
    switchSchoolSeason.addEventListener('change', (e) => {
        modelFeatures.school_season = e.target.checked;
        if (modelFeatures.school_season) {
            signSchoolBox.classList.add('active');
        } else {
            signSchoolBox.classList.remove('active');
        }
        onFeatureChange();
    });

    // 12. Prior Accidents Stepper (0 to 7)
    const btnAccidentDec = document.getElementById('btn-accident-dec');
    const btnAccidentInc = document.getElementById('btn-accident-inc');

    btnAccidentDec.addEventListener('click', () => {
        if (modelFeatures.num_reported_accidents > 0) {
            modelFeatures.num_reported_accidents--;
            updateAccidentDisplay();
            onFeatureChange();
        }
    });

    btnAccidentInc.addEventListener('click', () => {
        if (modelFeatures.num_reported_accidents < 7) {
            modelFeatures.num_reported_accidents++;
            updateAccidentDisplay();
            onFeatureChange();
        }
    });

    // Helper: Bind Generic Pill Group
    function bindPillGroup(containerSelector, onChange) {
        const buttons = document.querySelectorAll(`${containerSelector} .pill-opt`);
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const val = btn.getAttribute('data-val');
                onChange(val);
            });
        });
    }

    // JSON Drawer Toggle
    btnToggleJson.addEventListener('click', () => {
        jsonDrawer.classList.toggle('open');
    });

    jsonCodePreview.addEventListener('click', () => {
        navigator.clipboard.writeText(JSON.stringify(modelFeatures, null, 2)).then(() => {
            const notice = document.getElementById('copy-notice');
            notice.textContent = '✓ Copied to clipboard!';
            setTimeout(() => { notice.textContent = 'Click payload to copy'; }, 2000);
        });
    });

    // Live Sync Toggle
    switchLiveSync.addEventListener('change', (e) => {
        simState.liveSync = e.target.checked;
        if (simState.liveSync) {
            triggerPrediction();
        }
    });

    // Manual Run Prediction Button
    btnRunPredict.addEventListener('click', () => {
        triggerPrediction();
    });

    // Feature Change Handler
    let debounceTimer = null;
    function onFeatureChange() {
        syncJson();
        if (simState.liveSync) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                triggerPrediction();
            }, 120);
        }
    }

    function syncJson() {
        jsonCodePreview.textContent = JSON.stringify(modelFeatures, null, 2);
    }

    // ======================================================================
    // FastAPI /predict Integration Engine
    // ======================================================================
    async function triggerPrediction() {
        if (simState.predicting) return;
        simState.predicting = true;
        btnRunPredict.classList.add('loading');
        indicatorAiState.textContent = 'PREDICTING';
        indicatorAiState.className = 'live-indicator indicator-ai';

        const startTime = performance.now();

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(modelFeatures)
            });

            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }

            const data = await response.json();
            const latency = (performance.now() - startTime).toFixed(1);

            applyPredictionResult(data, latency);

        } catch (error) {
            console.error('Prediction failed:', error);
            predictionStatusDot.style.background = 'var(--neon-red)';
            predictionStatusText.textContent = 'Inference Error (Check /predict)';
            indicatorAiState.textContent = 'API ERROR';
            indicatorAiState.className = 'live-indicator text-neon-red';
        } finally {
            simState.predicting = false;
            btnRunPredict.classList.remove('loading');
        }
    }

    function applyPredictionResult(data, latency) {
        const severity = data.severity; // 'Low' | 'Medium' | 'High'
        const probas = data.probabilities || {};

        const pLow = ((probas.Low || 0) * 100);
        const pMed = ((probas.Medium || 0) * 100);
        const pHigh = ((probas.High || 0) * 100);

        // Update latency
        valInferenceTime.textContent = `${latency} ms`;
        lblLatency.textContent = `${latency} ms`;
        predictionStatusDot.style.background = 'var(--neon-green)';
        predictionStatusText.textContent = `XGBoost Inference Complete (${latency}ms)`;
        indicatorAiState.textContent = 'VERIFIED';
        indicatorAiState.className = 'live-indicator';

        // Update Body Class for Scene Atmosphere
        body.classList.remove('sev-low', 'sev-medium', 'sev-high');
        body.classList.add(`sev-${severity.toLowerCase()}`);

        // Update Severity Card
        severityCard.className = `severity-card card-${severity.toLowerCase()}`;
        sevValTitle.textContent = severity.toUpperCase();

        // Update Gauge Ring
        // Circumference = 2 * PI * 50 = 314.15
        if (severity === 'Low') {
            sevValTitle.style.color = 'var(--neon-green)';
            sevGaugeRing.style.stroke = 'var(--neon-green)';
            sevGaugeRing.style.strokeDashoffset = '210';
            sevSubtext.textContent = 'Favorable roadway conditions. Minimal accident impact probability.';
            lblActiveSeverity.textContent = 'LOW RISK // SAFE';
            lblActiveSeverity.className = 'footer-value text-neon-green';
        } else if (severity === 'Medium') {
            sevValTitle.style.color = 'var(--neon-amber)';
            sevGaugeRing.style.stroke = 'var(--neon-amber)';
            sevGaugeRing.style.strokeDashoffset = '110';
            sevSubtext.textContent = 'Elevated collision risk. Reduce speed and maintain extended following gap.';
            lblActiveSeverity.textContent = 'MODERATE RISK // CAUTION';
            lblActiveSeverity.className = 'footer-value text-accent';
        } else {
            // High
            sevValTitle.style.color = 'var(--neon-red)';
            sevGaugeRing.style.stroke = 'var(--neon-red)';
            sevGaugeRing.style.strokeDashoffset = '15';
            sevSubtext.textContent = 'CRITICAL HAZARD! Extreme probability of severe collision and vehicular damage.';
            lblActiveSeverity.textContent = 'CRITICAL SEVERITY // DANGER';
            lblActiveSeverity.className = 'footer-value text-neon-red';
        }

        // Update Probability Bars
        probNumLow.textContent = `${pLow.toFixed(1)}%`;
        probBarLow.style.width = `${pLow}%`;

        probNumMed.textContent = `${pMed.toFixed(1)}%`;
        probBarMed.style.width = `${pMed}%`;

        probNumHigh.textContent = `${pHigh.toFixed(1)}%`;
        probBarHigh.style.width = `${pHigh}%`;

        // Update Risk Factor Chips
        updateRiskChips(severity);

        // Play Audio Chime if changed
        if (severity !== simState.lastSeverity) {
            audio.playSeverityChime(severity);
            simState.lastSeverity = severity;
        }
    }

    function updateRiskChips(severity) {
        riskChipsWrap.innerHTML = '';
        const chips = [];

        if (modelFeatures.speed_limit >= 60) {
            chips.push({ text: `⚡ High Speed (${modelFeatures.speed_limit} MPH)`, type: 'danger' });
        } else if (modelFeatures.speed_limit <= 35) {
            chips.push({ text: `✓ Safe Velocity (${modelFeatures.speed_limit} MPH)`, type: 'safe' });
        }

        if (modelFeatures.curvature_bin === 'Sharp_Curve') {
            chips.push({ text: '↪️ Hairpin Sharp Curve', type: 'danger' });
        } else if (modelFeatures.curvature_bin === 'Moderate_Curve') {
            chips.push({ text: '↪️ Moderate Curve', type: 'caution' });
        }

        if (modelFeatures.weather === 'rainy') {
            chips.push({ text: '🌧️ Wet Slick Pavement', type: 'danger' });
        } else if (modelFeatures.weather === 'foggy') {
            chips.push({ text: '🌫️ Restricted Fog Visibility', type: 'danger' });
        }

        if (modelFeatures.lighting === 'night') {
            chips.push({ text: '🌙 Night Sight Horizon', type: 'caution' });
        }

        if (modelFeatures.num_reported_accidents >= 4) {
            chips.push({ text: `🚨 ${modelFeatures.num_reported_accidents} Collisions (Blackspot)`, type: 'danger' });
        } else if (modelFeatures.num_reported_accidents >= 1) {
            chips.push({ text: `⚠️ ${modelFeatures.num_reported_accidents} Prior Collisions`, type: 'caution' });
        }

        if (!modelFeatures.road_signs_present) {
            chips.push({ text: '🚫 Unmarked Route (No Signs)', type: 'caution' });
        }

        if (modelFeatures.holiday) {
            chips.push({ text: '🎉 Holiday Density Surge', type: 'caution' });
        }

        if (chips.length === 0) {
            chips.push({ text: '✓ Favorable Highway Geometry', type: 'safe' });
            chips.push({ text: '✓ Dry Pavement Adhesion', type: 'safe' });
        }

        chips.forEach(c => {
            const span = document.createElement('span');
            span.className = `risk-chip chip-${c.type}`;
            span.textContent = c.text;
            riskChipsWrap.appendChild(span);
        });
    }

    // Synchronize UI Displays
    function updateCurvatureDisplay() {
        const curve = modelFeatures.curvature_bin;
        if (curve === 'Straight') {
            simState.targetCurveBend = 0;
            hudCurve.textContent = 'STRAIGHT (0°)';
            svgCurveArrow.setAttribute('d', 'M 50 80 L 50 20 L 40 32 M 50 20 L 60 32');
        } else if (curve === 'Slight_Curve') {
            simState.targetCurveBend = 0.35;
            hudCurve.textContent = 'SLIGHT (+15°)';
            svgCurveArrow.setAttribute('d', 'M 50 80 Q 50 45 68 28 L 56 25 M 68 28 L 68 40');
        } else if (curve === 'Moderate_Curve') {
            simState.targetCurveBend = 0.65;
            hudCurve.textContent = 'MODERATE (+30°)';
            svgCurveArrow.setAttribute('d', 'M 45 80 Q 45 40 76 25 L 64 22 M 76 25 L 75 37');
        } else if (curve === 'Sharp_Curve') {
            simState.targetCurveBend = 1.0;
            hudCurve.textContent = 'SHARP (+45°)';
            svgCurveArrow.setAttribute('d', 'M 40 80 Q 40 35 84 22 L 72 18 M 84 22 L 82 35');
        }
        miniRadar.render();
    }

    function updateSpeedDisplay() {
        const speed = modelFeatures.speed_limit;
        if (hudSpeedVal) hudSpeedVal.textContent = speed;
        if (signSpeedNum) signSpeedNum.textContent = speed;
        const speedSlider = document.getElementById('ctrl-speed-slider');
        const sliderSpeedVal = document.getElementById('slider-speed-val');
        if (speedSlider) speedSlider.value = speed;
        if (sliderSpeedVal) sliderSpeedVal.textContent = `${speed} MPH`;

        const normalized = (speed - 25) / (70 - 25);
        const arcOffset = 200 - (normalized * 150);
        speedDialArc.style.strokeDashoffset = arcOffset;

        audio.updateSpeed(speed);
    }

    function updateLightingDisplay() {
        const light = modelFeatures.lighting;
        body.classList.remove('theme-daylight', 'theme-dim', 'theme-night');
        body.classList.add(`theme-${light}`);
        updateEnvironmentHUD();
    }

    function updateWeatherDisplay() {
        const weather = modelFeatures.weather;
        body.classList.remove('weather-clear', 'weather-rainy', 'weather-foggy');
        body.classList.add(`weather-${weather}`);
        updateEnvironmentHUD();
    }

    function updateTimeDisplay() {
        const tod = modelFeatures.time_of_day;
        if (tod === 'morning') valTime.textContent = '08:45 AM (MORNING)';
        else if (tod === 'afternoon') valTime.textContent = '02:30 PM (AFTERNOON)';
        else valTime.textContent = '09:15 PM (EVENING)';
    }

    function updateRoadDisplay() {
        const type = modelFeatures.road_type;
        if (type === 'urban') lblActiveRoad.textContent = 'Urban Corridor • Sector 4B';
        else if (type === 'highway') lblActiveRoad.textContent = 'Interstate I-95 • Expressway';
        else lblActiveRoad.textContent = 'Rural Pass • Mountain Roadway';
    }

    function updateAccidentDisplay() {
        const num = modelFeatures.num_reported_accidents;
        stepperAccidentNum.textContent = num;
        stepperAccidentDesc.textContent = `${num} Reported Collision${num === 1 ? '' : 's'}`;

        hudAccidentStat.textContent = num === 0 ? '0 (CLEAN)' : `${num} PRIOR`;

        if (num === 0) {
            badgeHazardLevel.textContent = 'SAFE CORRIDOR';
            badgeHazardLevel.className = 'hazard-level-badge level-safe';
            hudAccidentStat.className = 'stat-value text-neon-green';
        } else if (num <= 2) {
            badgeHazardLevel.textContent = 'LOW INCIDENTS';
            badgeHazardLevel.className = 'hazard-level-badge level-safe';
            hudAccidentStat.className = 'stat-value text-neon-green';
        } else if (num <= 4) {
            badgeHazardLevel.textContent = 'MODERATE RISK';
            badgeHazardLevel.className = 'hazard-level-badge level-moderate';
            hudAccidentStat.className = 'stat-value text-accent';
        } else {
            badgeHazardLevel.textContent = 'HIGH HAZARD BLACKSPOT';
            badgeHazardLevel.className = 'hazard-level-badge level-danger';
            hudAccidentStat.className = 'stat-value text-neon-red';
        }

        const pips = hazardMeterBars.querySelectorAll('.bar-pip');
        pips.forEach((pip, idx) => {
            pip.className = 'bar-pip';
            if (idx <= num) {
                if (num <= 2) pip.classList.add('active-green');
                else if (num <= 4) pip.classList.add('active-amber');
                else pip.classList.add('active-red');
            }
        });
    }

    function updateEnvironmentHUD() {
        if (modelFeatures.weather === 'rainy') {
            if (hudGrip) { hudGrip.textContent = '55% WET / SLICK'; hudGrip.className = 'stat-value text-accent'; }
            if (hudVisibility) hudVisibility.textContent = '3 MILES (RAIN)';
            if (advisoryIcon) advisoryIcon.textContent = '🌧️';
            if (advisoryDesc) advisoryDesc.textContent = 'SLICK';
            if (lblActiveWeather) lblActiveWeather.textContent = 'Rainstorm & Wet Pavement';
        } else if (modelFeatures.weather === 'foggy') {
            if (hudGrip) { hudGrip.textContent = '85% DAMP'; hudGrip.className = 'stat-value'; }
            if (hudVisibility) hudVisibility.textContent = '0.4 MILES (FOG)';
            if (advisoryIcon) advisoryIcon.textContent = '🌫️';
            if (advisoryDesc) advisoryDesc.textContent = 'FOG';
            if (lblActiveWeather) lblActiveWeather.textContent = 'Volumetric Fog Alert';
        } else {
            if (hudGrip) { hudGrip.textContent = '100% DRY'; hudGrip.className = 'stat-value text-neon-green'; }
            if (hudVisibility) hudVisibility.textContent = modelFeatures.lighting === 'night' ? 'HEADLIGHT RANGE' : '10 MILES';
            if (advisoryIcon) advisoryIcon.textContent = '☀️';
            if (advisoryDesc) advisoryDesc.textContent = 'CLEAR';
            if (lblActiveWeather) lblActiveWeather.textContent = 'Clear Conditions';
        }
    }

    function applyPreset(preset) {
        Object.assign(modelFeatures, preset);

        setActivePill('#ctrl-road-type', modelFeatures.road_type);
        setActivePill('#ctrl-curvature', modelFeatures.curvature_bin);
        setActivePill('#ctrl-speed-pills', String(modelFeatures.speed_limit));
        setActivePill('#ctrl-lanes', String(modelFeatures.num_lanes));
        setActivePill('#ctrl-lighting', modelFeatures.lighting);
        setActivePill('#ctrl-weather', modelFeatures.weather);
        setActivePill('#ctrl-time-of-day', modelFeatures.time_of_day);

        switchRoadSigns.checked = modelFeatures.road_signs_present;
        switchRoadSigns.dispatchEvent(new Event('change'));

        switchPublicRoad.checked = modelFeatures.public_road;
        switchHoliday.checked = modelFeatures.holiday;
        switchSchoolSeason.checked = modelFeatures.school_season;
        switchSchoolSeason.dispatchEvent(new Event('change'));

        updateRoadDisplay();
        updateCurvatureDisplay();
        updateSpeedDisplay();
        updateLightingDisplay();
        updateWeatherDisplay();
        updateTimeDisplay();
        updateAccidentDisplay();
        hudLanes.textContent = `${modelFeatures.num_lanes} ACTIVE`;

        onFeatureChange();
    }

    function setActivePill(containerSelector, val) {
        const buttons = document.querySelectorAll(`${containerSelector} .pill-opt`);
        buttons.forEach(b => {
            if (b.getAttribute('data-val') === val) b.classList.add('active');
            else b.classList.remove('active');
        });
    }

    // Camera View Toggle
    const cameraBtn = document.getElementById('btn-camera-toggle');
    const cameraLabel = document.getElementById('camera-label');
    cameraBtn.addEventListener('click', () => {
        if (simState.cameraMode === 'cockpit') {
            simState.cameraMode = 'drone';
            cameraLabel.textContent = 'DRONE RADAR';
            body.classList.remove('mode-cockpit');
            body.classList.add('mode-drone');
        } else {
            simState.cameraMode = 'cockpit';
            cameraLabel.textContent = 'COCKPIT VIEW';
            body.classList.remove('mode-drone');
            body.classList.add('mode-cockpit');
        }
    });

    // Audio Toggle
    const audioBtn = document.getElementById('btn-audio-toggle');
    const audioLabel = document.getElementById('audio-label');
    audioBtn.addEventListener('click', () => {
        const isRunning = audio.toggle();
        if (isRunning) {
            audioBtn.classList.add('active');
            audioLabel.textContent = 'AUDIO ON';
        } else {
            audioBtn.classList.remove('active');
            audioLabel.textContent = 'AUDIO OFF';
        }
    });


    // Speed Slider Synchronization
    const speedSlider = document.getElementById('ctrl-speed-slider');
    const sliderSpeedVal = document.getElementById('slider-speed-val');

    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            const rawVal = parseInt(e.target.value, 10);
            // Snap to nearest allowed speed limit: 25, 35, 45, 60, 70
            const allowed = [25, 35, 45, 60, 70];
            const snapped = allowed.reduce((prev, curr) => 
                Math.abs(curr - rawVal) < Math.abs(prev - rawVal) ? curr : prev
            );
            
            modelFeatures.speed_limit = snapped;
            if (sliderSpeedVal) sliderSpeedVal.textContent = `${snapped} MPH`;
            setActivePill('#ctrl-speed-pills', String(snapped));
            updateSpeedDisplay();
            onFeatureChange();
        });
    }

    // Minimize / Expand Road View Toggle
    const btnMinimize = document.getElementById('btn-minimize-toggle');
    const minimizeLabel = document.getElementById('minimize-label');
    if (btnMinimize) {
        btnMinimize.addEventListener('click', () => {
            body.classList.toggle('cockpit-minimized');
            if (body.classList.contains('cockpit-minimized')) {
                btnMinimize.classList.add('active');
                if (minimizeLabel) minimizeLabel.textContent = 'SHOW COCKPIT';
            } else {
                btnMinimize.classList.remove('active');
                if (minimizeLabel) minimizeLabel.textContent = 'VIEW ROAD';
            }
        });
    }

    // Initialize Displays
    updateRoadDisplay();
    updateCurvatureDisplay();
    updateSpeedDisplay();
    updateLightingDisplay();
    updateWeatherDisplay();
    updateTimeDisplay();
    updateAccidentDisplay();
    signSchoolBox.classList.add('active');
    syncJson();

    // Trigger Initial Prediction on Page Load
    triggerPrediction();

    // 60 FPS Main Render Loop
    let lastTime = performance.now();
    let frameCount = 0;
    const lblFps = document.getElementById('lbl-fps');

    function animate(time) {
        roadRenderer.render();

        frameCount++;
        if (time - lastTime >= 1000) {
            lblFps.textContent = `${frameCount} FPS`;
            frameCount = 0;
            lastTime = time;
        }

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
});
