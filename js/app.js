import { SneezeDetector } from './audio-detector.js';
import { SpeechEngine } from './speech-engine.js';
import { Visualizer } from './visualizer.js';

// DOM Elements — Header & Themes
const micStatusBadge = document.getElementById('micStatusBadge');
const micStatusText = document.getElementById('micStatusText');
const themeButtons = document.querySelectorAll('.theme-btn');

// Hero Display Elements
const heroDisplay = document.getElementById('heroDisplay');
const reactionStateLabel = document.getElementById('reactionStateLabel');
const heroHeadline = document.getElementById('heroHeadline');
const heroSubphrase = document.getElementById('heroSubphrase');
const blessingCount = document.getElementById('blessingCount');
const lastTransientText = document.getElementById('lastTransientText');
const lastRatioText = document.getElementById('lastRatioText');

const toggleMicBtn = document.getElementById('toggleMicBtn');
const toggleMicLabel = document.getElementById('toggleMicLabel');
const testSneezeBtn = document.getElementById('testSneezeBtn');
const calibrateBtn = document.getElementById('calibrateBtn');

// Radar / Visualizer Elements
const visualizerCanvas = document.getElementById('visualizerCanvas');
const thresholdGuideLine = document.getElementById('thresholdGuideLine');
const thresholdLabel = document.getElementById('thresholdLabel');
const meterFill = document.getElementById('meterFill');
const meterMarker = document.getElementById('meterMarker');
const currentLevelText = document.getElementById('currentLevelText');

const sensitivitySlider = document.getElementById('sensitivitySlider');
const sensitivityVal = document.getElementById('sensitivityVal');
const freqWeightSlider = document.getElementById('freqWeightSlider');
const freqWeightVal = document.getElementById('freqWeightVal');

// Voice & Personality Elements
const personalityChips = document.getElementById('personalityChips');
const presetTag = document.getElementById('presetTag');
const customPhraseInput = document.getElementById('customPhraseInput');
const voiceSelect = document.getElementById('voiceSelect');
const pitchSlider = document.getElementById('pitchSlider');
const pitchVal = document.getElementById('pitchVal');
const rateSlider = document.getElementById('rateSlider');
const rateVal = document.getElementById('rateVal');
const chimeToggle = document.getElementById('chimeToggle');

// Ledger Elements
const logList = document.getElementById('logList');
const clearLogBtn = document.getElementById('clearLogBtn');

// Sneeze Counter formatting
let totalBlessings = parseInt(localStorage.getItem('blessingCount') || '0', 10);
updateBlessingCounter();

function updateBlessingCounter() {
  blessingCount.textContent = totalBlessings < 10 ? `0${totalBlessings}` : totalBlessings.toString();
  localStorage.setItem('blessingCount', totalBlessings.toString());
}

// Initialize Visualizer
const visualizer = new Visualizer(visualizerCanvas);

// Initialize Speech Engine
const speechEngine = new SpeechEngine({
  onStart: (phrase) => {
    detector.setSpeechDucking(true);
    triggerReactionUI(phrase);
  },
  onEnd: () => {
    setTimeout(() => {
      detector.setSpeechDucking(false);
      resetReactionUI();
    }, 500);
  },
});

speechEngine.onVoicesLoaded = (voices) => {
  voiceSelect.innerHTML = '<option value="">DEFAULT SYSTEM SYNTHESIZER</option>';
  voices.forEach((v, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${v.name.toUpperCase()} [${v.lang}]`;
    voiceSelect.appendChild(opt);
  });
};

// Initialize Sneeze Detector
const detector = new SneezeDetector({
  sensitivity: parseInt(sensitivitySlider.value, 10),
  highFreqWeight: parseInt(freqWeightSlider.value, 10) / 100,
  onAudioFrame: (data) => {
    visualizer.drawAudioFrame(data);
    updateMeter(data.level, data.triggerThreshold);
  },
  onSneezeDetected: (metrics) => {
    handleSneeze(metrics);
  },
  onError: (err) => {
    console.error('Microphone access error:', err);
    alert('Microphone permission required. Please allow microphone access in your browser.');
    updateMicButton(false);
  },
});

// Sneeze Execution
function handleSneeze(metrics = {}) {
  totalBlessings++;
  updateBlessingCounter();

  const intensity = metrics.intensity || Math.floor(Math.random() * 25 + 75);
  const duration = metrics.durationMs || Math.floor(Math.random() * 200 + 180);
  const timestamp = metrics.timestamp || new Date();

  lastTransientText.textContent = `${duration}ms`;
  lastRatioText.textContent = `${intensity}%`;

  const phrase = customPhraseInput.value.trim() || speechEngine.getPreset(speechEngine.currentPresetKey).phrase;
  speechEngine.speak(phrase);

  addLedgerRow({
    index: totalBlessings,
    phrase,
    intensity,
    timestamp,
  });
}

// Graphic Inversion Reaction
function triggerReactionUI(phrase) {
  heroDisplay.classList.add('triggered');
  reactionStateLabel.textContent = 'TRANSIENT SNEEZE EXPULSION DETECTED';
  heroHeadline.textContent = 'BLESS YOU.';
  heroSubphrase.textContent = `"${phrase}"`;
  setMicStatus('TRANSMITTING BLESSINGS', 'status-sneezing');
}

function resetReactionUI() {
  heroDisplay.classList.remove('triggered');
  if (detector.isListening) {
    reactionStateLabel.textContent = 'ACOUSTIC MONITORING ACTIVE';
    heroHeadline.textContent = 'LISTENING.';
    heroSubphrase.textContent = 'Analyzing real-time frequency distribution for sneeze pressure transients.';
    setMicStatus('MONITORING ACTIVE', 'status-listening');
  } else {
    reactionStateLabel.textContent = 'ACOUSTIC MONITORING INACTIVE';
    heroHeadline.textContent = 'WAITING.';
    heroSubphrase.textContent = 'Press [ START LISTENING ] to initiate real-time acoustic analysis.';
    setMicStatus('IDLE / STANDBY', 'status-idle');
  }
}

function setMicStatus(text, className) {
  micStatusText.textContent = text;
  micStatusBadge.className = `status-indicator ${className}`;
}

function updateMicButton(listening) {
  if (listening) {
    toggleMicBtn.classList.add('active');
    toggleMicLabel.textContent = 'STOP MONITORING';
    reactionStateLabel.textContent = 'ACOUSTIC MONITORING ACTIVE';
    heroHeadline.textContent = 'LISTENING.';
    heroSubphrase.textContent = 'Analyzing real-time frequency distribution for sneeze pressure transients.';
    setMicStatus('MONITORING ACTIVE', 'status-listening');
  } else {
    toggleMicBtn.classList.remove('active');
    toggleMicLabel.textContent = 'START LISTENING';
    reactionStateLabel.textContent = 'ACOUSTIC MONITORING INACTIVE';
    heroHeadline.textContent = 'WAITING.';
    heroSubphrase.textContent = 'Press [ START LISTENING ] to initiate real-time acoustic analysis.';
    setMicStatus('IDLE / STANDBY', 'status-idle');
  }
}

function updateMeter(level, threshold) {
  const clampedLevel = Math.min(100, Math.max(0, level));
  meterFill.style.width = `${clampedLevel}%`;
  currentLevelText.textContent = `${clampedLevel.toFixed(1)}%`;

  const clampedThresh = Math.min(95, Math.max(10, threshold));
  meterMarker.style.left = `${clampedThresh}%`;
  thresholdGuideLine.style.bottom = `${clampedThresh}%`;
  thresholdLabel.textContent = `THRESHOLD: ${Math.round(clampedThresh)}%`;
}

// Chronology Ledger
function addLedgerRow({ index, phrase, intensity, timestamp }) {
  const emptyRow = logList.querySelector('.empty-ledger-row');
  if (emptyRow) emptyRow.remove();

  const formattedNum = index < 10 ? `0${index}` : index.toString();
  const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const row = document.createElement('div');
  row.className = 'ledger-row';
  row.innerHTML = `
    <span class="col-num">${formattedNum}</span>
    <span class="col-time">${timeStr}</span>
    <span class="col-intensity">${intensity}%</span>
    <span class="col-phrase">${escapeHtml(phrase)}</span>
  `;

  logList.prepend(row);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Event Listeners — Primary Actions
toggleMicBtn.addEventListener('click', async () => {
  if (detector.isListening) {
    detector.stop();
    updateMicButton(false);
  } else {
    const success = await detector.start();
    if (success) {
      updateMicButton(true);
    }
  }
});

testSneezeBtn.addEventListener('click', () => {
  handleSneeze({
    intensity: 89,
    durationMs: 310,
    timestamp: new Date(),
  });
});

calibrateBtn.addEventListener('click', async () => {
  if (!detector.isListening) {
    alert('Please start listening first before calibrating.');
    return;
  }
  calibrateBtn.disabled = true;
  calibrateBtn.textContent = 'MEASURING NOISE FLOOR...';
  const baseline = await detector.calibrateAmbient(1500);
  calibrateBtn.textContent = `CALIBRATED [${Math.round(baseline * 100)}% BASELINE]`;
  setTimeout(() => {
    calibrateBtn.disabled = false;
    calibrateBtn.textContent = 'CALIBRATE ROOM NOISE';
  }, 2500);
});

// Controls & Sliders
sensitivitySlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  detector.setSensitivity(val);
  sensitivityVal.textContent = `${val}%`;
});

freqWeightSlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  freqWeightVal.textContent = `${val}%`;
  detector.setHighFreqWeight(val / 100);
});

pitchSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  pitchVal.textContent = `${val.toFixed(1)}x`;
  speechEngine.pitch = val;
});

rateSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  rateVal.textContent = `${val.toFixed(1)}x`;
  speechEngine.rate = val;
});

chimeToggle.addEventListener('change', (e) => {
  speechEngine.playChime = e.target.checked;
});

voiceSelect.addEventListener('change', (e) => {
  const idx = e.target.value;
  speechEngine.selectedVoice = idx !== '' ? speechEngine.voices[idx] : null;
});

// Personality Selector
personalityChips.addEventListener('click', (e) => {
  const btn = e.target.closest('.persona-btn');
  if (!btn) return;

  personalityChips.querySelectorAll('.persona-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');

  const presetKey = btn.dataset.preset;
  const preset = speechEngine.setPreset(presetKey);

  presetTag.textContent = preset.tag;
  customPhraseInput.value = preset.phrase;
  pitchSlider.value = preset.pitch;
  pitchVal.textContent = `${preset.pitch.toFixed(1)}x`;
  rateSlider.value = preset.rate;
  rateVal.textContent = `${preset.rate.toFixed(1)}x`;

  if (speechEngine.selectedVoice) {
    const idx = speechEngine.voices.indexOf(speechEngine.selectedVoice);
    if (idx !== -1) voiceSelect.value = idx;
  }
});

// Initial preset setup
const initialPreset = speechEngine.setPreset('butler');
customPhraseInput.value = initialPreset.phrase;

// Clear Ledger
clearLogBtn.addEventListener('click', () => {
  logList.innerHTML = `
    <div class="empty-ledger-row">
      [ NO EVENTS RECORDED — SYSTEM ARMED ]
    </div>
  `;
});

// Palette / Duo-Tone Theme Switcher
themeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    themeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const theme = btn.dataset.setTheme;
    document.documentElement.setAttribute('data-theme', theme);
  });
});
