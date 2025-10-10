var startTime;
const DEBUG = true; // Set to true for keyboard side debugging

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
    scope_index: [], // the letters currently in scope toward the lps speed
    mp3_name: "key_left.mp3"
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
    scope_index: [],
    mp3_name: "key_right.mp3"
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

        // make key click sound
        // (new Audio(txt.mp3_name,30,false)).play();
        playSound(sounds[curr_sound]);

        // Add key to current scope
        newlett.activate();
    }
}

const update_speed = (typer) => {
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
    else if (typer.lps <= 0.8) {
        typer.state = type_speed.Largo;      // very slow and broad
    }
    else if (typer.lps <= 1.2) {
        typer.state = type_speed.Adagio;     // slow and stately
    }
    else if (typer.lps <= 2.0) {
        typer.state = type_speed.Andante;    // walking pace
    }
    else if (typer.lps <= 3.0) {
        typer.state = type_speed.Moderato;   // moderate speed
    }
    else if (typer.lps <= 4.5) {
        typer.state = type_speed.Allegro;    // fast and lively
    }
    else if (typer.lps > 4.5) {
        typer.state = type_speed.Presto;     // very fast
    }
    
    // Check if tempo increased (slower to faster state)
    const prevIndex = tempoOrder.indexOf(prevState);
    const currentIndex = tempoOrder.indexOf(typer.state);
    
    if (currentIndex > prevIndex) {
        curr_sound++;
        if (curr_sound >= sounds.length) {
            curr_sound = 0;
        }
    }
    
    // for the marginal cases, keep the previous state
    // meaning, if we were going fast at > 4.5 and now 4.0, it's still fast, but if we were going slow at < 3.0 and just make it over 3.5, we keep it slow
}

const list_of_commands = ['ROT','DUP','POP','EMIT','EMIT'];

const stack = [];

let curr_num = 0;

const run_command = () => {
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

    left_txt.prev_state = left_txt.state;
    right_txt.prev_state = right_txt.state;
}

const check_message = () => {
    // this should check every second for the current speed of both left and right sides
    console.log(`left: ${left_txt.lps}`);
    console.log(`right: ${right_txt.lps}`);
    update_speed(left_txt);
    update_speed(right_txt);

    run_command();
}
