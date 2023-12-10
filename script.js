const KEY_NOTE_MAP = {
    'a': 0, 'w': 1,
    's': 2, 'e': 3,
    'd': 4,
    'f': 5, 't': 6,
    'g': 7, 'y': 8,
    'h': 9, 'u': 10,
    'j': 11
};

let scenes = [];
let audioContext;
let gainNode;
let keyButtons = [];

let startButton;

let listenButton;
let scoreSpan;
let responseTimeSpan;
let accuracySpan;
let timerSpan;

let resultScoreSpan;
let resultCorrectSpan;
let resultAccuracySpan;
let resultBackButton;

let isGamePlaying = false;
let answerKeys = new Int32Array(64);
let userCorrectBits = new Array(64);
let answerCount = 0;
let answerStartedAt;
let isInputBlocked = false;

let correctClicks = 0;
let totalClicks = 0;

let timer = 0;
let timerCallback;

window.addEventListener("load", () => {
    initNoteButtons();
    initAudioContext();

    startButton = document.getElementById("btn_start");
    startButton.addEventListener("click", onStartButtonClicked);
    listenButton = document.getElementById("btn_listen");
    listenButton.addEventListener("click", onListenButtonClicked);

    scoreSpan = document.getElementById("span_score");
    responseTimeSpan = document.getElementById("span_response_time");
    accuracySpan = document.getElementById("span_accuracy");
    timerSpan = document.getElementById("span_timer");

    resultScoreSpan = document.getElementById("span_result_score");
    resultCorrectSpan = document.getElementById("span_result_correct");
    resultAccuracySpan = document.getElementById("span_result_accuracy");
    resultBackButton = document.getElementById("btn_result_back");
    resultBackButton.addEventListener("click", () => switchScene(0));
    
    for (const sceneElement of document.querySelectorAll("#scenes>div")) {
        scenes.push(sceneElement);
    }

    switchScene(0);
});

window.addEventListener("keydown", (e) => {
    if (KEY_NOTE_MAP[e.key] !== undefined) {
        console.log(e.key);
        onNoteButtonClicked(KEY_NOTE_MAP[e.key]);
    }
});


function initAudioContext() {
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.1;
}

function initNoteButtons() {
    keyButtons.splice(0, keyButtons.length);
    let piano = document.getElementById("piano");
    for (let i = 0; i < piano.children.length; i++) {
        const keyButton = piano.children[i];
        keyButton.addEventListener("mousedown", () => {
            const key = i;
            onNoteButtonClicked(key);
        });
        keyButtons[i] = keyButton;
    }
}
function onNoteButtonClicked(userKey) {
    if (!isGamePlaying || isInputBlocked) {
        return;
    }

    let isAnyCorrect = false;
    for (let i = 0; i < answerCount; i++) {
        let relativeAnswerKey = answerKeys[i] % 12;
        if (userCorrectBits[i] == true) {
            continue;
        }
        if (userKey === relativeAnswerKey) {
            userCorrectBits[i] = true;
            isAnyCorrect = true;
            break;
        }
    }

    const relativeUserKey = userKey % 12;
    if (isAnyCorrect) {
        // 맞췄다!
        keyButtons[relativeUserKey].classList.add("correct");
        correctClicks++;

    } else {
        // 틀렸다!
        isInputBlocked = true;

        keyButtons[relativeUserKey].classList.add("wrong");
        setTimeout(() => {
            isInputBlocked = false;
            keyButtons[relativeUserKey].classList.remove("wrong");
        }, 300);
    }
    totalClicks++;

    const isUserAllCorrect = userCorrectBits.filter(x => x, 0).length == answerCount;
    if (isUserAllCorrect) {
        const responseTime = Date.now() - answerStartedAt;
        responseTimeSpan.innerText = (responseTime * 0.001).toFixed(3);

        setTimeout(() => {
            newAnswer();
            playAnswerNotes();
        }, 150);
    }
    scoreSpan.innerText = correctClicks.toString();
    accuracySpan.innerText = ((correctClicks / totalClicks) * 100).toFixed(2);
}

function onStartButtonClicked() {
    if (!isGamePlaying) {
        isGamePlaying = true;

        initGame();
        playAnswerNotes();
    }
}
function onListenButtonClicked() {
    playAnswerNotes();
}

function initGame() {
    newAnswer();
    switchScene(1);
    correctClicks = 0;
    totalClicks = 0;
    accuracySpan.innerText = "0.00";

    timer = 60;
    updateTimerSpan();
    timerCallback = setInterval(timerWork, 1000);
}

function onGameEnd() {
    switchScene(2);
    isGamePlaying = false;
    let accuracy = (correctClicks / totalClicks) * 100;
    let score = (correctClicks / 90) * 80 + (accuracy / 100.0) * 20;
    
    if (totalClicks === 0) {
        accuracy = 0;
        score = 0;
    }

    resultScoreSpan.innerText = score.toFixed(1);
    resultCorrectSpan.innerText = correctClicks.toString() + " / " + totalClicks.toString();
    resultAccuracySpan.innerText = accuracy.toFixed(2);
}
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
function noteToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function newAnswer() {
    answerKeys.fill(-1);
    userCorrectBits.fill(false);
    answerStartedAt = Date.now();
    answerCount = 3;
    for (let i = 0; i < answerCount; i++) {
        let key = 0;
        do {
            key = randInt(36, 96 + 1);
        }
        while (answerKeys.find(x => (x % 12 == key % 12)));
        answerKeys[i] = key;
    }

    for (let i = 0; i < 12; i++) {
        const keyButton = keyButtons[i];
        keyButton.classList.remove("correct");
        keyButton.classList.remove("wrong");
    }
}
function playAnswerNotes() {
    for (let i = 0; i < answerCount; i++) {
        playSound(answerKeys[i], 0, 0.3);
    }
}

function playSound(note, timeOffset, duration) {
    let osc = audioContext.createOscillator();
    osc.connect(gainNode);
    osc.type = 'square';
    osc.frequency.value = noteToFreq(note);

    osc.start(audioContext.currentTime + timeOffset);
    osc.stop(audioContext.currentTime + timeOffset + duration);
}

function switchScene(sceneIndex) {
    scenes.forEach(scene => scene.style.display = "none");
    scenes[sceneIndex].style.display = "block";
}

function timerWork() {
    timer--;
    updateTimerSpan();

    if (timer < 0) {
        onGameEnd();
        clearInterval(timerCallback);
    }
}

function updateTimerSpan() {
    let timeText = "";
    let minutes = Math.floor(timer / 60);
    let seconds = Math.floor(timer % 60);

    if (minutes < 10) {
        timeText += "0";
    }
    timeText += minutes.toString();
    timeText += ":";

    if (seconds < 10) {
        timeText += "0";
    }
    timeText += seconds.toString();
    timerSpan.innerText = timeText;
}