const fs = require("fs")
const path = require("path")
var io = null

function getPlayerBySocketID(id) {
    for (let p of players) {
        if (p.socket_id == id) {
            return p
        }
    }
    return null
}

function emitAll(args) {
    for (let p of players) {
        io.to(p.socket_id).emit(...args);
    }
}

function filterState() {
    let tmp = [];
    for (let p of players) {
        let t = {};
        for (let key in p) {
            if (key != 'socket_id')
                t[key] = p[key];
        }
        tmp.push(t);
    }
    return tmp;
}

var next_player_id = 0
const base_player_state = {
    'name' : null,
    'player_id': null,
    'socket_id' : null,
    'score' : 0,
    'guessed' : false,
}
var maxScore = Infinity;
var rightAnswer = null;
var wrongAnswer = null;

var all_from_same = false;
const answerNumber = 4;
const questionInfo = {
    'answerIdx' : null,
    'id' : null,
    'timeout' : null,
};

const possibleKeys = ['key', 'url', 'name'];
const players = [];
const answers = JSON.parse(fs.readFileSync(
    '/home/mwc34/server/lol_ability_quiz/abilities.json', 
    'utf8'
));
const preload_urls = [];
for (let i of answers) {
    for (let j of i) {
        preload_urls.push(j['url']);
    }
}

function restartGame() {
    for (let p of players) {
        p.score = 0;
    }
    all_from_same = false;
    rightAnswer = 1;
    wrongAnswer = -1;
    newQuestion();
}

function randomSample(n, s, replace=false) {
    let tmp = [...Array(n).keys()];
    let toReturn = [];
    for (let i=0; i<s; i++) {
        let idx = Math.floor(Math.random()*tmp.length);
        toReturn.push(tmp[idx]);
        if (!replace)
            tmp.splice(idx, 1);
    }
    return toReturn
}

function newQuestion() {
    let idxs = randomSample(answers.length, all_from_same ? 1 : answerNumber);
    if (all_from_same)
        idxs = Array(answerNumber).fill(idxs[0]);
    let subIdxs = [];
    for (let i of new Set(idxs)) {
        subIdxs.push(...randomSample(answers[i].length, idxs.filter(x => x==i).length));
    }
    
    let qa_idxs = randomSample(possibleKeys.length, 2);
    let correctIdx = randomSample(answerNumber, 1);
    
    let t = possibleKeys[qa_idxs[0]];
    let q = [answers[idxs[correctIdx]][subIdxs[correctIdx]][t], t == 'url'];
    let a = [];
    
    t = possibleKeys[qa_idxs[1]];
    
    for (let i=0; i<answerNumber; i++) {
        a.push([answers[idxs[i]][subIdxs[i]][t], t == 'url']);
    }

    if (questionInfo.timeout) {
        clearTimeout(questionInfo.timeout);
        questionInfo.timeout = null;
    }
        
    questionInfo.answerIdx = correctIdx;
    questionInfo.id = Math.floor(Math.random() * 2**16);
    questionInfo.timeout = null;
    questionInfo.q = q;
    questionInfo.a = a;
    
    for (let p of players) {
        p.guessed = false;
    }
    
    emitAll(['new question', questionInfo.id, q, a]);
}

function init(i) {
    io = i
}

function connection(socket) {
    socket.emit('preload', preload_urls);
    
    socket.on('new player', (name) => {
        let p = JSON.parse(JSON.stringify(base_player_state));
        
        p.socket_id = socket.id;
        p.player_id = next_player_id++;
        p.name = name;
        p.score = 0;
        
        players.push(p);
        
        emitAll(['update', filterState()]);
        socket.emit('player id', p.player_id);
        if (questionInfo.id != null) {
            socket.emit('new question', questionInfo.id, questionInfo.q, questionInfo.a);
        }
    })
    
    socket.on('answer', (id, answerIdx) => {
        let p = getPlayerBySocketID(socket.id);
        if (!p) return
        if (questionInfo.id == null || questionInfo.id != id) return
        if (p.guessed) return
        
        
        if (questionInfo.timeout) {
            clearTimeout(questionInfo.timeout);
            questionInfo.timeout = null;
        }
        
        let scoreDelta = questionInfo.answerIdx == answerIdx ? rightAnswer : wrongAnswer;
        
        p.score += scoreDelta;
        
        p.guessed = true;
        
        emitAll(['answer', p.player_id, scoreDelta, scoreDelta > 0 ? questionInfo.answerIdx : null]);
        emitAll(['update', filterState()]);
        
        let c = 0;
        for (let p of players) {
            if (p.guessed)
                c++;
        }

        if (scoreDelta > 0 || c == players.length) {
            if (scoreDelta < 0) {
                emitAll(['answer', null, null, questionInfo.answerIdx]);
            }
            questionInfo.id = null;
            questionInfo.answerIdx = null;
        }
        
        if (p.score < maxScore) {
            if (scoreDelta > 0 || c == players.length) {
                setTimeout(newQuestion, 1000);
            }
            else if (c+1 == players.length) {
                questionInfo.timeout = setTimeout(
                    () => {
                        emitAll(['answer', null, null, questionInfo.answerIdx]);
                        questionInfo.id = null;
                        questionInfo.timeout = null;
                        questionInfo.answerIdx = null;
                        setTimeout(newQuestion, 1000);
                    },
                    5000
                );
            }
        }
    })
    
    socket.on('restart', () => {
        restartGame();
    })
    
    socket.on('hard', () => {
        all_from_same = true;
    })
    
    socket.on('easy', () => {
        all_from_same = false;
    })

    socket.on('set max score', (newMaxScore) => {
        newMaxScore = Math.floor(newMaxScore)
        if (isNaN(newMaxScore)) return
        if (newMaxScore <= 0) return
        
        if (newMaxScore > maxScore) {
            maxScore = newMaxScore;
            newQuestion();
        }
        else {
            maxScore = newMaxScore;
        }
    })
    
    socket.on('set right answer', (newRightAnswer) => {
        newRightAnswer = Math.floor(newRightAnswer);
        if (isNaN(newRightAnswer) || newRightAnswer <= 0) return
        
        rightAnswer = newRightAnswer;
    })
    
    socket.on('set wrong answer', (newWrongAnswer) => {
        newWrongAnswer = Math.floor(newWrongAnswer);
        if (isNaN(newWrongAnswer) || newWrongAnswer >= 0) return
        
        wrongAnswer = newWrongAnswer;
    })
    
    socket.on('disconnect', () => {
        for (let i=0; i<players.length; i++) {
            let p = players[i];
            if (p.socket_id == socket.id) {
                players.splice(i, 1);
                emitAll(['update', filterState()]);
                break;
            }
        }
    })
}

module.exports = {
    init,
    connection,
}