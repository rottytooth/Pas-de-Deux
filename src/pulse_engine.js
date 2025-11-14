// ============================================================================
// PULSE ENGINE - Modular audio synthesis engine
// A chaotic, distorted audio livecoding engine
// 
// Usage:
//   const engine = new PulseEngine();
//   const code = `{"tempo": 120, "patterns": {"bass": {"notes": ["c2"], "repeat": 4, "wave": "square"}}}`;
//   engine.play(code);
//   engine.stop();
//   engine.updateFromCode(newCode); // Live updates while playing
// ============================================================================

class PulseEngine {
  constructor() {
    this.audioContext = null;
    this.schedulerId = null;
    this.currentTime = 0;
    this.patterns = {};
    this.config = { tempo: 120, wave: 'sine' };
    this.isPlaying = false;
  }

  /**
   * Initialize the Web Audio API context
   */
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  /**
   * Convert note name to frequency in Hz
   * @param {string} note - Note in format like "c4", "d#5", "gb3"
   * @returns {number|null} Frequency in Hz, or null if invalid
   */
  noteToFreq(note) {
    const notes = {
      'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11
    };
    
    const match = note.match(/([a-g])([#b]?)(\d+)/i);
    if (!match) return null;
    
    const [, noteName, accidental, octave] = match;
    let semitone = notes[noteName.toLowerCase()];
    
    if (accidental === '#') semitone += 1;
    if (accidental === 'b') semitone -= 1;
    
    const midiNote = (parseInt(octave) + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  /**
   * Create an aggressive waveshaping distortion curve
   * @param {number} amount - Distortion amount (default: 150)
   * @returns {Float32Array} Distortion curve for WaveShaper
   */
  createDistortionCurve(amount = 150) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const asymmetry = 0.3;
      const shaped = ((3 + amount) * (x + asymmetry * x * x) * 20 * deg) / (Math.PI + amount * Math.abs(x));
      curve[i] = Math.max(-0.9, Math.min(0.9, shaped * 1.5));
    }
    return curve;
  }

  /**
   * Create a bitcrusher reduction curve
   * @param {number} bits - Number of bits (default: 4)
   * @returns {Float32Array} Bitcrusher curve for WaveShaper
   */
  createBitcrusher(bits = 4) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const levels = Math.pow(2, bits);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const crushed = Math.round(x * levels) / levels;
      curve[i] = crushed;
    }
    return curve;
  }

  /**
   * Play a single note with extreme processing and randomization
   * @param {number} freq - Frequency in Hz (null for rest)
   * @param {number} duration - Duration in seconds
   * @param {number} startTime - Start time in AudioContext time
   * @param {string} wave - Waveform type (sine, square, sawtooth, triangle)
   */
  playNote(freq, duration, startTime, wave = 'sine') {
    if (!freq) return; // Rest
    
    const ctx = this.audioContext;
    
    // Random pitch variation (±15 cents)
    const pitchVariation = 1 + (Math.random() - 0.5) * 0.03;
    freq = freq * pitchVariation;
    
    // Random timing humanization (±10ms)
    const timeVariation = (Math.random() - 0.5) * 0.02;
    startTime = Math.max(ctx.currentTime, startTime + timeVariation);
    
    // Random amplitude variation
    const ampVariation = 0.7 + Math.random() * 0.6;
    
    // Main oscillator with random waveform choice
    const osc = ctx.createOscillator();
    const waveTypes = [wave || 'sawtooth', 'square', 'sawtooth'];
    osc.type = waveTypes[Math.floor(Math.random() * waveTypes.length)];
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.linearRampToValueAtTime(freq * (1 + Math.random() * 0.02), startTime + duration * 0.5);
    osc.frequency.linearRampToValueAtTime(freq * (1 - Math.random() * 0.01), startTime + duration);
    
    // Heavily detuned second oscillator
    const osc2 = ctx.createOscillator();
    osc2.type = wave || 'sawtooth';
    const detune = 1.008 + Math.random() * 0.004;
    osc2.frequency.setValueAtTime(freq * detune, startTime);
    
    // Third oscillator for extra thickness (sub-bass)
    const osc3 = ctx.createOscillator();
    osc3.type = 'square';
    osc3.frequency.setValueAtTime(freq * 0.5, startTime);
    
    // Massive noise component
    const bufferSize = ctx.sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    // Noise gain
    const noiseGain = ctx.createGain();
    const noiseLevel = 0.15 + Math.random() * 0.1;
    noiseGain.gain.setValueAtTime(noiseLevel, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    // Random filter for noise
    const noiseFilter = ctx.createBiquadFilter();
    const filterTypes = ['bandpass', 'highpass', 'lowpass'];
    noiseFilter.type = filterTypes[Math.floor(Math.random() * filterTypes.length)];
    noiseFilter.frequency.setValueAtTime(freq * (1 + Math.random() * 3), startTime);
    noiseFilter.Q.setValueAtTime(2 + Math.random() * 8, startTime);
    
    // Mix oscillators
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, startTime);
    oscGain.gain.linearRampToValueAtTime(0.5 * ampVariation, startTime + 0.002);
    oscGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration * (0.7 + Math.random() * 0.3));
    
    // Sub oscillator gain
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.3, startTime);
    
    // First stage: extreme distortion
    const distortion1 = ctx.createWaveShaper();
    distortion1.curve = this.createDistortionCurve(120 + Math.random() * 80);
    distortion1.oversample = '4x';
    
    // Second stage: bitcrusher
    const bitcrusher = ctx.createWaveShaper();
    bitcrusher.curve = this.createBitcrusher(3 + Math.floor(Math.random() * 3));
    
    // Extreme pre-distortion gain
    const preGain = ctx.createGain();
    preGain.gain.setValueAtTime(3 + Math.random() * 2, startTime);
    
    // Post-distortion gain
    const postGain = ctx.createGain();
    postGain.gain.setValueAtTime(0.15, startTime);
    
    // Random filter sweep
    const filter = ctx.createBiquadFilter();
    const filterType = Math.random() > 0.5 ? 'lowpass' : 'bandpass';
    filter.type = filterType;
    const startFreq = 1000 + Math.random() * 4000;
    const endFreq = 500 + Math.random() * 2000;
    filter.frequency.setValueAtTime(startFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
    filter.Q.setValueAtTime(0.5 + Math.random() * 2, startTime);
    
    // Random resonant peak
    const resonantFilter = ctx.createBiquadFilter();
    resonantFilter.type = 'peaking';
    resonantFilter.frequency.setValueAtTime(freq * (2 + Math.random() * 4), startTime);
    resonantFilter.Q.setValueAtTime(10 + Math.random() * 10, startTime);
    resonantFilter.gain.setValueAtTime(15 + Math.random() * 10, startTime);
    
    // Master output gain
    const masterGain = ctx.createGain();
    const masterLevel = 0.4 + Math.random() * 0.3;
    masterGain.gain.setValueAtTime(masterLevel, startTime);
    
    // Random amplitude glitch (20% chance)
    if (Math.random() > 0.8) {
      const glitchTime = startTime + duration * Math.random();
      masterGain.gain.setValueAtTime(0.1, glitchTime);
      masterGain.gain.setValueAtTime(masterLevel, glitchTime + 0.01);
    }
    
    // Connect signal chain
    osc.connect(oscGain);
    osc2.connect(oscGain);
    osc3.connect(subGain);
    
    subGain.connect(preGain);
    oscGain.connect(preGain);
    preGain.connect(distortion1);
    distortion1.connect(bitcrusher);
    bitcrusher.connect(postGain);
    postGain.connect(filter);
    filter.connect(resonantFilter);
    resonantFilter.connect(masterGain);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(distortion1);
    
    masterGain.connect(ctx.destination);
    
    // Start everything
    osc.start(startTime);
    osc.stop(startTime + duration);
    osc2.start(startTime);
    osc2.stop(startTime + duration);
    osc3.start(startTime);
    osc3.stop(startTime + duration);
    noiseSource.start(startTime);
    noiseSource.stop(startTime + duration);
  }

  /**
   * Parse JSON code into patterns and config
   * @param {string} codeText - JSON code to parse
   * @returns {Object} Object with patterns and config
   */
  parseCode(codeText) {
    const parsedPatterns = {};
    const parsedConfig = { tempo: 120 };
    
    try {
      const data = JSON.parse(codeText);
      
      // Parse tempo
      if (data.tempo) {
        parsedConfig.tempo = data.tempo;
      }
      
      // Parse patterns
      if (data.patterns) {
        for (const [name, patternData] of Object.entries(data.patterns)) {
          const notes = patternData.notes || [];
          const repeat = patternData.repeat || 1;
          const wave = patternData.wave || 'sine';
          
          const expandedPattern = [];
          for (let i = 0; i < repeat; i++) {
            expandedPattern.push(...notes);
          }
          
          parsedPatterns[name] = {
            frequencies: expandedPattern.map(note => {
              if (note === '_' || note === '.') return null;
              return this.noteToFreq(note);
            }),
            wave: wave
          };
        }
      }
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message);
    }
    
    return { patterns: parsedPatterns, config: parsedConfig };
  }

  /**
   * Update the engine's patterns and config from code (for live updates)
   * @param {string} codeText - The Pulse code to parse
   * @returns {Object} Parsed patterns and config
   */
  updateFromCode(codeText) {
    const parsed = this.parseCode(codeText);
    this.patterns = parsed.patterns;
    this.config = parsed.config;
    return parsed;
  }

  /**
   * Start playback with the given code
   * @param {string} codeText - The Pulse code to play
   */
  play(codeText) {
    this.init();
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    this.updateFromCode(codeText);
    
    const beatDuration = 60 / this.config.tempo;
    const scheduleAheadTime = 0.1;
    
    const schedule = () => {
      const now = this.audioContext.currentTime;
      const endTime = now + scheduleAheadTime;
      
      while (this.currentTime < endTime) {
        // Schedule all patterns
        Object.entries(this.patterns).forEach(([name, pattern]) => {
          if (!pattern.frequencies || pattern.frequencies.length === 0) return;
          
          const index = Math.floor(this.currentTime / beatDuration) % pattern.frequencies.length;
          const freq = pattern.frequencies[index];
          const wave = pattern.wave || 'sine';
          
          this.playNote(freq, beatDuration * 0.8, this.currentTime, wave);
        });
        
        this.currentTime += beatDuration;
      }
    };
    
    // Reset time
    this.currentTime = this.audioContext.currentTime;
    
    // Clear any existing scheduler
    if (this.schedulerId) {
      clearInterval(this.schedulerId);
    }
    
    // Schedule periodically
    this.schedulerId = setInterval(schedule, 25);
    schedule();
    
    this.isPlaying = true;
  }

  /**
   * Stop playback
   */
  stop() {
    if (this.schedulerId) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.isPlaying = false;
  }

  /**
   * Check if the engine is currently playing
   * @returns {boolean} True if playing
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Get the current audio context
   * @returns {AudioContext|null} The Web Audio API context
   */
  getAudioContext() {
    return this.audioContext;
  }

  /**
   * Get the current patterns
   * @returns {Object} Pattern name -> {frequencies: [], wave: string} mapping
   */
  getPatterns() {
    return this.patterns;
  }

  /**
   * Get the current config
   * @returns {Object} Config with tempo and wave
   */
  getConfig() {
    return this.config;
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PulseEngine;
}

// Export for ES6 modules
if (typeof exports !== 'undefined') {
  exports.PulseEngine = PulseEngine;
}
