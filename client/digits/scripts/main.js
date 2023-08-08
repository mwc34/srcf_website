function clickSection(idx) {
	let activeSection = getActiveSection();
	
	if (idx != activeSection) {
		setSection(activeSection, 0);
		setSection(idx, 1);
		target.innerHTML = sectionWrapper.children[idx].innerHTML;
		resetNumbers(startingValues[idx]);
		hideSectionSolved(false);

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

function checkWin() {
	for (let i=0; i<numberCircles.length; i++) {
		if (numberCircles[i].innerHTML == target.innerHTML && numberCircles[i].style.visibility == "") {
			sectionSolved.style.visibility = "";
			sectionWrapper.children[getActiveSection()].classList.add("solvedSection");
			break;
		}
	}
}

function resetNumbers(values) {
	for (let i=0; i<values.length; i++) {
		numberCircles[i].style.visibility = "";
		numberCircles[i].innerHTML = values[i];
	}
}

function hideSectionSolved(next_puzzle) {
	sectionSolved.style.visibility = "hidden";
	if (next_puzzle) {
		let activeSection = getActiveSection();
		if (activeSection < 4) {
			clickSection(activeSection+1);
		}
	}
}

function getDateString() {
	let d = new Date();
	return `${d.getUTCDate()}-${d.getUTCMonth()+1}-${d.getUTCFullYear()}`;
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
const operationHistory = [[], [], [], [], []];
const dateString = getDateString();
var startingValues = [[], [], [], [], []];
for (let i=0; i<5; i++) {
	for (let j=0; j<6; j++) {
		startingValues[i].push(i*6 + j + 1);
	}
}
var socket = null;
const local = false;

if (local) {
	resetNumbers(startingValues[0]);
	target.innerHTML = sectionWrapper.children[0].innerHTML;
}
else {
	socket = io({autoConnect: false})
	socket.on('connect', () => {
		socket.emit('init', 'digits');
		socket.emit('starting values', dateString);
	})

	socket.on('starting values', (values) => {
		let numbers = [];
		for (let i=0; i<values.length; i++) {
			sectionWrapper.children[i].innerHTML = values[i]["target"];
			numbers.push(values[i]["numbers"]);
		}
		startingValues = numbers;
		resetNumbers(startingValues[0]);
		target.innerHTML = sectionWrapper.children[0].innerHTML;
	})
}

function main() {
	socket.connect();
}

