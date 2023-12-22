function changeScore(score_idx, delta) {
	if (!local) {
		socket.emit("changeScore", score_idx, delta);
		return;
	}
	
	for (let i=0; i<gameState.scores.length; i++) {
		if (score_idx === i) {
			gameState.scores[score_idx] += delta;
		}
	}
	updateGame();
}

function startTimer() {
	if (gameState.timer.active) {
		gameState.timer.time -= 0.05;
	}
	
	if (gameState.timer.time <= 0) {
		gameState.timer.time = 0;
		gameState.timer.active = false;
	}
	
	if (gameState.timer.active)	{
		timerTimeout = setTimeout(startTimer, 50);
	}
	else {
		stopAudio();
		timerTimeout = null;
	}
	updateGame();
}

function stopTimer() {
    let state = gameState[gameState.shownSection];
	switch (gameState.shownSection) {
		case "groups":
		case "sequences":
			if (state.questionType && !state.answer) {
				gameState.timer.active = false;
			}
		case "connections":
			if (state.lives == 0) {
				gameState.timer.active = false;
			}
			break;
		case "vowels":
			break;
	}
}

function buzz() {
    let name = "HOST";
    if (!local) {
		socket.emit("buzz", name);
		return;
	}
    
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
		buzzerAudio.play();
        updateGame();
    }
}

function undoBuzzer() {
	if (!local) {
		socket.emit("undoBuzzer");
		return;
	}
    
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
        updateGame();
    }
}

function revealAnswer(param) {
	if (!local) {
		socket.emit("revealAnswer", param);
		return;
	}
	
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
	updateGame();
}

function goForward(param) {
	if (!local) {
		socket.emit("goForward", param);
		return;
	}
	
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
						if (state.questionType == "music") {
							state.boxes.push(question.boxes[state.boxes.length]);
						}
						else {
							state.boxes = [];
							state.boxes.push(...question.boxes);
                        }
						state.fixedScore = null;
                        state.answer = null;
                        gameState.buzzer = null;
                        if (state.boxes.length == question.boxes.length && gameState.shownSection == "sequences") {
                            state.boxes[state.boxes.length-1] = "?";
                        }
						else if (state.questionType == "music") {
							gameState.timer.time = state.maxTime;
							gameState.timer.active = true;
							if (!timerTimeout) {
								startTimer();
							}
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
	updateGame();
}

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

// -------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------
const TIMER_DONE_COLOUR = "#264653";
const TIMER_UNDONE_COLOUR = "#FDF0D5";


function capitalize(s) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function toggleDelta() {
	if (toggleDeltaBox.innerHTML == "+") {
		toggleDeltaBox.innerHTML = "-";
		delta = -1;
	}
	else {
		toggleDeltaBox.innerHTML = "+";
		delta = 1;
	}
}

function updateScore(score_idx) {
	changeScore(score_idx, delta);
}

function stopAudio() {
	if (!audio.paused || audio.currentTime) {
		audio.pause();
        audio.src = "";
	}
}

function updateGame() {
	// Update the visuals based on the gameState and only the gameState
	let section = gameState.shownSection;
	
	// Update the titleBox
	let titleString = "";
	if (!section) {
		titleString = "Only Connect!";
	}
	else {
		titleString = capitalize(section);
	}
	
	// Update scores
	for (let i=0; i<scoreBoxes.length; i++) {
		scoreBoxes[i].innerHTML = gameState.scores[i];
	}
	
	
	// Update fourBoxWrapper - for menu/groups/sequences
	if (!section || ((section == "groups" || section == "sequences") && gameState[section].questionType)) {
		fourBoxWrapper.style.display = "";
		// Set all given boxes
		if (!section) {
			titleString += " Choose a section!";
			fourBoxTimerWrapper.style.visibility = "hidden";
			// Menu
			let keys = ["groups", "sequences", "connections", "vowels"];
			for (let i=0; i<fourBoxBoxWrapper.childElementCount; i++) {
				let key = keys[i];
				let box = fourBoxBoxWrapper.children[i];
				box.innerHTML = capitalize(key);
				if (gameState[key].done) {
					box.style.opacity = "20%";
				}
				else {
					box.style.opacity = "";
				}
				box.onmousedown = () => {
					goForward(box.innerHTML.toLowerCase());
				}
				box.style.backgroundColor = "#F4A261";
			}
		}
		else {
			titleString += " - Guess the " + section.substring(0, section.length-1) + ": " + gameState[section].questionType;
			fourBoxTimerWrapper.style.visibility = "";
			// Groups/Sequences
			for (let i=0; i<fourBoxBoxWrapper.childElementCount; i++) {
				let box = fourBoxBoxWrapper.children[i];
				box.onmousedown = () => {revealAnswer(i)};
				box.style.opacity = "";
				box.style.backgroundColor = "#C05761";
				if (gameState[section].boxes.length > i) {
					box.style.visibility = "visible";
                    // If "?", then show via text, even if it's a different questionType
					// If answer of sequence music round, then show as text
					switch (gameState[section].boxes[i] == "?" || (section == "sequences" && gameState[section].questionType == "music" && i==fourBoxBoxWrapper.childElementCount-1) || gameState[section].questionType) {
						case "music":
							box.innerHTML = `<img class="pictureBox" src="assets/music_background.png"/>`
							if (gameState[section].boxes.length == i+1) {
								let src = gameState[section].boxes[i];
								if (!audio.src.endsWith(src) && gameState.timer.active) {
									audio.src = src;
                                    audio.play();
								}
							}
							break;
						case "picture":
							box.innerHTML = `<img class="pictureBox" src="${gameState[section].boxes[i]}"/>`
							break;
						case "text":
                        default:
							box.innerHTML = gameState[section].boxes[i];
							break;
					}
				}
				else {
					box.style.visibility = "hidden";
				}
				
				let timerBox = fourBoxTimerWrapper.children[i];
				let match = gameState[section].fixedScore == null ? gameState[section].boxes.length-1 : gameState[section].fixedScore;
				if (i == match) {
					timerBox.style.visibility = "";
					let percent = 100 * (1 - gameState.timer.time / gameState[section].maxTime);
					timerBox.style.background = `linear-gradient(90deg, ${TIMER_DONE_COLOUR} ${percent}%, ${TIMER_UNDONE_COLOUR} ${percent}%)`;
				}
				else {
					timerBox.style.visibility = "hidden";
				}
				if (gameState.timer.active) {
					timerBox.style.opacity = "";
				}
				else {
					timerBox.style.opacity = "50%";
				}
			}
		}
	}
	else {
		fourBoxWrapper.style.display = "none";
	}
	
	// Update sixBoxWrapper - for choosing the group/sequence questions
	if ((section == "groups" || section == "sequences") && !gameState[section].questionType) {
		sixBoxWrapper.style.display = "";
		titleString += " - Choose a question!";
		// Set all given boxes
		for (let i=0; i<sixBoxes.length; i++) {
			let box = sixBoxes[i];
			if (gameState[section].questionsDone.includes(i)) {
				box.style.visibility = "hidden";
				
			}
			else {
				box.style.visibility = "visible";
			}
		}
	}
	else {
		sixBoxWrapper.style.display = "none";
	}
	
	// Update connectionWrapper
	if (section == "connections") {
		connectionWrapper.style.display = "";
		let highlightedColour = "#FAE588";
		let completedColours = ["#92bf6e", "#7fa65f", "#6b8c50", "#587342"];
		for (let i=0; i<connectionBoxes.length; i++) {
			let box = connectionBoxes[i];
			let completedSets = gameState[section].boxes.completed.length / 4;
			// Completed
			if (i < completedSets * 4) {
				box.innerHTML = gameState[section].boxes.completed[i];
				box.style.backgroundColor = completedColours[Math.floor(i / 4)];
			}
			// Floating
			else if (i - completedSets * 4 < gameState[section].boxes.floating.length) {
				box.innerHTML = gameState[section].boxes.floating[i - completedSets * 4];
				// Check if highlighted
				if (gameState[section].boxes.highlighted.includes(box.innerHTML)) {
					box.style.backgroundColor = highlightedColour;
				} else {
					box.style.backgroundColor = "#F4A261";
				}
			}
			// Erroneous
			else {
				box.innerHTML = "";
				box.style.backgroundColor = "";
			}
		}
		bigTimer.style.display = "";
		if (gameState.timer.active) {
			bigTimer.style.visibility = "";
			let percent = 100 * (1 - gameState.timer.time / gameState[section].maxTime);
			bigTimer.style.background = `linear-gradient(90deg, ${TIMER_DONE_COLOUR} ${percent}%, ${TIMER_UNDONE_COLOUR} ${percent}%)`;
		}
		else {
			bigTimer.style.visibility = "hidden";
		}
		connectionLives.style.display = "";
		if (gameState.timer.active && gameState[section].boxes.completed.length >= 8 && gameState[section].lives) {
			connectionLives.style.visibility = "";
			connectionLives.innerHTML = "";
			for (let i=0; i<gameState[section].lives; i++) {
				connectionLives.innerHTML += " X ";
			}
		}
		else {
			connectionLives.style.visibility = "hidden";
		}
	}
	else {
		connectionWrapper.style.display = "none";
		bigTimer.style.display = "none";
		connectionLives.style.display = "none";
	}
	
	// Update vowelBox
	if (section == "vowels") {
		titleString += " - " + gameState[section].categoryName;
		vowelBox.style.display = "";
		vowelBox.innerHTML = gameState[section].question;
	}
	else {
		vowelBox.style.display = "none";
	}
	
	// Update the answerBox
	if (section && (gameState[section].answer || gameState.buzzer)) {
		let answerBoxColours = ["#485e36", "#992638"];
		if (gameState[section].answer) {
			answerBox.innerHTML = gameState[section].answer;
			answerBox.style.backgroundColor = answerBoxColours[0];
		}
		else {
			answerBox.innerHTML = gameState.buzzer;
			answerBox.style.backgroundColor = answerBoxColours[1];
		}
		answerBox.style.visibility = "visible";
	}
	else {
		answerBox.style.visibility = "hidden";
	}
	
	// Finalize titleBox
	titleBox.innerHTML = titleString;
	
	// Reveal bodyWrapper
	bodyWrapper.style.visibility = "visible";
}

var timerTimeout = null;
var gameState = {
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
		"maxTime": 1,
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

const scoreBoxes = document.getElementsByClassName("score");
const sixBoxes = document.getElementsByClassName("threeBox");
const connectionBoxes = [];
for (let c of connectionWrapper.children) {
	for (let cc of c.children) {
		connectionBoxes.push(cc);
	}
}
var audio = new Audio();
audio.loop = true;
const buzzerAudio = new Audio();
buzzerAudio.src = "assets/buzzer.wav";
var delta = 1;
var socket = null;
const local = false;
if (local) {
	updateGame()
}
else {
	socket = io({autoConnect: false})
	socket.on("connect", () => {
		socket.emit("init", "only_connect");
	})
	socket.on("gameState", (newGameState) => {
		if (newGameState.buzzer && !gameState.buzzer && newGameState.buzzer != "HOST") {
			buzzerAudio.play();
		}
		gameState = newGameState;
		if (gameState.timer.active && !timerTimeout) {
			startTimer();
		}
		updateGame();
	})
}

function main() {
	socket.connect();
}

var currentWidth = 0;
var currentHeight = 0;

function setSize() {
	bodyWrapper.style.width = window.innerWidth + 'px';
	bodyWrapper.style.height = window.innerHeight + 'px';
}

function saveSize() {
	currentWidth = window.innerWidth;
	currentHeight = window.innerHeight;
}

// Set the global orientation variable as soon as the page loads
addEventListener("load", () => {
	setSize();
	saveSize();
})

// Adjust viewport values only if width/height change
window.addEventListener("resize", () => {
	if (window.innerWidth != currentWidth || window.innerHeight != currentHeight) {
		setSize();
		saveSize();
	}
});

var gameQuestions = {
	"groups": [
		{
			"boxes": ["1", "2", "3", "4"],
			"answer": "Group 1",
			"type": "text"
		},
		{
			"boxes": ["5", "6", "7", "8"],
			"answer": "Group 2",
			"type": "text"
		},
		{
			"boxes": ["9", "10", "11", "12"],
			"answer": "Group 3",
			"type": "text"
		},
		{
			"boxes": ["13", "14", "15", "16"],
			"answer": "Group 4",
			"type": "text"
		},
		{
			"boxes": ["assets/sea_shanty_2.mp3", "assets/scape_main.mp3", "assets/arabian_2.mp3", "assets/newbie_melody.mp3"],
			"answer": "OSRS Songs",
			"type": "music"
		},
		{
			"boxes": ["assets/scoop.png", "assets/muck.png", "assets/lofty.png", "assets/roley.png"],
			"answer": "Bob the Builder Machines",
			"type": "picture"
		}
	],
	"sequences": [
		{
			"boxes": ["1", "2", "3", "4"],
			"answer": "Sequence 1",
			"type": "text"
		},
		{
			"boxes": ["5", "6", "7", "8"],
			"answer": "Sequence 2",
			"type": "text"
		},
		{
			"boxes": ["9", "10", "11", "12"],
			"answer": "Sequence 3",
			"type": "text"
		},
		{
			"boxes": ["13", "14", "15", "16"],
			"answer": "Sequence 4",
			"type": "text"
		},
		{
			"boxes": ["assets/sea_shanty_2.mp3", "assets/scape_main.mp3", "assets/arabian_2.mp3", "Newbie Melody"],
			"answer": "OSRS Songs",
			"type": "music"
		},
		{
			"boxes": ["assets/scoop.png", "assets/muck.png", "assets/lofty.png", "assets/roley.png"],
			"answer": "Bob the Builder Machines",
			"type": "picture"
		}
	],
	"connections": [
		[
			{
				"boxes": ["a", "b", "c", "d"],
				"answer": "Connection a"
			},
			{
				"boxes": ["e", "f", "g", "h"],
				"answer": "Connection b"
			},
			{
				"boxes": ["i", "j", "k", "l"],
				"answer": "Connection c"
			},
			{
				"boxes": ["m", "n", "o", "p"],
				"answer": "Connection d"
			}
		],
		[
			{
				"boxes": ["1", "2", "3", "4"],
				"answer": "Connection 1"
			},
			{
				"boxes": ["5", "6", "7", "8"],
				"answer": "Connection 2"
			},
			{
				"boxes": ["9", "10", "11", "12"],
				"answer": "Connection 3"
			},
			{
				"boxes": ["13", "14", "15", "16"],
				"answer": "Connection 4"
			}
		],
	],
	"vowels": [
		{
			"categoryName": "Champion Titles",
			"questions": [
				{
					"question": "drkn bld",
					"answer": "darkin blade"
				},
				{
					"question": "nntld fx",
					"answer": "nine-tailed fox"
				},
			]
		},
		{
			"categoryName": "Items",
			"questions": [
				{
					"question": "kndlgm",
					"answer": "kindlegem"
				},
				{
					"question": "bts",
					"answer": "boots"
				},
			]
		}
	],
}

