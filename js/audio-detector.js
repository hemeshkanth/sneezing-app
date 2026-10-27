/**
 * SneezeDetector - Real-time acoustic sneeze detection using Web Audio API
 * Analyzes audio amplitude, rapid explosive attack slope, and high-frequency
 * turbulent burst characteristic of human sneezes ("Achoo!").
 */
export class SneezeDetector {
  constructor(options = {}) {
    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.sourceNode = null;
    this.animationFrameId = null;

    // Configurable thresholds & weights
    this.sensitivity = options.sensitivity ?? 55; // 20 - 90
    this.highFreqWeight = options.highFreqWeight ?? 0.75; // 0.2 - 1.0
    this.ambientBaseline = 0.05; // noise floor baseline

    // Callbacks
    this.onAudioFrame = options.onAudioFrame || (() => {});
    this.onSneezeDetected = options.onSneezeDetected || (() => {});
    this.onError = options.onError || ((err) => console.error(err));

    // Detection state tracking
    this.isListening = false;
    this.isCalibrating = false;
    this.calibrationSamples = [];
    this.isSpeechDucking = false; // When the app is speaking, suppress detection

    // Sneeze transient state machine
    this.burstStartTime = 0;
    this.inPotentialBurst = false;
    this.peakBurstEnergy = 0;
    this.lastTriggerTime = 0;
    this.cooldownMs = 2200; // Minimum time between consecutive sneeze triggers

    // Circular buffer for short-term history (for attack slope)
    this.historyLength = 8;
    this.energyHistory = new Array(this.historyLength).fill(0);
    this.historyIndex = 0;
  }

  async start() {
    if (this.isListening) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // keep natural acoustics for transient detection
          autoGainControl: false,
        },
        video: false,
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024; // 512 frequency bins
      this.analyser.smoothingTimeConstant = 0.3; // responsive transients

      this.sourceNode.connect(this.analyser);
      this.isListening = true;

      this.loop = this.loop.bind(this);
      this.loop();
      return true;
    } catch (err) {
      this.onError(err);
      this.stop();
      return false;
    }
  }

  stop() {
    this.isListening = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  setSensitivity(val) {
    this.sensitivity = Math.max(10, Math.min(95, val));
  }

  setHighFreqWeight(val) {
    this.highFreqWeight = Math.max(0.1, Math.min(1.0, val));
  }

  setSpeechDucking(ducking) {
    this.isSpeechDucking = ducking;
  }

  calibrateAmbient(durationMs = 1500) {
    this.isCalibrating = true;
    this.calibrationSamples = [];

    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.calibrationSamples.length > 0) {
          const avg =
            this.calibrationSamples.reduce((a, b) => a + b, 0) /
            this.calibrationSamples.length;
          // Set baseline slightly above the average room noise
          this.ambientBaseline = Math.max(0.02, Math.min(0.3, avg * 1.3));
        }
        this.isCalibrating = false;
        resolve(this.ambientBaseline);
      }, durationMs);
    });
  }

  loop() {
    if (!this.isListening || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    this.analyser.getByteFrequencyData(freqData);
    this.analyser.getByteTimeDomainData(timeData);

    // 1. Calculate RMS / overall volume (0 to 1)
    let sumSquares = 0;
    for (let i = 0; i < timeData.length; i++) {
      const norm = (timeData[i] - 128) / 128;
      sumSquares += norm * norm;
    }
    const rms = Math.sqrt(sumSquares / timeData.length);

    // 2. High-Frequency Ratio calculation
    // Sample rate is typically 44.1kHz or 48kHz, bin resolution ~43Hz
    // Low band: 0 - 1.5kHz (bins 0 to ~35)
    // High / friction noise band: 2kHz - 9kHz (bins ~46 to ~210)
    const sampleRate = this.audioContext.sampleRate || 44100;
    const binSize = sampleRate / this.analyser.fftSize;

    let lowEnergy = 0;
    let highEnergy = 0;
    let lowBins = 0;
    let highBins = 0;

    for (let i = 0; i < bufferLength; i++) {
      const freq = i * binSize;
      const mag = freqData[i] / 255;
      if (freq >= 100 && freq < 1500) {
        lowEnergy += mag;
        lowBins++;
      } else if (freq >= 2000 && freq < 8500) {
        highEnergy += mag;
        highBins++;
      }
    }

    const avgLow = lowBins ? lowEnergy / lowBins : 0;
    const avgHigh = highBins ? highEnergy / highBins : 0;

    // High frequency ratio emphasizes turbulence noise (sneeze burst)
    const frictionFactor = avgHigh / (avgLow + 0.05);

    // 3. Combined Sneeze Energy Score (0 - 100)
    // Combines RMS amplitude and high frequency burst weighting
    const weightedEnergy =
      (rms * 0.45 + avgHigh * 0.55 * this.highFreqWeight + frictionFactor * 0.15) * 100;

    const normalizedLevel = Math.min(100, Math.max(0, weightedEnergy));

    // Calibration collection
    if (this.isCalibrating) {
      this.calibrationSamples.push(rms);
    }

    // Dynamic threshold calculation based on user sensitivity (20 to 90)
    // Higher sensitivity slider value means lower threshold needed to trigger!
    // Sensitivity 55 -> threshold around 42
    // Sensitivity 80 -> threshold around 25
    const triggerThreshold = Math.max(15, (100 - this.sensitivity) * 0.95 + this.ambientBaseline * 50);

    // Track energy history for attack detection (sharp burst slope)
    this.energyHistory[this.historyIndex] = normalizedLevel;
    this.historyIndex = (this.historyIndex + 1) % this.historyLength;

    const prevEnergy =
      this.energyHistory.reduce((a, b) => a + b, 0) / this.historyLength;
    const attackSlope = normalizedLevel - prevEnergy;

    // 4. Sneeze Transient State Machine
    const now = performance.now();
    const canTrigger = now - this.lastTriggerTime > this.cooldownMs && !this.isSpeechDucking;

    if (canTrigger) {
      if (normalizedLevel >= triggerThreshold && attackSlope > 8) {
        if (!this.inPotentialBurst) {
          // Burst started
          this.inPotentialBurst = true;
          this.burstStartTime = now;
          this.peakBurstEnergy = normalizedLevel;
        } else {
          this.peakBurstEnergy = Math.max(this.peakBurstEnergy, normalizedLevel);
        }

        const burstDuration = now - this.burstStartTime;
        // Typical sneeze audible transient lasts between 100ms and 650ms
        // If it's a genuine burst within the window, fire detection!
        if (burstDuration >= 90 && burstDuration <= 700) {
          this.lastTriggerTime = now;
          this.inPotentialBurst = false;

          this.onSneezeDetected({
            intensity: Math.round(this.peakBurstEnergy),
            durationMs: Math.round(burstDuration),
            timestamp: new Date(),
          });
        }
      } else if (this.inPotentialBurst) {
        // Energy dropped
        const burstDuration = now - this.burstStartTime;
        if (burstDuration > 700) {
          // Too prolonged (e.g. speaking or sustained shout), cancel
          this.inPotentialBurst = false;
        }
      }
    }

    // Deliver frame update for visualizer & meters
    this.onAudioFrame({
      rms,
      level: normalizedLevel,
      triggerThreshold,
      freqData,
      timeData,
      isDucking: this.isSpeechDucking,
    });

    this.animationFrameId = requestAnimationFrame(this.loop);
  }
}
