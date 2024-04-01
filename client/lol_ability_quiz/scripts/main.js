const playerWrapper = document.getElementById('playerWrapper');
const gameQuestion = document.getElementById('gameQuestion');
const gameAnswers = document.getElementById('gameAnswers');

const socket = io("/lol_ability_quiz", {autoConnect: false})

var questionID = null;
var playerName = null;
var playerID = null;
const answerNumber = 4;
const requestedImages = [];
var requestedLoaded = 0;
var players = [];
var restarted = false;

function processAnswerKey(key, img=false) {
    if (img) {
        let i = document.createElement('img');
        i.src = key;
        i.classList.add('answerImage');
        return i.outerHTML;
    }
    else {
        let s = document.createElement('span');
        s.innerHTML = key;
        s.classList.add('answerText');
        return s.outerHTML;
    }
}

function setupAnswerDivs() {
    for (let i=0; i<answerNumber; i++) {
        let d = document.createElement('div');
        d.id = `gameAnswer${i}`;
        d.classList.add('answer');
        d.onclick = () => {
            socket.emit('answer', questionID, i);
        }
        gameAnswers.appendChild(d);
    }
}

function getPlayerDiv() {
    let d = document.createElement('div');
    d.classList.add('player');
    
    let d1 = document.createElement('div');
    d1.classList.add('playerName');
    
    let d2 = document.createElement('div');
    d2.classList.add('playerScore');
    
    d.appendChild(d1);
    d.appendChild(d2);
    
    return d;
}

function updateHUD() {
    while (playerWrapper.childElementCount > players.length)
        playerWrapper.removeChild(playerWrapper.children[playerWrapper.childElementCount]);

    while (playerWrapper.childElementCount < players.length)
        playerWrapper.appendChild(getPlayerDiv());
    
    for (let i=0; i<players.length; i++) {
        let d = playerWrapper.children[i];
        let p = players[i];
        
        d.children[0].innerHTML = `Name: ${p.name}`;
        d.children[1].innerHTML = `Score: ${p.score}`;
        
        if (p.player_id == playerID) {
            d.classList.add('activePlayer');
        }
        else {
            d.classList.remove('activePlayer');
        }
    }
    
    if (players.length == 1 && !restarted) {
        socket.emit('restart');
    }
    restarted = true;
}

function main() {
    setupAnswerDivs();
    while (!playerName) {
        playerName = window.prompt('Enter Your Name');
    }
    socket.connect();
}