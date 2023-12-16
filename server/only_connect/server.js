const fs = require("fs");
const path = require("path");
var io = null;

function shuffle(array) {
    let tmp, current, top = array.length;

    if(top) while(--top) {
        current = Math.floor(Math.random() * (top + 1));
        tmp = array[current];
        array[current] = array[top];
        array[top] = tmp;
    }

    return array;
};

function startTimer() {
    let update = false;
    if (gameState.timer.active) {
        gameState.timer.time -= 0.05;
        if (gameState.timer.time % 1 <= 0.05) {
            update = true;
        }
    }
    
    if (gameState.timer.time <= 0) {
        gameState.timer.time = 0;
        gameState.timer.active = false;
    }
    
    if (gameState.timer.active) {
        timerTimeout = setTimeout(startTimer, 50);
    }
    else {
        update = true;
        timerTimeout = null;
    }
    
    if (update) {
        io.in("only_connect").emit("gameState", gameState);
    }
}

function stopTimer() {
    let state = gameState[gameState.shownSection];
    switch (gameState.shownSection) {
        case "groups":
        case "sequences":
            if (state.questionType && !state.answer && gameState.timer.active) {
                gameState.timer.active = false;
            }
        case "connections":
            if (state.lives == 0 && gameState.timer.active) {
                gameState.timer.active = false;
            }
            break;
        case "vowels":
            break;
    }
}

const gameQuestions = JSON.parse(fs.readFileSync("only_connect/quizzes/fun.json", "utf8"));
// Shuffle questions
gameQuestions["groups"] = shuffle(gameQuestions["groups"]);
gameQuestions["sequences"] = shuffle(gameQuestions["sequences"]);
gameQuestions["connections"] = shuffle(gameQuestions["connections"]);

var timerTimeout = null;
var gameState = null;
const baseGameState = {
    "shownSection": null,
    "scores": [0, 0],
    "timer": {
        "time": 0,
        "active": false,
    },
    "buzzer": null,
    "groups": {
        "done": false,
        "maxTime": 40,
        "questionsDone": [],
        "questionType": null,
        "boxes": [],
        "answer": null,
        "fixedScore": null,
    },
    "sequences": {
        "done": false,
        "maxTime": 40,
        "questionsDone": [],
        "questionType": null,
        "boxes": [],
        "answer": null,
        "fixedScore": null,
    },
    "connections": {
        "done": false,
        "maxTime": 150,
        "currentBoard": 0,
        "lives": 3,
        "boxes": {
            "completed": [],
            "floating": [],
            "highlighted": [],
        },
        "answer": null,
    },
    "vowels": {
        "done": false,
        "categoryName": null,
        "question": null,
    }
}

function init(i) {
    io = i
}

function connection(socket) {
    if (!gameState) {
        gameState = JSON.parse(JSON.stringify(baseGameState));
    }
    socket.emit("gameState", gameState);
    
    socket.on("changeScore", (score_idx, delta) => {
        for (let i=0; i<gameState.scores.length; i++) {
            if (score_idx === i) {
                gameState.scores[score_idx] += delta;
            }
        }
        io.in("only_connect").emit("gameState", gameState);
    })
    
    socket.on("buzz", (name) => {
        let valid = false;
        let state = gameState[gameState.shownSection];
        switch (gameState.shownSection) {
            case "groups":
            case "sequences":
                let active = gameState.timer.active;
                stopTimer();
                if (active && !gameState.timer.active && !gameState.buzzer) {
                    valid = true;
                }
            case "connections":
                break;
            case "vowels":
                if (!gameState.buzzer && state.question) {
                    valid = true;
                }
                break;
        }
        if (valid) {
            gameState.buzzer = name;
            io.in("only_connect").emit("gameState", gameState);
        }
    })
    
    socket.on("undoBuzzer", () => {
        if (gameState.buzzer) {
            gameState.buzzer = null;
        
            if (gameState.shownSection == "groups" || gameState.shownSection == "sequences") {
                let state = gameState[gameState.shownSection];
                let maxBoxes = gameState.shownSection == "groups" ? 4 : 3;
                if (state.questionType && !gameState.timer.active && gameState.timer.time > 0 && !state.answer && state.boxes.length <= maxBoxes) {
                    gameState.timer.active = true;
                    if (!timerTimeout) {
                        startTimer();
                    }
                }
            }
            io.in("only_connect").emit("gameState", gameState);
        }
    })
    
    socket.on("revealAnswer", (param) => {
        let state = gameState[gameState.shownSection];
        if (gameState.shownSection == "groups" || gameState.shownSection == "sequences") {
            if (state.questionType && !gameState.timer.active && !state.answer) {
                if (param >= 0 && param === state.boxes.length-1) {
                    state.fixedScore = param;
                    let question = gameQuestions[gameState.shownSection][state.questionsDone[state.questionsDone.length-1]];
                    state.boxes = [];
                    state.boxes.push(...question.boxes);
                    state.answer = question.answer;
                    gameState.buzzer = null;
                }
            }
        }
        io.in("only_connect").emit("gameState", gameState);
    })
    
    socket.on("goForward", (param) => {
        let state = gameState[gameState.shownSection];
        switch (gameState.shownSection) {
            case "groups":
            case "sequences":
                if (state.questionType) {
                    // Next part of question
                    let question = gameQuestions[gameState.shownSection][state.questionsDone[state.questionsDone.length-1]];
                    if (state.boxes.length < question.boxes.length) {
                        if (!state.boxes.length) {
                            gameState.timer.time = state.maxTime;
                            gameState.timer.active = true;
                            if (!timerTimeout) {
                                startTimer();
                            }
                        }
                        // Next box
                        if (gameState.timer.active && (gameState.shownSection == "groups" || state.boxes.length < question.boxes.length-1)) {
                            state.boxes.push(question.boxes[state.boxes.length]);
                            state.fixedScore = null;
                            state.answer = null;
                            gameState.buzzer = null;
                        }
                        else if (!gameState.timer.active) {
                            state.boxes = [];
                            state.boxes.push(...question.boxes);
                            state.fixedScore = null;
                            state.answer = null;
                            gameState.buzzer = null;
                            if (gameState.shownSection == "sequences") {
                                state.boxes[state.boxes.length-1] = "?";
                            }
                        }
                    }
                    else if (!state.answer) {
                        if (!gameState.timer.active) {
                            // Show answer
                            state.answer = question.answer;
                            state.boxes = [];
                            state.boxes.push(...question.boxes);
                        }
                    }
                    else {
                        // Back to a menu
                        if (state.questionsDone.length == gameQuestions[gameState.shownSection].length) {
                            // Main menu
                            state.done = true;
                            state.questionsDone = [];
                            state.questionType = null;
                            state.boxes = [];
                            state.answer = null;
                            state.fixedScore = null;
                            gameState.shownSection = null;
                            gameState.timer.active = false;
                            gameState.timer.time = 0;
                            gameState.buzzer = null;
                        }
                        else {
                            // Section menu
                            state.questionType = null;
                            state.boxes = [];
                            state.answer = null;
                            state.fixedScore = null;
                            gameState.timer.active = false;
                            gameState.timer.time = state.maxTime;
                            gameState.buzzer = null;
                        }
                    }
                }
                else {
                    // Pick next question
                    for (let i=0; i<gameQuestions[gameState.shownSection].length; i++) {
                        if (param === i && !state.questionsDone.includes(param)) {
                            state.questionsDone.push(param);
                            state.questionType = gameQuestions[gameState.shownSection][param].type;
                            state.boxes = [];
                            state.answer = null;
                            state.fixedScore = null;
                            gameState.timer.active = false;
                            gameState.timer.time = state.maxTime;
                            gameState.buzzer = null;
                        }
                    }
                }
                break;
            case "connections":
                // Start current board
                if (state.boxes.completed.length + state.boxes.floating.length < 16) {
                    if (param == null) {
                        // Show the boxes for this board
                        let boxes = [];
                        for (let c of gameQuestions.connections[state.currentBoard]) {
                            boxes.push(...c.boxes);
                        }
                        shuffle(boxes);
                        state.boxes = {
                            "completed": [],
                            "floating": boxes,
                            "highlighted": [],
                        }
                        state.answer = null;
                        state.lives = 3;
                        gameState.timer.time = state.maxTime;
                        gameState.timer.active = true;
                        if (!timerTimeout) {
                            startTimer();
                        }
                    }
                }
                else if (!gameState.timer.active) {
                    // Cycle through answers or go to the next board or menu
                    if (param == null) {
                        
                        // Find next answer to reveal
                        let completedIdx = 0;
                        if (state.answer != null) {
                            for (let c of gameQuestions.connections[state.currentBoard]) {
                                if (c.answer == state.answer) {
                                    completedIdx = Math.floor(state.boxes.completed.indexOf(c.boxes[0]) / c.boxes.length) + 1;
                                    break;
                                }
                            }
                        }
                        
                        
                        // Show more connections if needed
                        if (state.boxes.completed.length < 16 && state.boxes.completed.length <= completedIdx*4) {
                            state.boxes.floating = [];
                            state.boxes.highlighted = [];
                            for (let c of gameQuestions.connections[state.currentBoard]) {
                                if (!state.boxes.completed.includes(c.boxes[0])) {
                                    state.boxes.completed.push(...c.boxes);
                                }
                            }
                        }
                        else if (completedIdx < gameQuestions.connections[state.currentBoard].length) {
                            // Next answer
                            for (let c of gameQuestions.connections[state.currentBoard]) {
                                if (c.boxes.includes(state.boxes.completed[completedIdx*4])) {
                                    state.answer = c.answer;
                                    break;
                                }
                            }
                        }
                        else {
                            // Next board
                            state.boxes = {
                                "completed": [],
                                "floating": [],
                                "highlighted": [],
                            }
                            state.answer = null;
                            state.currentBoard = (state.currentBoard + 1) % 2;
                            state.lives = 3;
                            state.done = !state.currentBoard;
                            gameState.timer.time = state.maxTime;
                            gameState.timer.active = false;
                            if (state.done) {
                                // Go back to menu
                                gameState.shownSection = null;
                                gameState.timer.time = 0;
                            }
                        }
                    }
                }
                // Click a tile and either highlight or try a connection
                else if (param != null) {
                    let boxValue = state.boxes.floating[param - state.boxes.completed.length];
                    if (boxValue) {
                        let hl = state.boxes.highlighted;
                        if (hl.includes(boxValue)) {
                            hl.splice(hl.indexOf(boxValue), 1);
                        }
                        else {
                            hl.push(boxValue);
                            if (hl.length == 4) {
                                let validGuess = true;
                                for (let c of gameQuestions.connections[state.currentBoard]) {
                                    validGuess = true;
                                    for (let guess of hl) {
                                        if (!c.boxes.includes(guess)) {
                                            validGuess = false;
                                        }
                                    }
                                    if (validGuess) {
                                        for (let guess of hl) {
                                            state.boxes.completed.push(guess);
                                            state.boxes.floating.splice(state.boxes.floating.indexOf(guess), 1);
                                        }
                                        if (state.boxes.completed.length == 12) {
                                            state.boxes.completed.push(...state.boxes.floating);
                                            state.boxes.floating = [];
                                        }
                                        break;
                                    }
                                }
                                if (!validGuess && state.boxes.completed.length >= 8) {
                                    state.lives -= 1;
                                    if (!state.lives) {
                                        stopTimer();
                                    }
                                }
                                hl.splice(0, hl.length);
                            }
                        }
                        if (state.boxes.completed.length == 16) {
                            gameState.timer.active = false;
                            gameState.timer.time = state.maxTime;
                        }
                    }
                }
                gameState.buzzer = null;
                break;
            case "vowels":
                // Find the category for the next question
                    // Default to first category if at beginning
                let categoryIdx = 0;
                for (let i=0; i<gameQuestions.vowels.length; i++) {
                    if (gameQuestions.vowels[i].categoryName == state.categoryName) {
                        categoryIdx = i;
                        break;
                    }
                }
                
                let category = gameQuestions.vowels[categoryIdx];
                state.categoryName = category.categoryName;
                
                let nextQuestion = category.questions[0].question;
                for (let i=0; i<category.questions.length; i++) {
                    if (category.questions[i].question == state.question) {
                        nextQuestion = category.questions[i].answer;
                        break;
                    }
                    else if (category.questions[i].answer == state.question) {
                        if (i+1 < category.questions.length) {
                            nextQuestion = category.questions[i+1].question;
                            gameState.buzzer = null;
                        }
                        else if (categoryIdx+1 < gameQuestions.vowels.length) {
                            // Next category
                            nextQuestion = null;
                            state.categoryName = gameQuestions.vowels[categoryIdx+1].categoryName;
                            gameState.buzzer = null;
                        }
                        else {
                            // Finished vowels
                            state.done = true;
                            state.categoryName = null;
                            nextQuestion = null;
                            gameState.shownSection = null;
                            gameState.timer.time = 0;
                            gameState.timer.active = false;
                            gameState.buzzer = null;
                        }
                        break;
                    }
                }
                if (nextQuestion) {
                    // Update to the next question
                    state.question = nextQuestion;
                }
                else {
                    state.question = null;
                }
                break;
            default:
                // Main menu
                let keys = ["groups", "sequences", "connections", "vowels"];
                for (let i=0; i<keys.length; i++) {
                    if (param === keys[i] && !gameState[param].done) {
                        // Start this section
                        state = gameState[param];
                        gameState.shownSection = param;
                        switch (param) {
                            case "groups":
                            case "sequences":
                                state.questionsDone = [];
                                state.questionType = null;
                                state.boxes = [];
                                state.answer = null;
                                state.fixedScore = null;
                                break;
                            case "connections":
                                state.currentBoard = 0;
                                state.lives = 3;
                                state.boxes = {
                                    "completed": [],
                                    "floating": [],
                                    "highlighted": [],
                                }
                                state.answer = null;
                                break;
                            case "vowels":
                                state.categoryName = gameQuestions.vowels[0].categoryName;
                                state.question = null;
                                break;
                        }
                        gameState.timer.time = state.maxTime;
                        gameState.timer.active = false;
                        gameState.buzzer = null;
                        break;
                    }
                }
        }
        io.in("only_connect").emit("gameState", gameState);
    })
    
    socket.on("disconnect", () => {
        if (!("only_connect" in io.sockets.adapter.rooms)) {
            gameState = null;
        }
    })
}

module.exports = {
    init,
    connection,
}