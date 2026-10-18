/**
 * Sentinel Road Telemetry Engine
 * Task 2: 3D Canvas Road Simulation, Dynamic Perspective, Weather Particles, Audio Ambiance & Telemetry
 */

// ==========================================================================
// Simulation State
// ==========================================================================
const simState = {
    speed: 35,               // mph
    curvature: 'Straight',   // 'Straight' | 'Slight_Curve' | 'Moderate_Curve' | 'Sharp_Curve'
    lighting: 'daylight',    // 'daylight' | 'dim' | 'night'
    weather: 'clear',        // 'clear' | 'rainy' | 'foggy'
    lanes: 2,                // 1 | 2 | 3 | 4
    roadType: 'urban',       // 'highway' | 'rural' | 'urban'
    cameraMode: 'cockpit',   // 'cockpit' | 'drone'
    audioActive: false,
    
    // Dynamic math animation offsets
    roadOffset: 0,
    curveBend: 0,
    targetCurveBend: 0,
    fps: 60
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
        // Rain particles
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

        // Night stars
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

        // Smooth curvature interpolation
        simState.curveBend += (simState.targetCurveBend - simState.curveBend) * 0.05;

        // Animate road forward motion
        const speedFactor = simState.speed / 35;
        simState.roadOffset = (simState.roadOffset + 4 * speedFactor) % 80;

        // 1. Draw Sky & Atmosphere
        this.drawSky();

        // 2. Draw Mountains / Horizon Skyline
        this.drawHorizonSilhouettes();

        // 3. Draw Roadside Ground / Shoulders
        this.drawGround();

        // 4. Draw 3D Asphalt Highway & Dashed Markings
        this.drawRoad();

        // 5. Draw Weather Particles (Rain / Mist)
        if (simState.weather === 'rainy') {
            this.drawRain();
        }

        // 6. Drone mode wireframe overlay
        if (simState.cameraMode === 'drone') {
            this.drawDroneGrid();
        }
    }

    drawSky() {
        const { ctx, width, horizonY } = this;
        let skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);

        if (simState.lighting === 'daylight') {
            skyGrad.addColorStop(0, '#1a508b');
            skyGrad.addColorStop(0.6, '#4f8fc0');
            skyGrad.addColorStop(1, '#a6cde2');
        } else if (simState.lighting === 'dim') {
            skyGrad.addColorStop(0, '#19122e');
            skyGrad.addColorStop(0.4, '#472143');
            skyGrad.addColorStop(0.75, '#99443c');
            skyGrad.addColorStop(1, '#ff8a50');
        } else {
            // Night
            skyGrad.addColorStop(0, '#030611');
            skyGrad.addColorStop(0.7, '#070f21');
            skyGrad.addColorStop(1, '#111931');
        }

        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, horizonY);

        // Stars at night
        if (simState.lighting === 'night' && simState.weather !== 'foggy') {
            ctx.fillStyle = '#ffffff';
            for (let star of this.stars) {
                ctx.globalAlpha = star.alpha;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        }

        // Sun or Moon
        if (simState.lighting === 'daylight' && simState.weather !== 'foggy') {
            ctx.save();
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#fff3c4';
            ctx.fillStyle = '#fff9d6';
            ctx.beginPath();
            ctx.arc(width * 0.75, horizonY * 0.35, 34, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (simState.lighting === 'dim') {
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
        
        let color = simState.lighting === 'daylight' ? '#2b415b' : (simState.lighting === 'dim' ? '#1c1527' : '#080c18');
        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        // Distant mountains
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

        if (simState.lighting === 'daylight') {
            groundGrad.addColorStop(0, '#2d4a22');
            groundGrad.addColorStop(1, '#1b3215');
        } else if (simState.lighting === 'dim') {
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

        // Calculate road widths
        const lanes = simState.lanes;
        const bottomRoadWidth = Math.min(width * 0.82, 380 * lanes);
        const topRoadWidth = Math.min(width * 0.08, 40 * lanes);

        const leftTopX = (centerX + curveOffset) - topRoadWidth / 2;
        const rightTopX = (centerX + curveOffset) + topRoadWidth / 2;
        const leftBottomX = centerX - bottomRoadWidth / 2;
        const rightBottomX = centerX + bottomRoadWidth / 2;

        // 1. Road Surface (Asphalt)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(leftTopX, horizonY);
        ctx.lineTo(rightTopX, horizonY);
        ctx.lineTo(rightBottomX, height);
        ctx.lineTo(leftBottomX, height);
        ctx.closePath();

        let asphaltGrad = ctx.createLinearGradient(0, horizonY, 0, height);
        if (simState.lighting === 'daylight') {
            asphaltGrad.addColorStop(0, '#333a46');
            asphaltGrad.addColorStop(1, '#1e242d');
        } else if (simState.lighting === 'dim') {
            asphaltGrad.addColorStop(0, '#262832');
            asphaltGrad.addColorStop(1, '#14161d');
        } else {
            asphaltGrad.addColorStop(0, '#101319');
            asphaltGrad.addColorStop(1, '#080a0e');
        }
        ctx.fillStyle = asphaltGrad;
        ctx.fill();

        // Wet road sheen if rainy
        if (simState.weather === 'rainy') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fill();
        }

        // 2. Road Borders / Shoulder Lines
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

        // 3. Dashed Lane Dividers
        const numLanes = simState.lanes;
        if (numLanes > 1) {
            for (let laneIdx = 1; laneIdx < numLanes; laneIdx++) {
                const laneRatio = laneIdx / numLanes;
                
                // Is this a center divider on rural 2-lane road? (Double yellow)
                const isDoubleYellow = (simState.roadType === 'rural' && numLanes === 2 && laneIdx === 1);

                ctx.strokeStyle = isDoubleYellow ? '#ffcc00' : '#ffffff';
                ctx.lineWidth = isDoubleYellow ? 3 : 2.5;

                // Segment slices for perspective dashed motion
                const totalSlices = 24;
                for (let s = 0; s < totalSlices; s++) {
                    // Segment offset animation
                    let progressStart = ((s * 80 + simState.roadOffset) % (totalSlices * 80)) / (totalSlices * 80);
                    let progressEnd = progressStart + 0.025;

                    if (progressEnd > 1.0) continue;

                    // Non-linear perspective scaling (quadratic foreshortening)
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

        // Radar Target Box
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

        // Concentric radar rings
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();

        // Vehicle marker (center)
        ctx.fillStyle = '#00f59b';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Simulated road trajectory vector based on curvature
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
// Web Audio Synthesizer (Zero External Dependencies)
// ==========================================================================
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.gainNode = null;
        this.rainNode = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // Engine hum oscillator
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
// Controller Bindings & HUD Telemetry Updates
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const roadRenderer = new RoadRenderer('roadCanvas');
    const miniRadar = new MiniRadar('radarCanvas');
    const audio = new AudioEngine();

    // Elements
    const body = document.body;
    const hudSpeedVal = document.getElementById('hud-speed-val');
    const sliderSpeedVal = document.getElementById('slider-speed-val');
    const speedSlider = document.getElementById('ctrl-speed-slider');
    const speedDialArc = document.getElementById('speed-dial-arc');
    const signSpeedNum = document.getElementById('sign-speed-num');
    const hudCurve = document.getElementById('hud-curve');
    const hudLanes = document.getElementById('hud-lanes');
    const hudGrip = document.getElementById('hud-grip');
    const hudVisibility = document.getElementById('hud-visibility');
    const advisoryIcon = document.getElementById('advisory-icon');
    const advisoryTitle = document.getElementById('advisory-title');
    const advisoryDesc = document.getElementById('advisory-desc');
    const lblActiveWeather = document.getElementById('lbl-active-weather');
    const lblActiveRoad = document.getElementById('lbl-active-road');
    const svgCurveArrow = document.getElementById('svg-curve-arrow');
    const signCurveText = document.getElementById('sign-curve-text');

    // 1. Curvature Selector
    const curvatureButtons = document.querySelectorAll('#ctrl-curvature .pill-opt');
    curvatureButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            curvatureButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const curve = btn.getAttribute('data-curve');
            simState.curvature = curve;

            if (curve === 'Straight') {
                simState.targetCurveBend = 0;
                hudCurve.textContent = 'STRAIGHT (0°)';
                svgCurveArrow.setAttribute('d', 'M 50 80 L 50 20 L 40 32 M 50 20 L 60 32');
                signCurveText.textContent = 'ROAD AHEAD';
            } else if (curve === 'Slight_Curve') {
                simState.targetCurveBend = 0.35;
                hudCurve.textContent = 'SLIGHT (+12°)';
                svgCurveArrow.setAttribute('d', 'M 50 80 Q 50 45 68 28 L 56 25 M 68 28 L 68 40');
                signCurveText.textContent = 'CURVE RIGHT';
            } else if (curve === 'Moderate_Curve') {
                simState.targetCurveBend = 0.65;
                hudCurve.textContent = 'MODERATE (+28°)';
                svgCurveArrow.setAttribute('d', 'M 45 80 Q 45 40 76 25 L 64 22 M 76 25 L 75 37');
                signCurveText.textContent = 'SHARP CURVE';
            } else if (curve === 'Sharp_Curve') {
                simState.targetCurveBend = 1.0;
                hudCurve.textContent = 'SHARP (+45°)';
                svgCurveArrow.setAttribute('d', 'M 40 80 Q 40 35 84 22 L 72 18 M 84 22 L 82 35');
                signCurveText.textContent = 'HAIRPIN BEND';
            }
            miniRadar.render();
        });
    });

    // 2. Lighting / Atmosphere Mode
    const lightingButtons = document.querySelectorAll('#ctrl-lighting .pill-opt');
    lightingButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            lightingButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const light = btn.getAttribute('data-light');
            simState.lighting = light;

            body.classList.remove('theme-daylight', 'theme-dim', 'theme-night');
            body.classList.add(`theme-${light}`);
            updateEnvironmentHUD();
        });
    });

    // 3. Weather Mode
    const weatherButtons = document.querySelectorAll('#ctrl-weather .pill-opt');
    weatherButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            weatherButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const weather = btn.getAttribute('data-weather');
            simState.weather = weather;

            body.classList.remove('weather-clear', 'weather-rainy', 'weather-foggy');
            body.classList.add(`weather-${weather}`);
            updateEnvironmentHUD();
        });
    });

    // 4. Speed Limit Slider
    speedSlider.addEventListener('input', (e) => {
        const speed = parseInt(e.target.value, 10);
        simState.speed = speed;
        hudSpeedVal.textContent = speed;
        sliderSpeedVal.textContent = speed;
        signSpeedNum.textContent = speed;

        const normalized = (speed - 25) / (70 - 25);
        const arcOffset = 200 - (normalized * 150);
        speedDialArc.style.strokeDashoffset = arcOffset;

        audio.updateSpeed(speed);
    });

    // 5. Road Lanes Selector
    const lanesButtons = document.querySelectorAll('#ctrl-lanes .pill-opt');
    lanesButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            lanesButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            simState.lanes = parseInt(btn.getAttribute('data-lanes'), 10);
            hudLanes.textContent = `${simState.lanes} ACTIVE`;
        });
    });

    // 6. Road Type Selector
    const roadTypeButtons = document.querySelectorAll('#ctrl-road-type .pill-opt');
    roadTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            roadTypeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.getAttribute('data-type');
            simState.roadType = type;

            if (type === 'urban') lblActiveRoad.textContent = 'Urban Corridor • Sector 4B';
            else if (type === 'highway') lblActiveRoad.textContent = 'Interstate I-95 • Expressway';
            else lblActiveRoad.textContent = 'Rural Pass • Mountain Roadway';
        });
    });

    // 7. Camera View Toggle
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

    // 8. Audio Toggle
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

    function updateEnvironmentHUD() {
        if (simState.weather === 'rainy') {
            hudGrip.textContent = '55% WET / SLICK';
            hudGrip.className = 'stat-value text-accent';
            hudVisibility.textContent = '3 MILES (RAIN)';
            advisoryIcon.textContent = '🌧️';
            advisoryTitle.textContent = 'SLIPPERY WHEN WET';
            advisoryDesc.textContent = 'REDUCE SPEED NOW';
            lblActiveWeather.textContent = 'Rainstorm & Wet Pavement';
        } else if (simState.weather === 'foggy') {
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
            hudVisibility.textContent = simState.lighting === 'night' ? 'HEADLIGHT RANGE' : '10 MILES';
            advisoryIcon.textContent = '☀️';
            advisoryTitle.textContent = 'CONDITIONS CLEAR';
            advisoryDesc.textContent = 'SURFACE DRY';
            lblActiveWeather.textContent = 'Clear Conditions';
        }
    }

    // 9. Main Animation Loop (60 FPS)
    let lastTime = performance.now();
    let frameCount = 0;
    const lblFps = document.getElementById('lbl-fps');

    function animate(time) {
        roadRenderer.render();

        // FPS calculation
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
