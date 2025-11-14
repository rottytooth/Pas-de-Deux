/**
 * Sound Generator Module
 * Provides industrial sound generation for the typing interface
 * 
 * Exports:
 *   soundGenerator.sounds - Array of available sound configurations
 *   soundGenerator.playSound(config) - Play a sound from the configuration
 *   soundGenerator.stopAllSounds() - Stop all currently playing sounds
 */

let audioContext;
let masterGain;
let oscillators = [];
let playing = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.4; // Set master volume to 40% (quieter)
        masterGain.connect(audioContext.destination);
    }
}

function createNoise(type, duration = 3) {
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    } else if (type === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
    } else if (type === 'brown') {
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5;
        }
    }
    
    return buffer;
}

// Sound generation methods grouped together
const soundGenerators = {
    rumble: (ctx, now, variedFreq, pitchVariation, config) => {
        const variant = Math.random();
        let chosenFreq, chosenAttack;
        
        if (variant < 0.5) {
            chosenFreq = 28;
            chosenAttack = 0.6;
        } else if (variant < 0.75) {
            chosenFreq = 35;
            chosenAttack = 0.5;
        } else {
            chosenFreq = 45;
            chosenAttack = 0.4;
        }
        
        const osc = ctx.createOscillator();
        osc.frequency.value = chosenFreq * pitchVariation;
        osc.type = 'sawtooth';
        
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 8 + Math.random() * 12;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = chosenFreq * pitchVariation * 0.5;
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        const noise = ctx.createBufferSource();
        noise.buffer = createNoise('brown');
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = chosenFreq * pitchVariation * 3;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.6, now + chosenAttack);
        gain.gain.setValueAtTime(0.6, now + 2.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
        
        osc.connect(gain);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        lfo.start(now);
        noise.start(now);
        osc.stop(now + 3.5);
        lfo.stop(now + 3.5);
        noise.stop(now + 3.5);
        
        return [osc, lfo, noise];
    },

    grind: (ctx, now, variedFreq, pitchVariation, config) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoise('pink');
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = variedFreq;
        filter.Q.value = 3;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + config.attack);
        gain.gain.setValueAtTime(0.5, now + 2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(now);
        noise.stop(now + 3);
        
        return [noise];
    },

    impact: (ctx, now, variedFreq, pitchVariation, config) => {
        const nodes = [];
        const impactFreq = variedFreq + Math.random() * 600 - 300;
        
        const noise = ctx.createBufferSource();
        noise.buffer = createNoise('brown');
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(impactFreq, now);
        filter.frequency.exponentialRampToValueAtTime(40, now + 0.8);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.9, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(now);
        noise.stop(now + 0.8);
        nodes.push(noise);
        
        for (let i = 0; i < 8; i++) {
            const scrapNoise = ctx.createBufferSource();
            scrapNoise.buffer = createNoise('white');
            
            const scrapFilter = ctx.createBiquadFilter();
            scrapFilter.type = 'bandpass';
            scrapFilter.frequency.value = 200 + Math.random() * 600;
            scrapFilter.Q.value = 15 + Math.random() * 10;
            
            const scrapGain = ctx.createGain();
            const startTime = now + 0.05 + Math.random() * 0.3;
            scrapGain.gain.setValueAtTime(0, startTime);
            scrapGain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
            scrapGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3 + Math.random() * 0.4);
            
            scrapNoise.connect(scrapFilter);
            scrapFilter.connect(scrapGain);
            scrapGain.connect(masterGain);
            scrapNoise.start(startTime);
            scrapNoise.stop(startTime + 1);
            nodes.push(scrapNoise);
        }
        
        return nodes;
    },

    chaos: (ctx, now, variedFreq, pitchVariation, config) => {
        const nodes = [];
        
        for (let i = 0; i < 12; i++) {
            const noise = ctx.createBufferSource();
            noise.buffer = createNoise('white');
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = variedFreq + Math.random() * 800 - 400;
            filter.Q.value = 10 + Math.random() * 20;
            
            const gain = ctx.createGain();
            const startTime = now + Math.random() * 0.4;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
            gain.gain.setValueAtTime(0.3, startTime + 0.8);
            gain.gain.linearRampToValueAtTime(0.5, startTime + 1.5);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            noise.start(startTime);
            noise.stop(startTime + 2);
            nodes.push(noise);
        }
        
        for (let i = 0; i < 15; i++) {
            const osc = ctx.createOscillator();
            osc.frequency.value = 40 * pitchVariation * (1 + Math.random() * 3);
            osc.type = Math.random() > 0.5 ? 'sawtooth' : 'square';
            
            const noise = ctx.createBufferSource();
            noise.buffer = createNoise(Math.random() > 0.5 ? 'white' : 'pink');
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 100 + Math.random() * 500;
            filter.Q.value = 20;
            
            const gain = ctx.createGain();
            const startTime = now + 0.8 + Math.random() * 0.6;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.12, startTime + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5 + Math.random() * 2);
            
            osc.connect(filter);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc.start(startTime);
            noise.start(startTime);
            osc.stop(startTime + 3.5);
            noise.stop(startTime + 3.5);
            
            nodes.push(osc, noise);
        }
        
        return nodes;
    },

    distorted: (ctx, now, variedFreq, pitchVariation, config) => {
        const osc = ctx.createOscillator();
        osc.frequency.value = variedFreq;
        osc.type = 'sawtooth';
        
        const distortion = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i - 128) / 128;
            curve[i] = Math.tanh(x * 5) * 1.5;
        }
        distortion.curve = curve;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = variedFreq * 4;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + config.attack);
        gain.gain.setValueAtTime(0.4, now + 2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3);
        
        osc.connect(distortion);
        distortion.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 3);
        
        return [osc];
    },

    earthquake: (ctx, now, variedFreq, pitchVariation, config) => {
        const osc1 = ctx.createOscillator();
        osc1.frequency.value = variedFreq;
        osc1.type = 'sine';
        
        const osc2 = ctx.createOscillator();
        osc2.frequency.value = variedFreq * 1.5;
        osc2.type = 'triangle';
        
        const noise1 = ctx.createBufferSource();
        noise1.buffer = createNoise('brown');
        
        const noise2 = ctx.createBufferSource();
        noise2.buffer = createNoise('pink');
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 2;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.3;
        
        lfo.connect(lfoGain);
        lfoGain.connect(masterGain.gain);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.7, now + config.attack);
        gain.gain.setValueAtTime(0.7, now + 3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 4);
        
        osc1.connect(gain);
        osc2.connect(gain);
        noise1.connect(filter);
        noise2.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        
        osc1.start(now);
        osc2.start(now);
        noise1.start(now);
        noise2.start(now);
        lfo.start(now);
        
        osc1.stop(now + 4);
        osc2.stop(now + 4);
        noise1.stop(now + 4);
        noise2.stop(now + 4);
        lfo.stop(now + 4);
        
        return [osc1, osc2, noise1, noise2, lfo];
    },

    drone: (ctx, now, variedFreq, pitchVariation, config) => {
        const variant = Math.random();
        const nodes = [];
        
        if (variant < 0.25) {
            // Deep Drone
            const osc1 = ctx.createOscillator();
            osc1.frequency.value = 45 * pitchVariation;
            osc1.type = 'sawtooth';
            
            const osc2 = ctx.createOscillator();
            osc2.frequency.value = 45 * pitchVariation * 2.01;
            osc2.type = 'square';
            
            const osc3 = ctx.createOscillator();
            osc3.frequency.value = 45 * pitchVariation * 0.5;
            osc3.type = 'sine';
            
            const noise = ctx.createBufferSource();
            noise.buffer = createNoise('brown');
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 45 * pitchVariation * 4;
            filter.Q.value = 2;
            
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.3 + Math.random() * 0.4;
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 0.15;
            
            lfo.connect(lfoGain);
            lfoGain.connect(masterGain.gain);
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 1.2);
            gain.gain.setValueAtTime(0.4, now + 6);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 8);
            
            osc1.connect(filter);
            osc2.connect(filter);
            osc3.connect(gain);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc1.start(now);
            osc2.start(now);
            osc3.start(now);
            noise.start(now);
            lfo.start(now);
            
            osc1.stop(now + 8);
            osc2.stop(now + 8);
            osc3.stop(now + 8);
            noise.stop(now + 8);
            lfo.stop(now + 8);
            
            nodes.push(osc1, osc2, osc3, noise, lfo);
        } else if (variant < 0.5) {
            // Dark Drone
            const osc1 = ctx.createOscillator();
            osc1.frequency.value = 38 * pitchVariation;
            osc1.type = 'triangle';
            
            const osc2 = ctx.createOscillator();
            osc2.frequency.value = 38 * pitchVariation * 1.498;
            osc2.type = 'sine';
            
            const osc3 = ctx.createOscillator();
            osc3.frequency.value = 38 * pitchVariation * 3.02;
            osc3.type = 'square';
            
            const lfo1 = ctx.createOscillator();
            lfo1.frequency.value = 0.1;
            const lfoGain1 = ctx.createGain();
            lfoGain1.gain.value = 38 * pitchVariation * 0.03;
            
            const lfo2 = ctx.createOscillator();
            lfo2.frequency.value = 0.07;
            const lfoGain2 = ctx.createGain();
            lfoGain2.gain.value = 0.1;
            
            lfo1.connect(lfoGain1);
            lfoGain1.connect(osc1.frequency);
            lfo2.connect(lfoGain2);
            lfoGain2.connect(masterGain.gain);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 38 * pitchVariation * 6;
            filter.Q.value = 5;
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 1.5);
            gain.gain.setValueAtTime(0.35, now + 7);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 10);
            
            osc1.connect(filter);
            osc2.connect(filter);
            osc3.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc1.start(now);
            osc2.start(now);
            osc3.start(now);
            lfo1.start(now);
            lfo2.start(now);
            
            osc1.stop(now + 10);
            osc2.stop(now + 10);
            osc3.stop(now + 10);
            lfo1.stop(now + 10);
            lfo2.stop(now + 10);
            
            nodes.push(osc1, osc2, osc3, lfo1, lfo2);
        } else if (variant < 0.75) {
            // Sub Bass Drone
            const osc1 = ctx.createOscillator();
            osc1.frequency.value = 32 * pitchVariation;
            osc1.type = 'sine';
            
            const osc2 = ctx.createOscillator();
            osc2.frequency.value = 32 * pitchVariation * 2;
            osc2.type = 'sine';
            
            const osc3 = ctx.createOscillator();
            osc3.frequency.value = 32 * pitchVariation * 4.03;
            osc3.type = 'triangle';
            
            const noise = ctx.createBufferSource();
            noise.buffer = createNoise('brown');
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 150;
            filter.Q.value = 8;
            
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.5;
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 32 * pitchVariation * 0.1;
            
            lfo.connect(lfoGain);
            lfoGain.connect(osc1.frequency);
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 1.8);
            gain.gain.setValueAtTime(0.5, now + 8);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 11);
            
            osc1.connect(gain);
            osc2.connect(gain);
            osc3.connect(filter);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc1.start(now);
            osc2.start(now);
            osc3.start(now);
            noise.start(now);
            lfo.start(now);
            
            osc1.stop(now + 11);
            osc2.stop(now + 11);
            osc3.stop(now + 11);
            noise.stop(now + 11);
            lfo.stop(now + 11);
            
            nodes.push(osc1, osc2, osc3, noise, lfo);
        } else {
            // Industrial Drone
            const osc1 = ctx.createOscillator();
            osc1.frequency.value = 60 * pitchVariation;
            osc1.type = 'sawtooth';
            
            const osc2 = ctx.createOscillator();
            osc2.frequency.value = 60 * pitchVariation * 2.01;
            osc2.type = 'square';
            
            const osc3 = ctx.createOscillator();
            osc3.frequency.value = 60 * pitchVariation * 0.5;
            osc3.type = 'sine';
            
            const noise = ctx.createBufferSource();
            noise.buffer = createNoise('brown');
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 60 * pitchVariation * 4;
            filter.Q.value = 2;
            
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.3 + Math.random() * 0.4;
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 0.15;
            
            lfo.connect(lfoGain);
            lfoGain.connect(masterGain.gain);
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 1.0);
            gain.gain.setValueAtTime(0.4, now + 6);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 8);
            
            osc1.connect(filter);
            osc2.connect(filter);
            osc3.connect(gain);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc1.start(now);
            osc2.start(now);
            osc3.start(now);
            noise.start(now);
            lfo.start(now);
            
            osc1.stop(now + 8);
            osc2.stop(now + 8);
            osc3.stop(now + 8);
            noise.stop(now + 8);
            lfo.stop(now + 8);
            
            nodes.push(osc1, osc2, osc3, noise, lfo);
        }
        
        return nodes;
    },

    crickets: (ctx, now, variedFreq, pitchVariation, config) => {
        const nodes = [];
        
        for (let i = 0; i < 12; i++) {
            const osc = ctx.createOscillator();
            const startFreq = variedFreq + Math.random() * 1500;
            osc.frequency.setValueAtTime(startFreq, now + i * 0.08);
            osc.frequency.exponentialRampToValueAtTime(startFreq * 0.7, now + i * 0.08 + 0.03);
            osc.type = 'sine';
            
            const gain = ctx.createGain();
            const startTime = now + i * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.1, startTime + 0.003);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = startFreq;
            filter.Q.value = 12;
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            osc.start(startTime);
            osc.stop(startTime + 0.05);
            nodes.push(osc);
        }
        
        return nodes;
    },

    voice: (ctx, now, variedFreq, pitchVariation, config) => {
        const nodes = [];
        const formants = [
            { freq: variedFreq * 2, q: 10 },
            { freq: variedFreq * 3.5, q: 15 },
            { freq: variedFreq * 5, q: 8 }
        ];
        
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(variedFreq, now);
        osc.frequency.linearRampToValueAtTime(variedFreq * 1.2, now + 1);
        osc.frequency.linearRampToValueAtTime(variedFreq * 0.9, now + 2);
        osc.type = 'sawtooth';
        
        const noise = ctx.createBufferSource();
        noise.buffer = createNoise('pink');
        
        let lastNode = osc;
        formants.forEach(formant => {
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = formant.freq;
            filter.Q.value = formant.q;
            lastNode.connect(filter);
            lastNode = filter;
        });
        
        const distortion = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i - 128) / 128;
            curve[i] = Math.tanh(x * 8) * 0.8;
        }
        distortion.curve = curve;
        
        lastNode.connect(distortion);
        
        const delays = [0.15, 0.3, 0.45, 0.6];
        delays.forEach((delayTime, idx) => {
            const delayGain = ctx.createGain();
            delayGain.gain.value = 0.3 / (idx + 1);
            
            const delayedOsc = ctx.createOscillator();
            delayedOsc.frequency.setValueAtTime(variedFreq * 0.98, now + delayTime);
            delayedOsc.frequency.linearRampToValueAtTime(variedFreq * 1.18, now + delayTime + 1);
            delayedOsc.type = 'sawtooth';
            
            delayedOsc.connect(distortion);
            delayedOsc.start(now + delayTime);
            delayedOsc.stop(now + delayTime + 2);
            nodes.push(delayedOsc);
        });
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + config.attack);
        gain.gain.setValueAtTime(0.3, now + 2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
        
        distortion.connect(gain);
        noise.connect(gain);
        gain.connect(masterGain);
        
        osc.start(now);
        noise.start(now);
        osc.stop(now + 3.5);
        noise.stop(now + 3.5);
        
        nodes.push(osc, noise);
        return nodes;
    }
};

function stopAllSounds() {
    oscillators.forEach(osc => {
        try {
            osc.stop();
        } catch (e) {}
    });
    oscillators = [];
    playing = null;
    document.querySelectorAll('.button').forEach(btn => btn.classList.remove('playing'));
    document.getElementById('stopButton').classList.add('hidden');
}

function playSound(config) {
    initAudio();
    
    const now = audioContext.currentTime;
    const pitchVariation = 1 + (Math.random() * 0.3 - 0.15);
    const variedFreq = config.freq * pitchVariation;
    
    playing = config.name;

    // Call the appropriate sound generator
    const generator = soundGenerators[config.type];
    if (generator) {
        const nodes = generator(audioContext, now, variedFreq, pitchVariation, config);
        oscillators.push(...nodes);
    }
}

const sounds = [
    { name: 'Subsonic Pulse', type: 'rumble', freq: 28, attack: 0.6},
    { name: 'Earthquake', type: 'earthquake', freq: 25, attack: 0.8 },
    { name: 'Chaos Destroyer', type: 'chaos', freq: 180, attack: 0.01 },
    { name: 'Heavy Grind', type: 'grind', freq: 80, attack: 0.3 },
    { name: 'Impact', type: 'impact', freq: 225, attack: 0.005 },
    { name: 'Distorted Bass', type: 'distorted', freq: 55, attack: 0.2 },
    { name: 'Low Distortion', type: 'distorted', freq: 30, attack: 0.3 },
    { name: 'Grinding Chaos', type: 'grind', freq: 120, attack: 0.15 },
    { name: 'Harsh Noise', type: 'chaos', freq: 350, attack: 0.02 },
    { name: 'Drone', type: 'drone', freq: 45, attack: 1.2 },
    { name: 'Crickets', type: 'crickets', freq: 4500, attack: 0.003 },
    { name: 'Distant Voice', type: 'voice', freq: 140, attack: 0.3}
];

// Export as a soundGenerator object
const soundGenerator = {
    sounds: sounds,
    playSound: playSound,
    stopAllSounds: stopAllSounds
};
