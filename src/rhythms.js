/**
 * Rhythm Module
 * Provides bass rhythm generation with multiple presets
 * 
 * Exports:
 *   rhythm.startLoop() - Start the bass rhythm playback
 *   rhythm.stopBass() - Stop the bass rhythm playback
 */

// Rhythm object to encapsulate bass rhythm functionality
const rhythm = (function() {
    // Private variables
    let audioContext = null;
    let isPlaying = false;
    let schedulerIntervalId = null;
    let nextNoteTime = 0;
    let currentBPM = 120;
    let currentPreset = 'classic';
    let volumeMultiplier = 1.0; // For fading out
    let isFading = false;
    let fadeIterations = 0;
    let pEngine = new PulseEngine();
    const scheduleAheadTime = 0.1; // seconds

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Bass presets with different characteristics
    const presets = {
        classic: {
            oscType: 'sawtooth',
            baseFreq: 55,
            lfoFreq: 5,
            lfoAmount: 20,
            filterFreq: 180,
            filterQ: 8,
            detuneRange: 15,
            gain: 1.2,
            attack: 0.005,
            decay: 0.4,
            release: 0.15
        },
        superDetune: {
            oscType: 'sawtooth',
            baseFreq: 55,
            lfoFreq: 7,
            lfoAmount: 45, // Much more wobble
            filterFreq: 200,
            filterQ: 6,
            detuneRange: 40, // Heavy detune
            gain: 1.15,
            attack: 0.01,
            decay: 0.35,
            release: 0.2
        },
        deepSub: {
            oscType: 'sine',
            baseFreq: 40, // Lower frequency
            lfoFreq: 2, // Slow wobble
            lfoAmount: 8,
            filterFreq: 120,
            filterQ: 10,
            detuneRange: 5, // Minimal detune
            gain: 1.3,
            attack: 0.01,
            decay: 0.5,
            release: 0.3
        },
        chaosWobble: {
            oscType: 'sawtooth',
            baseFreq: 60,
            lfoFreq: 12, // Fast chaotic wobble
            lfoAmount: 60,
            filterFreq: 250,
            filterQ: 15,
            detuneRange: 50, // Extreme detune
            gain: 1.0,
            attack: 0.002,
            decay: 0.3,
            release: 0.1
        },
        heavyWobble: {
            oscType: 'sawtooth',
            baseFreq: 48,
            lfoFreq: 8,
            lfoAmount: 35,
            filterFreq: 160,
            filterQ: 20,
            detuneRange: 30,
            gain: 1.2,
            attack: 0.003,
            decay: 0.5,
            release: 0.2
        },
        glitchBass: {
            oscType: 'square',
            baseFreq: 65,
            lfoFreq: 15, // Very fast
            lfoAmount: 55,
            filterFreq: 300,
            filterQ: 5,
            detuneRange: 60, // Maximum chaos
            gain: 1.0,
            attack: 0.001,
            decay: 0.25,
            release: 0.08
        }
    };

    const presetJson = JSON.stringify({
        "tempo": 130,
        "patterns": {
            "bass": {
                "notes": ["c2", "_", "c2", "_", "g2", "_", "c2", "_"],
                "repeat": 2,
                "wave": "square"
            },
            "melody": {
                "notes": ["c4", "e4", "g4", "e4", "f4", "d4"],
                "repeat": 2,
                "wave": "sawtooth"
            },
            "lead": {
                "notes": ["g5", "a5", "c6", "g5", "e5", "_", "_", "_"],
                "repeat": 1,
                "wave": "triangle"
            }
        }
    });


    // Play a single bass thump with current preset
    function playBassThump(time) {
        const ctx = audioContext;
        const preset = presets[currentPreset];
        
        // Safety check
        if (!preset) {
            console.error(`Preset "${currentPreset}" not found! Available presets:`, Object.keys(presets));
            currentPreset = 'classic'; // Fallback to classic
            return;
        }
        
        // Main bass oscillator
        const osc = ctx.createOscillator();
        osc.type = preset.oscType;
        osc.frequency.value = preset.baseFreq;
        
        // LFO for wobble effect
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = preset.lfoFreq;
        
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = preset.lfoAmount;
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        // Gain envelope
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0;
        
        // Low-pass filter for bass
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = preset.filterFreq;
        filter.Q.value = preset.filterQ;
        
        // Random detune based on preset
        osc.detune.value = Math.random() * preset.detuneRange - (preset.detuneRange / 2);
        
        // Connect audio chain
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // ADSR envelope (with volume multiplier for fading)
        const effectiveGain = preset.gain * volumeMultiplier;
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(effectiveGain, time + preset.attack);
        gainNode.gain.exponentialRampToValueAtTime(effectiveGain * 0.3, time + preset.attack + preset.decay);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + preset.attack + preset.decay + preset.release);
        
        // Start oscillators
        osc.start(time);
        lfo.start(time);
        
        // Stop after note duration
        const noteDuration = preset.attack + preset.decay + preset.release + 0.1;
        osc.stop(time + noteDuration);
        lfo.stop(time + noteDuration);
    }

    // Scheduler function
    function scheduler() {
        const currentTime = audioContext.currentTime;
        
        while (nextNoteTime < currentTime + scheduleAheadTime) {
            // Handle fading out - increment on each beat
            if (isFading) {
                fadeIterations++;
                volumeMultiplier = Math.max(0, 1.0 - (fadeIterations / 8.0));
                console.log(`Fading: iteration ${fadeIterations}/8, volume: ${volumeMultiplier.toFixed(2)}`);
                
                if (fadeIterations >= 8) {
                    // Fade complete, stop everything
                    console.log('Fade complete - stopping bass');
                    isPlaying = false;
                    isFading = false;
                    fadeIterations = 0;
                    volumeMultiplier = 1.0; // Reset volume for next time
                    
                    if (schedulerIntervalId) {
                        clearInterval(schedulerIntervalId);
                        schedulerIntervalId = null;
                    }
                    return;
                }
            }
            
            playBassThump(nextNoteTime);
            
            // Calculate next note time based on CURRENT BPM
            const secondsPerBeat = 60.0 / currentBPM;
            nextNoteTime += secondsPerBeat;
        }
    }

    // Start the bass
    function startLoop() {
        initAudio();
        
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Clear any existing scheduler before starting fresh
        if (schedulerIntervalId) {
            clearInterval(schedulerIntervalId);
            schedulerIntervalId = null;
        }
        
        // Reset fade state when starting
        isFading = false;
        fadeIterations = 0;
        volumeMultiplier = 1.0;
        
        isPlaying = true;
        nextNoteTime = audioContext.currentTime;
        schedulerIntervalId = setInterval(scheduler, 25);
        console.log('Bass started successfully with preset:', currentPreset);

        if (!pEngine.getIsPlaying()) {
            pEngine.play(presetJson);
        } else {
            pEngine.updateFromCode(presetJson);
        }
    }

    // Stop the bass (with fade out)
    function stopBass() {
        if (isPlaying && !isFading) {
            // Start the fade out process
            isFading = true;
            fadeIterations = 0;
        }
        if (pEngine.getIsPlaying()) {
            pEngine.stop();
        }
    }

    // Set the BPM
    function setBPM(bpm) {
        currentBPM = bpm;
    }

    // Check if bass is playing (returns false if fading out)
    function isBassPlaying() {
        return isPlaying && !isFading;
    }

    // Cycle to the next bass preset
    function nextPreset() {
        const presetNames = ['classic', 'superDetune', 'deepSub', 'chaosWobble', 'squareBass', 'triBass', 'heavyWobble', 'glitchBass'];
        const currentIndex = presetNames.indexOf(currentPreset);
        const nextIndex = (currentIndex + 1) % presetNames.length;
        currentPreset = presetNames[nextIndex];
        console.log('Switched bass preset to:', currentPreset);
    }

    // Public API
    return {
        startLoop: startLoop,
        stopBass: stopBass,
        setBPM: setBPM,
        isPlaying: isBassPlaying,
        nextPreset: nextPreset
    };
})();