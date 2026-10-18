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

        // Stars at night
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

        // Celestial body (Sun/Moon)
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

        // Asphalt
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

        // Road edge lines
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

        // Dashed lane lines
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

        // Vehicle marker
        ctx.fillStyle = '#00f59b';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Road curve trajectory
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
// Web Audio Synthesizer
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
// Master Cockpit Synchronizer
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
    const advisoryTitle = document.getElementById('advisory-title');
    const advisoryDesc = document.getElementById('advisory-desc');
    const lblActiveWeather = document.getElementById('lbl-active-weather');
    const lblActiveRoad = document.getElementById('lbl-active-road');
    const svgCurveArrow = document.getElementById('svg-curve-arrow');
    const signCurveText = document.getElementById('sign-curve-text');
    const valTime = document.getElementById('val-time');
    const signSchoolBox = document.getElementById('sign-school-box');
    const rightSignsPanel = document.getElementById('right-signs-panel');
    const indicatorSignState = document.getElementById('indicator-sign-state');
    const jsonCodePreview = document.getElementById('json-code-preview');
    const jsonDrawer = document.getElementById('json-drawer');
    const btnToggleJson = document.getElementById('btn-toggle-json');

    // Stepper Elements
    const stepperAccidentNum = document.getElementById('stepper-accident-num');
    const stepperAccidentDesc = document.getElementById('stepper-accident-desc');
    const badgeHazardLevel = document.getElementById('badge-hazard-level');
    const hazardMeterBars = document.getElementById('hazard-meter-bars');

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

    // 1. Road Type Controller
    bindPillGroup('#ctrl-road-type', (val) => {
        modelFeatures.road_type = val;
        updateRoadDisplay();
        syncAll();
    });

    // 2. Curvature Controller
    bindPillGroup('#ctrl-curvature', (val) => {
        modelFeatures.curvature_bin = val;
        updateCurvatureDisplay();
        syncAll();
    });

    // 3. Speed Limit Controller
    bindPillGroup('#ctrl-speed-pills', (val) => {
        modelFeatures.speed_limit = parseInt(val, 10);
        updateSpeedDisplay();
        syncAll();
    });

    // 4. Lanes Controller
    bindPillGroup('#ctrl-lanes', (val) => {
        modelFeatures.num_lanes = parseInt(val, 10);
        hudLanes.textContent = `${modelFeatures.num_lanes} ACTIVE`;
        syncAll();
    });

    // 5. Lighting Controller
    bindPillGroup('#ctrl-lighting', (val) => {
        modelFeatures.lighting = val;
        updateLightingDisplay();
        syncAll();
    });

    // 6. Weather Controller
    bindPillGroup('#ctrl-weather', (val) => {
        modelFeatures.weather = val;
        updateWeatherDisplay();
        syncAll();
    });

    // 7. Time of Day Controller
    bindPillGroup('#ctrl-time-of-day', (val) => {
        modelFeatures.time_of_day = val;
        updateTimeDisplay();
        syncAll();
    });

    // 8. Road Signs Present Switch
    const switchRoadSigns = document.getElementById('switch-road-signs');
    switchRoadSigns.addEventListener('change', (e) => {
        modelFeatures.road_signs_present = e.target.checked;
        if (modelFeatures.road_signs_present) {
            rightSignsPanel.classList.remove('signs-hidden');
            hudSignStat.textContent = 'POSTED';
            indicatorSignState.textContent = 'ACTIVE';
            indicatorSignState.className = 'live-indicator';
        } else {
            rightSignsPanel.classList.add('signs-hidden');
            hudSignStat.textContent = 'ABSENT';
            indicatorSignState.textContent = 'UNMARKED';
            indicatorSignState.className = 'live-indicator text-accent';
        }
        syncAll();
    });

    // 9. Public Road Switch
    const switchPublicRoad = document.getElementById('switch-public-road');
    switchPublicRoad.addEventListener('change', (e) => {
        modelFeatures.public_road = e.target.checked;
        syncAll();
    });

    // 10. Holiday Switch
    const switchHoliday = document.getElementById('switch-holiday');
    switchHoliday.addEventListener('change', (e) => {
        modelFeatures.holiday = e.target.checked;
        syncAll();
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
        syncAll();
    });

    // 12. Prior Accidents Stepper (0 to 7)
    const btnAccidentDec = document.getElementById('btn-accident-dec');
    const btnAccidentInc = document.getElementById('btn-accident-inc');

    btnAccidentDec.addEventListener('click', () => {
        if (modelFeatures.num_reported_accidents > 0) {
            modelFeatures.num_reported_accidents--;
            updateAccidentDisplay();
            syncAll();
        }
    });

    btnAccidentInc.addEventListener('click', () => {
        if (modelFeatures.num_reported_accidents < 7) {
            modelFeatures.num_reported_accidents++;
            updateAccidentDisplay();
            syncAll();
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

    // Copy JSON to clipboard on click
    jsonCodePreview.addEventListener('click', () => {
        navigator.clipboard.writeText(JSON.stringify(modelFeatures, null, 2)).then(() => {
            const notice = document.getElementById('copy-notice');
            notice.textContent = '✓ Copied to clipboard!';
            setTimeout(() => { notice.textContent = 'Click payload to copy'; }, 2000);
        });
    });

    // Synchronize UI Displays
    function updateCurvatureDisplay() {
        const curve = modelFeatures.curvature_bin;
        if (curve === 'Straight') {
            simState.targetCurveBend = 0;
            hudCurve.textContent = 'STRAIGHT (0°)';
            svgCurveArrow.setAttribute('d', 'M 50 80 L 50 20 L 40 32 M 50 20 L 60 32');
            signCurveText.textContent = 'ROAD AHEAD';
        } else if (curve === 'Slight_Curve') {
            simState.targetCurveBend = 0.35;
            hudCurve.textContent = 'SLIGHT (+15°)';
            svgCurveArrow.setAttribute('d', 'M 50 80 Q 50 45 68 28 L 56 25 M 68 28 L 68 40');
            signCurveText.textContent = 'CURVE RIGHT';
        } else if (curve === 'Moderate_Curve') {
            simState.targetCurveBend = 0.65;
            hudCurve.textContent = 'MODERATE (+30°)';
            svgCurveArrow.setAttribute('d', 'M 45 80 Q 45 40 76 25 L 64 22 M 76 25 L 75 37');
            signCurveText.textContent = 'SHARP CURVE';
        } else if (curve === 'Sharp_Curve') {
            simState.targetCurveBend = 1.0;
            hudCurve.textContent = 'SHARP (+45°)';
            svgCurveArrow.setAttribute('d', 'M 40 80 Q 40 35 84 22 L 72 18 M 84 22 L 82 35');
            signCurveText.textContent = 'HAIRPIN BEND';
        }
        miniRadar.render();
    }

    function updateSpeedDisplay() {
        const speed = modelFeatures.speed_limit;
        hudSpeedVal.textContent = speed;
        signSpeedNum.textContent = speed;

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

        // Update hazard badge & color
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

        // Render bar pips
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
            hudGrip.textContent = '55% WET / SLICK';
            hudGrip.className = 'stat-value text-accent';
            hudVisibility.textContent = '3 MILES (RAIN)';
            advisoryIcon.textContent = '🌧️';
            advisoryTitle.textContent = 'SLIPPERY WHEN WET';
            advisoryDesc.textContent = 'REDUCE SPEED NOW';
            lblActiveWeather.textContent = 'Rainstorm & Wet Pavement';
        } else if (modelFeatures.weather === 'foggy') {
            hudGrip.textContent = '85% DAMP';
            hudGrip.className = 'stat-value';
            hudVisibility.textContent = '0.4 MILES (FOG)';
            advisoryIcon.textContent = '🌫️';
            advisoryTitle.textContent = 'DENSE FOG ADVISORY';
            advisoryDesc.textContent = 'USE LOW BEAM ONLY';
            lblActiveWeather.textContent = 'Volumetric Fog Alert';
        } else {
            hudGrip.textContent = '100% DRY';
            hudGrip.className = 'stat-value text-neon-green';
            hudVisibility.textContent = modelFeatures.lighting === 'night' ? 'HEADLIGHT RANGE' : '10 MILES';
            advisoryIcon.textContent = '☀️';
            advisoryTitle.textContent = 'CONDITIONS CLEAR';
            advisoryDesc.textContent = 'SURFACE DRY';
            lblActiveWeather.textContent = 'Clear Conditions';
        }
    }

    function syncAll() {
        jsonCodePreview.textContent = JSON.stringify(modelFeatures, null, 2);
    }

    function applyPreset(preset) {
        Object.assign(modelFeatures, preset);

        // Update Pills
        setActivePill('#ctrl-road-type', modelFeatures.road_type);
        setActivePill('#ctrl-curvature', modelFeatures.curvature_bin);
        setActivePill('#ctrl-speed-pills', String(modelFeatures.speed_limit));
        setActivePill('#ctrl-lanes', String(modelFeatures.num_lanes));
        setActivePill('#ctrl-lighting', modelFeatures.lighting);
        setActivePill('#ctrl-weather', modelFeatures.weather);
        setActivePill('#ctrl-time-of-day', modelFeatures.time_of_day);

        // Update Switches
        switchRoadSigns.checked = modelFeatures.road_signs_present;
        switchRoadSigns.dispatchEvent(new Event('change'));

        switchPublicRoad.checked = modelFeatures.public_road;
        switchHoliday.checked = modelFeatures.holiday;
        switchSchoolSeason.checked = modelFeatures.school_season;
        switchSchoolSeason.dispatchEvent(new Event('change'));

        // Update Displays
        updateRoadDisplay();
        updateCurvatureDisplay();
        updateSpeedDisplay();
        updateLightingDisplay();
        updateWeatherDisplay();
        updateTimeDisplay();
        updateAccidentDisplay();
        hudLanes.textContent = `${modelFeatures.num_lanes} ACTIVE`;

        syncAll();
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

    // Initialize Displays
    updateRoadDisplay();
    updateCurvatureDisplay();
    updateSpeedDisplay();
    updateLightingDisplay();
    updateWeatherDisplay();
    updateTimeDisplay();
    updateAccidentDisplay();
    signSchoolBox.classList.add('active');
    syncAll();

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
