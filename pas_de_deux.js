var startTime;

// objects that track what there is to type and what is yet to type
const left_txt = {
    idx: 0,
    div: "preset_text1",
    log: "log1",
    text: "",
    count_loc: "left_count", // current count of letters in time scope
    scope_index: [],
    mp3_name: "key_left.mp3"
};

const right_txt = {
    idx: 0,
    div: "preset_text2",
    log: "log2",
    text: "",
    count_loc: "right_count",
    scope_index: [],
    mp3_name: "key_right.mp3"
};

var tokens = []
var program = []

TIMEOUT = 10000; // how long we look at recent typings

// function millisToMinutesAndSeconds(millis) {
//     var minutes = Math.floor(millis / 60000);
//     var seconds = ((millis % 60000) / 1000).toFixed(0);
//     return minutes + ":" + (seconds < 10 ? '0' : '') + seconds + ':' + (millis % 1000);
// }
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
    document.getElementById(f.txt.count_loc).innerText = ((f.txt.scope_index.length) / 10.0).toFixed(1);
}

/*
Test if letter is relevant to this text and register letter if so
*/
const testText = (e, txt) => {
    if (e.key == txt.text[txt.idx]) {
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
        (new Audio(txt.mp3_name,30,false)).play();

        // Add key to current scope
        newlett.activate();
    }
}
