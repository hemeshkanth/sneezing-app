/**
 * SpeechEngine - Speech synthesis & minimalist acoustic cues
 * Uses Web Speech API (speechSynthesis) and Web Audio oscillators.
 */
export class SpeechEngine {
  constructor(options = {}) {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    this.pitch = 1.0;
    this.rate = 1.0;
    this.playChime = true;

    this.onStart = options.onStart || (() => {});
    this.onEnd = options.onEnd || (() => {});

    // Preset Profiles
    this.presets = {
      butler: {
        id: 'butler',
        name: '01 / BUTLER',
        tag: 'PRESET: 01 / BUTLER',
        phrase: 'Bless you, kind sir. May good health ever attend you.',
        pitch: 0.85,
        rate: 0.95,
        voiceFilter: (v) => v.lang.includes('en-GB') || v.name.includes('Daniel') || v.name.includes('Oliver'),
      },
      grandma: {
        id: 'grandma',
        name: '02 / GRANDMA',
        tag: 'PRESET: 02 / GRANDMA',
        phrase: 'Oh bless your sweet little heart, honey. Stay warm and take care.',
        pitch: 1.25,
        rate: 0.9,
        voiceFilter: (v) => v.name.includes('Karen') || v.name.includes('Victoria') || v.name.includes('Fiona'),
      },
      cyberbot: {
        id: 'cyberbot',
        name: '03 / CYBERBOT',
        tag: 'PRESET: 03 / CYBERBOT',
        phrase: 'ALERT: HUMAN NASAL EXPULSION DETECTED. TRANSMITTING BLESSINGS PROTOCOL.',
        pitch: 0.6,
        rate: 1.15,
        voiceFilter: (v) => v.name.includes('Fred') || v.name.includes('Zarvox'),
      },
      anime: {
        id: 'anime',
        name: '04 / ANIME',
        tag: 'PRESET: 04 / ANIME',
        phrase: 'BLESS YOU! Channel your ultimate immune resilience!',
        pitch: 1.4,
        rate: 1.2,
        voiceFilter: (v) => v.name.includes('Samantha') || v.name.includes('Princess'),
      },
      zen: {
        id: 'zen',
        name: '05 / ZEN',
        tag: 'PRESET: 05 / ZEN',
        phrase: 'Breathe out the old, welcome the new. Peace and gentle blessings.',
        pitch: 0.9,
        rate: 0.8,
        voiceFilter: (v) => v.name.includes('Serena') || v.name.includes('Moira') || v.lang.includes('en'),
      },
      sarcastic: {
        id: 'sarcastic',
        name: '06 / SARCASTIC',
        tag: 'PRESET: 06 / SARCASTIC',
        phrase: 'Bless you. Careful you don\'t blow the windows out.',
        pitch: 1.05,
        rate: 1.1,
        voiceFilter: (v) => v.name.includes('Alex') || v.name.includes('Tom'),
      },
      custom: {
        id: 'custom',
        name: '07 / CUSTOM',
        tag: 'PRESET: 07 / CUSTOM',
        phrase: 'Bless you.',
        pitch: 1.0,
        rate: 1.0,
        voiceFilter: () => true,
      },
    };

    this.currentPresetKey = 'butler';
    this.loadVoices();
  }

  loadVoices() {
    if (!this.synth) return;

    const populate = () => {
      this.voices = this.synth.getVoices();
      if (this.onVoicesLoaded) {
        this.onVoicesLoaded(this.voices);
      }
    };

    populate();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = populate;
    }
  }

  getPreset(key) {
    return this.presets[key] || this.presets.butler;
  }

  setPreset(key) {
    if (!this.presets[key]) return;
    this.currentPresetKey = key;
    const preset = this.presets[key];
    this.pitch = preset.pitch;
    this.rate = preset.rate;

    if (this.voices.length > 0 && preset.voiceFilter) {
      const match = this.voices.find(preset.voiceFilter);
      if (match) {
        this.selectedVoice = match;
      }
    }
    return preset;
  }

  /**
   * Minimalist Swiss Acoustic Ping (880Hz / A5 sine wave pulse)
   */
  async playMinimalistPing() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);

      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close();
      }, 500);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  async speak(phrase, overridePitch, overrideRate) {
    if (!this.synth) return;

    this.synth.cancel();

    if (this.playChime) {
      this.playMinimalistPing();
      await new Promise((r) => setTimeout(r, 120));
    }

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.pitch = overridePitch ?? this.pitch;
    utterance.rate = overrideRate ?? this.rate;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.onstart = () => {
      this.onStart(phrase);
    };

    utterance.onend = () => {
      this.onEnd(phrase);
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.onEnd(phrase);
    };

    this.synth.speak(utterance);
  }
}
