function clickSection(idx) {
	let activeSection = getActiveSection();
	
	if (idx != activeSection) {
		if (activeSection != -1) {
			setSection(activeSection, 0);
		}
		setSection(idx, 1);
		target.innerHTML = sectionWrapper.children[idx].innerHTML;
		resetNumbers(startingValues[idx]);

		for (let h of operationHistory[idx]) {
			performOperation(h[0][1], h[1][1], h[2]);
		}
		
		if (getActiveNumber() != -1) {
			setNumber(getActiveNumber(), 0);
		}
		if (getActiveOperation() != -1) {
			setOperation(getActiveOperation(), 0);
		}
	}
}

function clickNumber(idx) {
	let activeNumber = getActiveNumber();
	let activeOp = getActiveOperation();
	let activeSection = getActiveSection();
	
	setNumber(idx, 1);
	if (activeNumber != -1) {
		setNumber(activeNumber, 0);
		if (activeOp != -1) {
			if (activeNumber == idx) {
				setOperation(activeOp, 0);
			}
			else {
				let move = [
					[numberCircles[activeNumber].innerHTML, activeNumber], 
					[numberCircles[idx].innerHTML, idx], 
					activeOp
				];
				
				let valid = performOperation(activeNumber, idx, activeOp);
				if (valid) {
					sectionWrapper.children[activeSection].classList.remove("solvedSection");
					setOperation(activeOp, 0);
					operationHistory[activeSection].push(move);
					saveHistory();
					checkWin();
				}
				else {
					setNumber(activeNumber, 1);
				}
				setNumber(idx, 0);
			}
		}
	}
}

function clickOperation(idx) {
	let activeNumber = getActiveNumber();
	let activeOp = getActiveOperation();
	let activeSection = getActiveSection();
	
	// UNDO
	if (idx == 0) {
		let opHistory = operationHistory[activeSection];
		if (opHistory.length) {
			let last_op = opHistory.pop();
			if (activeOp != -1) {
				setOperation(activeOp, 0);
			}
			if (activeNumber != -1) {
				setNumber(activeNumber, 0);
			}
			sectionWrapper.children[activeSection].classList.remove("solvedSection");
			
			numberCircles[last_op[0][1]].style.visibility = "";
			numberCircles[last_op[0][1]].innerHTML = last_op[0][0];
			setNumber(last_op[0][1], 1);
			
			numberCircles[last_op[1][1]].innerHTML = last_op[1][0];
			saveHistory();
			checkWin();
		}
	}
	// OTHER
	else {
		if (activeNumber != -1) {
			setOperation(idx, 1);
		}
		if (activeOp != -1) {
			setOperation(activeOp, 0);
		}
	}
}

function getActiveSection() {
	for (let i=0; i<sectionWrapper.childElementCount; i++) {
		if (sectionWrapper.children[i].classList.contains("activeSection")) {
			return i;
		}
	}
	return -1;
}

function getActiveNumber() {
	for (let i=0; i<numberCircles.length; i++) {
		if (numberCircles[i].classList.contains("activeOption")) {
			return i;
		}
	}
	return -1;
}

function getActiveOperation() {
	// From 1 to dodge UNDO
	for (let i=1; i<operationCircles.length; i++) {
		if (operationCircles[i].classList.contains("activeOption")) {
			return i;
		}
	}
	return -1;
}

function setSection(idx, val) {
	if (val) {
		sectionWrapper.children[idx].classList.add("activeSection");
	}
	else {
		sectionWrapper.children[idx].classList.remove("activeSection");
	}
}

function setNumber(idx, val) {
	if (val) {
		numberCircles[idx].classList.add("activeOption");
	}
	else {
		numberCircles[idx].classList.remove("activeOption");
	}
}

function setOperation(idx, val) {
	if (val) {
		operationCircles[idx].classList.add("activeOption");
	}
	else {
		operationCircles[idx].classList.remove("activeOption");
	}
}

function performOperation(a_idx, b_idx, op_idx) {
	
	let a = parseInt(numberCircles[a_idx].innerHTML);
	let b = parseInt(numberCircles[b_idx].innerHTML);
	let answer = calculateOperation(a, b, op_idx);
	if (answer == parseInt(answer)) {
		numberCircles[b_idx].innerHTML = answer;
		numberCircles[a_idx].style.visibility = "hidden";
		return true
	}
	return false
	
}

function calculateOperation(a, b, opNum) {
	switch (opNum) {
		case 1:
			return a + b;
		case 2:
			return a - b;
		case 3:
			return a * b;
		case 4:
			return a / b;
	}
}

function checkWin(only_bool=false) {
	for (let i=0; i<numberCircles.length; i++) {
		if (numberCircles[i].innerHTML == target.innerHTML && numberCircles[i].style.visibility == "") {
			if (!only_bool) {
				sectionSolved.style.visibility = "";
				sectionWrapper.children[getActiveSection()].classList.add("solvedSection");
				if (getNextIncompletePuzzle() == -1) {
					socket.emit('reload starting values');
				}
			}
			return true;
		}
	}
	return false;
}

function resetNumbers(values) {
	for (let i=0; i<values.length; i++) {
		numberCircles[i].style.visibility = "";
		numberCircles[i].innerHTML = values[i];
	}
}

function getNextIncompletePuzzle(startIdx) {
	for (let i=0; i<sectionWrapper.childElementCount; i++) {
		let idx = (startIdx + i) % sectionWrapper.childElementCount;
		let c = sectionWrapper.children[idx];
		if (!c.classList.contains("solvedSection")) {
			return idx;
		}
	}
	return -1;
}

function hideSectionSolved() {
	sectionSolved.style.visibility = "hidden";
	
	let activeSection = getActiveSection();
	let nextPuzzle = getNextIncompletePuzzle(activeSection);
	if (nextPuzzle != -1) {
		clickSection(nextPuzzle);
	}
	else {
		shareWrapper.style.visibility = "";
		setShowText();
	}
}

function setShowText() {
	let operationSymbols = [];
	for (let i=1; i<5; i++) {
		operationSymbols.push(operationCircles[i].innerHTML);
	}
	let totalOperations = 0;
	let operationList = "";
	for (let i=0; i<operationHistory.length; i++) {
		let h = operationHistory[i];
		totalOperations += h.length;
		for (let op of h) {
			operationList += operationSymbols[op[2]-1];
		}
		if (i < operationHistory.length-1) {
			operationList += "<br>";
		}
	}
	let showText = `Congratulations, you've finished today's digits!<br>You took ${totalOperations} operations.<br>${operationList}`;
	if (optimalOperationCount[0] > 0) {
		let optimalOperationString = "";
		let optimalOperationSum = 0;
		for (let i=0; i<optimalOperationCount.length; i++) {
			optimalOperationString += optimalOperationCount[i].toString();
			optimalOperationSum += optimalOperationCount[i];
			if (i < optimalOperationCount.length-1) {
				optimalOperationString += ",";
			}
		}
		showText += `<br>The optimal operations were ${optimalOperationSum}:<br>${optimalOperationString}`;
	}
	shareWrapper.children[0].innerHTML = showText;
}

function shareToClipboard() {
	let operationSymbols = [];
	for (let i=1; i<5; i++) {
		operationSymbols.push(operationCircles[i].innerHTML);
	}
	let totalOperations = 0;
	let operationList = "";
	for (let i=0; i<operationHistory.length; i++) {
		let h = operationHistory[i];
		totalOperations += h.length;
		for (let op of h) {
			operationList += operationSymbols[op[2]-1];
		}
		if (i < operationHistory.length-1) {
			operationList += "\n";
		}
	}
	let copyText = `#Digits ${dateString}\n${totalOperations} operations\n${operationList}`;
	copyText += "\nhttps://mwc34.user.srcf.net/digits";
	
	navigator.clipboard.writeText(copyText);
	hideShareWrapper();
}

function hideShareWrapper() {
	shareWrapper.style.visibility = "hidden";
}

function getDateString(tomorrow=false) {
	let d = new Date();
	if (tomorrow) {
		d.setDate(d.getDate() + 1);
	}
	return `${d.getUTCDate()}-${d.getUTCMonth()+1}-${d.getUTCFullYear()}`;
}

function saveHistory() {
	let activeSection = getActiveSection();
	storedHistory = loadHistory();
	if (checkWin(true)) {
		storedHistory[activeSection] = operationHistory[activeSection];
	}
	else {
		storedHistory[activeSection] = [];
	}
	localStorage.operationHistory = JSON.stringify(storedHistory);
}

function loadHistory() {
	if (!(localStorage.historyDate && localStorage.historyDate == dateString && localStorage.operationHistory)) {
		localStorage.historyDate = dateString;
		localStorage.operationHistory = JSON.stringify([[], [], [], [], []]);
	}
	return JSON.parse(localStorage.operationHistory);
}

function savePuzzleData(values) {
	let numbers = [];
	for (let i=0; i<values.length; i++) {
		// Save section targets
		sectionWrapper.children[i].innerHTML = values[i]["target"];
		numbers.push(values[i]["numbers"]);
		// Save optimalOperationCount
		if ("optimalOperationCount" in values[i]) {
			optimalOperationCount[i] = values[i]["optimalOperationCount"];
		}
	}
	// Save startingValues
	startingValues = numbers;
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

const bodyWrapper = document.getElementById("bodyWrapper");
const sectionWrapper = document.getElementById("sectionWrapper");
const target = document.getElementById("target");
const numberCircles = document.getElementsByClassName("number");
const operationCircles = document.getElementsByClassName("operation");
const sectionSolved = document.getElementById("sectionSolved");
const shareWrapper = document.getElementById("shareWrapper");
var operationHistory = [[], [], [], [], []];
const dateString = getDateString();
const tomorrowDateString = getDateString(true);
var startingValues = [[], [], [], [], []];
const optimalOperationCount = [0, 0, 0, 0, 0];
for (let i=0; i<5; i++) {
	for (let j=0; j<6; j++) {
		startingValues[i].push(i*6 + j + 1);
	}
}
var socket = null;
const local = false;

if (local) {
	resetNumbers(startingValues[0]);
	clickSection(0);
}
else {
	socket = io({autoConnect: false})
	socket.on('connect', () => {
		socket.emit('init', 'digits');
		socket.emit('starting values', dateString, tomorrowDateString);
	})

	socket.on('starting values', (values) => {
		savePuzzleData(values);
		
		resetNumbers(startingValues[0]);
		operationHistory = loadHistory();
		for (let i=0; i<5; i++) {
			clickSection(i);
			if (checkWin(true)) {
				sectionWrapper.children[getActiveSection()].classList.add("solvedSection");
			}
			else {
				break;
			}
		}
	})
	
	socket.on('reload starting values', (values) => {
		savePuzzleData(values);
		setShowText();
	})
}

function main() {
	socket.connect();
}

