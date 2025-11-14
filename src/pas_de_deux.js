var startTime;
const DEBUG = true; // Wimp mode for debugging

const type_speed = {
    Presto: 'Presto',        // very fast
    Allegro: 'Allegro',      // fast and lively
    Moderato: 'Moderato',    // moderate speed
    Andante: 'Andante',      // walking pace
    Adagio: 'Adagio',        // slow and stately
    Largo: 'Largo',          // very slow and broad
    Stopped: 'Stopped'
}

const type_rhythm = {
    Syncopated: 'Syncopated',
    Together: 'Together',
}

const key_hold = {
    Staccato: 'Staccato',
    Legato: 'Legato',
    Tenuto: 'Tenuto'
}

// Map typing speeds to BPM values
function speedToBPM(speed) {
    const bpmMap = {
        'Presto': 160,
        'Allegro': 140,
        'Moderato': 120,
        'Andante': 100,
        'Adagio': 85,
        'Largo': 70,
        'Stopped': 60
    };
    return bpmMap[speed] || 120; // Default to 120 if speed not found
}

var curr_sound = 0; // which sound we're using

// objects that track what there is to type and what is yet to type
const left_txt = {
    id: "left",
    lps: 0.0, // current speed in letters per second
    state: type_speed.Stopped,
    prev_state: type_speed.Stopped,
    idx: 0,
    div: "preset_text1", // which div to update
    log: "log1",
    text: "",
    count_loc: "left_count", // current count of letters in time scope
    speed_loc: "left_speed",
    hold_loc: "left_hold", // where to display key hold state
    scope_index: [], // the letters currently in scope toward the lps speed
    mp3_name: "key_left.mp3",
    key_holds: [], // track last 8 key hold durations
    current_key_down: null, // track current key down time
    hold_state: key_hold.Staccato // current key hold classification
};

const right_txt = {
    id: "right",
    lps: 0.0,
    state: type_speed.Stopped,
    prev_state: type_speed.Stopped,
    idx: 0,
    div: "preset_text2",
    log: "log2",
    text: "",
    count_loc: "right_count",
    speed_loc: "right_speed",
    hold_loc: "right_hold", // where to display key hold state
    scope_index: [],
    mp3_name: "key_right.mp3",
    key_holds: [], // track last 8 key hold durations
    current_key_down: null, // track current key down time
    hold_state: key_hold.Staccato // current key hold classification
};

var tokens = []
var program = []

TIMEOUT = 3000; // how long we count letters toward the typing speed

const Letter = function(txt, timestamp, value) {
    this.txt = txt;

    this.timestamp = timestamp; // just for tracking
    this.value = value; // just for tracking
}
Letter.prototype.activate = function() {
    this.txt.scope_index.push(this); // add itself to the chain
    setTimeout(function(that){
        that.remove(that)
    }, TIMEOUT, this);
    updateCount(this);
}
Letter.prototype.remove = function(that) {
    let i = that.txt.scope_index.indexOf(that);
    that.txt.scope_index.splice(i, 1);
    updateCount(this);
}
const updateCount = (f) => {
    // divide the number of letters in scope by the timeout (in seconds rather than millis)
    f.txt.lps = ((f.txt.scope_index.length) / (TIMEOUT / 1000)).toFixed(1);
    document.getElementById(f.txt.count_loc).innerText = f.txt.lps;
}

/*
Track key hold duration and classify key hold style
*/
const trackKeyHold = (txt, holdDuration) => {
    // Add to the key holds array
    txt.key_holds.push(holdDuration);
    
    // Keep only the last 8 key holds
    if (txt.key_holds.length > 8) {
        txt.key_holds.shift();
    }
    
    // Calculate average hold duration over last 8 keystrokes
    if (txt.key_holds.length > 0) {
        const avgHold = txt.key_holds.reduce((sum, hold) => sum + hold, 0) / txt.key_holds.length;
        
        // Classify key hold style based on average duration
        if (avgHold < 80) {
            txt.hold_state = key_hold.Staccato;      // Very short, detached
        } else if (avgHold < 150) {
            txt.hold_state = key_hold.Tenuto;        // Medium, sustained
        } else {
            txt.hold_state = key_hold.Legato;        // Long, smooth and connected
        }
        
        // Update the display
        const holdElement = document.getElementById(txt.hold_loc);
        if (holdElement) {
            holdElement.innerText = txt.hold_state;
        }
    }
}

/*
Handle key down events to start timing
*/
const handleKeyDown = (e, txt, side) => {
    // Define keyboard sides for DEBUG mode
    const leftKeys = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g', 'z', 'x', 'c', 'v', 'b', '1', '2', '3', '4', '5'];
    const rightKeys = ['y', 'u', 'i', 'o', 'p', 'h', 'j', 'k', 'l', 'n', 'm', '6', '7', '8', '9', '0'];
    
    let keyMatches = false;
    
    if (DEBUG) {
        // In debug mode, test based on keyboard side
        if (side === 'left' && leftKeys.includes(e.key.toLowerCase())) {
            keyMatches = true;
        } else if (side === 'right' && rightKeys.includes(e.key.toLowerCase())) {
            keyMatches = true;
        }
    } else {
        // Normal mode: test if key matches the expected character
        keyMatches = (e.key.toLowerCase() === txt.text[txt.idx]);
    }
    
    if (keyMatches && !txt.current_key_down) {
        txt.current_key_down = performance.now();
    }
}

/*
Handle key up events to calculate hold duration
*/
const handleKeyUp = (e, txt, side) => {
    // Define keyboard sides for DEBUG mode
    const leftKeys = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g', 'z', 'x', 'c', 'v', 'b', '1', '2', '3', '4', '5'];
    const rightKeys = ['y', 'u', 'i', 'o', 'p', 'h', 'j', 'k', 'l', 'n', 'm', '6', '7', '8', '9', '0'];
    
    let keyMatches = false;
    
    if (DEBUG) {
        // In debug mode, test based on keyboard side
        if (side === 'left' && leftKeys.includes(e.key.toLowerCase())) {
            keyMatches = true;
        } else if (side === 'right' && rightKeys.includes(e.key.toLowerCase())) {
            keyMatches = true;
        }
    } else {
        // Normal mode: test if key matches the expected character
        keyMatches = (e.key.toLowerCase() === txt.text[txt.idx]);
    }
    
    if (keyMatches && txt.current_key_down) {
        const holdDuration = performance.now() - txt.current_key_down;
        trackKeyHold(txt, holdDuration);
        txt.current_key_down = null;
    }
}

/*
Function to pronounce a completed word using text-to-speech with stereo positioning
*/

// Track multiple speech instances for true overlapping
let leftSpeechInstance = null;
let rightSpeechInstance = null;

const pronounceWord = (word, side) => {
    if ('speechSynthesis' in window && word.trim().length > 0) {
        
        // Create separate speech synthesis instances for each side
        const utterance = new SpeechSynthesisUtterance(word.trim());
        utterance.rate = 0.8;
        utterance.volume = 1.0;
        
        // Set pitch differently for left vs right
        if (side === 'left') {
            utterance.pitch = 0.8; // Lower pitch for left
            // Cancel only left side previous speech
            if (leftSpeechInstance && speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
            leftSpeechInstance = utterance;
        } else if (side === 'right') {
            utterance.pitch = 1.2; // Higher pitch for right
            // Cancel only right side previous speech  
            if (rightSpeechInstance && speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
            rightSpeechInstance = utterance;
        }
        
        // Immediately speak without waiting
        speechSynthesis.speak(utterance);
        
        // Clear reference when done
        utterance.onend = function() {
            if (side === 'left') leftSpeechInstance = null;
            if (side === 'right') rightSpeechInstance = null;
        };
    }
}

/*
Check if the current character position marks the end of a word
*/
const isWordComplete = (text, currentIndex) => {
    if (currentIndex >= text.length) return false;
    
    const nextChar = text[currentIndex];
    // Check if next character is whitespace or punctuation
    return /[\s\.,;:!?'"()-]/.test(nextChar);
}

/*
Extract the word that was just completed
*/
const getCompletedWord = (text, currentIndex) => {
    if (currentIndex <= 0) return '';
    
    // Find the start of the current word by going backwards
    let wordStart = currentIndex - 1;
    while (wordStart > 0 && !/[\s\.,;:!?'"()-]/.test(text[wordStart - 1])) {
        wordStart--;
    }
    
    // Extract the word from start to current position
    return text.substring(wordStart, currentIndex);
}

const speedCategory = (speed) => {
    if (speed === type_speed.Presto || speed === type_speed.Allegro) {
        return 'fast';
    } else if (speed === type_speed.Largo || speed === type_speed.Adagio) {
        return 'slow';
    } else if (speed === type_speed.Andante || speed === type_speed.Moderato) {
        return 'moderate';
    } else {
        // probably stopped
        return 'unknown';
    }
}

const parseTypeSpeeds = () => {
    let result = {};
    if (speedCategory(left_txt.state) === speedCategory(right_txt.state)
        && left_txt.state !== type_speed.Stopped) {

        result = {'change': true, 'speed': speedCategory(left_txt.state)};
    }
    result['change_hold'] = false;
    if (left_txt.hold_state !== right_txt.hold_state) {
        if (left_txt.hold_state === key_hold.Staccato) {
            result['change_hold'] = true;
            result['hold'] = 'staccato';
        }
        else if (left_txt.hold_state === key_hold.Tenuto) {
            result['change_hold'] = true;
            result['hold'] = 'tenuto';
        }
        else if (left_txt.hold_state === key_hold.Legato) {
            result['change_hold'] = true;
            result['hold'] = 'legato';
        }
    }
    return result;
}

/*
Test if letter is relevant to this text and register letter if so
*/
const testText = (e, txt, side) => {
    // Define keyboard sides for DEBUG mode
    const leftKeys = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g', 'z', 'x', 'c', 'v', 'b', '1', '2', '3', '4', '5'];
    const rightKeys = ['y', 'u', 'i', 'o', 'p', 'h', 'j', 'k', 'l', 'n', 'm', '6', '7', '8', '9', '0'];
    
    let keyMatches = false;
    
    if (DEBUG) {
        // In debug mode, test based on keyboard side
        if (side === 'left' && leftKeys.includes(e.key.toLowerCase())) {
            keyMatches = true;
        } else if (side === 'right' && rightKeys.includes(e.key.toLowerCase())) {
            keyMatches = true;
        }
    } else {
        // Normal mode: test if key matches the expected character
        keyMatches = (e.key.toLowerCase() === txt.text[txt.idx]);
    }
    
    if (keyMatches) {
        txt.idx++;

        var timestamp = 0;

        if (!startTime) { // if it's the first letter
            startTime = new Date();
            timestamp = 0;
        }
        else { // everything else in terms of time since that letter
            nowTime = new Date();
            timestamp = nowTime - startTime;
        }
        var newlett = new Letter(txt, timestamp, e.key);

        // for debugging (must uncomment the div as well)
        // log.innerText += "'" + newlett.value + "' " + millisToMinutesAndSeconds(newlett.timestamp) + "\n";

        var pret = document.getElementById(txt.div);
        pret.innerHTML = "<span class='typed'>" + txt.text.substr(0, txt.idx) + "</span>" + txt.text.substr(txt.idx, txt.text.length);

        // Check if we just completed a word and pronounce it
        if (isWordComplete(txt.text, txt.idx)) {
            const completedWord = getCompletedWord(txt.text, txt.idx);
            pronounceWord(completedWord, txt.id);
        }

        // make key click sound
        const clickSound = new Audio(txt.mp3_name);
        clickSound.volume = 0.35; // Play quieter (range: 0.0 to 1.0)
        clickSound.play();

        let changeType = parseTypeSpeeds();
        console.log('changeType:', changeType, 'left state:', left_txt.state, 'right state:', right_txt.state);
        
        if (changeType.change) {
            soundGenerator.playSound(soundGenerator.sounds[curr_sound]);
            
            // Start or adjust bass rhythm based on typing speed
            const currentSpeed = left_txt.state; // Both typists are at the same state when change occurs
            const targetBPM = speedToBPM(currentSpeed);
            
            console.log('Starting/adjusting bass - Speed:', currentSpeed, 'BPM:', targetBPM, 'isPlaying:', rhythm.isPlaying());
            
            if (!rhythm.isPlaying()) {
                // Start the bass if it's not already playing
                console.log('Calling rhythm.startLoop()');
                rhythm.startLoop();
                rhythm.setBPM(targetBPM);
            } else {
                // Adjust BPM if bass is already playing
                console.log('Adjusting BPM to:', targetBPM);
                rhythm.setBPM(targetBPM);
            }
        }
        
        // Check for hold changes and switch bass preset if Legato
        if (changeType.change_hold && changeType.hold === 'legato') {
            console.log('Hold changed to Legato - switching bass preset');
            rhythm.nextPreset();
        }
        
        // Check if both typists have stopped and fade out bass
        if (left_txt.state === type_speed.Stopped && right_txt.state === type_speed.Stopped) {
            if (rhythm.isPlaying()) {
                console.log('Both typists stopped - stopping bass');
                rhythm.stopBass();
            }
        }
        
        // Add key to current scope
        newlett.activate();
    }
}

const updateSpeed = (typer) => {
    // Store previous state to detect changes
    const prevState = typer.state;
    
    // Define tempo hierarchy (slower to faster)
    const tempoOrder = [
        type_speed.Stopped,
        type_speed.Largo,     // very slow and broad
        type_speed.Adagio,    // slow and stately
        type_speed.Andante,   // walking pace
        type_speed.Moderato,  // moderate speed
        type_speed.Allegro,   // fast and lively
        type_speed.Presto     // very fast
    ];
    
    if (typer.lps <= 0.2) {
        typer.state = type_speed.Stopped;
    }
    else if (typer.lps <= 1.2) {
        typer.state = type_speed.Largo;      // very slow and broad
    }
    else if (typer.lps <= 2.0) {
        typer.state = type_speed.Adagio;     // slow and stately
    }
    else if (typer.lps <= 3.0) {
        typer.state = type_speed.Andante;    // walking pace
    }
    else if (typer.lps <= 5.0) {
        typer.state = type_speed.Moderato;   // moderate speed
    }
    else if (typer.lps <= 9.0) {
        typer.state = type_speed.Allegro;    // fast and lively
    }
    else if (typer.lps > 9.0) {
        typer.state = type_speed.Presto;     // very fast
    }
    
    // Update the speed display
    document.getElementById(typer.speed_loc).innerText = typer.state;
    
    // Check if tempo increased (slower to faster state)
    const prevIndex = tempoOrder.indexOf(prevState);
    const currentIndex = tempoOrder.indexOf(typer.state);
    
    if (currentIndex > prevIndex) {
        curr_sound++;
        if (curr_sound >= soundGenerator.sounds.length) {
            curr_sound = 0;
        }
    }
    
    // for the marginal cases, keep the previous state
    // meaning, if we were going fast at > 4.5 and now 4.0, it's still fast, but if we were going slow at < 3.0 and just make it over 3.5, we keep it slow
}

const stack = [];

let curr_num = 0;

const runCommand = () => {
    // FIXME: this should all come from parseTypeSpeeds()
    if (left_txt.state === right_txt.state
        && left_txt.state !== type_speed.Stopped) 
    {
        if (left_txt.state === type_speed.Presto || left_txt.state === type_speed.Allegro) { // fast tempos
            curr_num++;
            let output = document.getElementById('curr_number');
            output.innerText = curr_num;
        }
        else if (left_txt.state === type_speed.Largo || left_txt.state === type_speed.Adagio || left_txt.state === type_speed.Andante) { // slow tempos
            curr_num--;
            let output = document.getElementById('curr_number');
            output.innerText = curr_num;
        }
        else if (left_txt.state === type_speed.Stopped && left_txt.prev_state !== type_speed.Stopped) {
            stack.push(curr_num);
            let stack_display = document.getElementById("stack");
            stack_display.innerText = stack.join(",");
            curr_num = 0;
        }
    }

    left_txt.prev_state = left_txt.state;
    right_txt.prev_state = right_txt.state;
}

const check_message = () => {
    // this should check every second for the current speed of both left and right sides
    console.log(`left: ${left_txt.lps}`);
    console.log(`right: ${right_txt.lps}`);
    updateSpeed(left_txt);
    updateSpeed(right_txt);
    
    // Check if both typists have stopped and fade out bass
    // Only stop if bass is actually playing (not just stopped state from start)
    if (left_txt.state === type_speed.Stopped && right_txt.state === type_speed.Stopped && rhythm.isPlaying()) {
        console.log('Both typists stopped - stopping bass');
        rhythm.stopBass();
    }

    runCommand();
}
