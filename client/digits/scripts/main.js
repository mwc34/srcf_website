function clickSection(idx) {
	let activeSection = getActiveSection();
	
	if (idx != activeSection) {
		setSection(activeSection, 0);
		setSection(idx, 1);
		target.innerHTML = sectionWrapper.children[idx].innerHTML;
		resetNumbers(startingValues[idx]);
		hideSectionSolved();

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
				sectionWrapper.children[activeSection].classList.remove("solvedSection");
				setNumber(idx, 0);
				setOperation(activeOp, 0);
				operationHistory[activeSection].push([
					[numberCircles[activeNumber].innerHTML, activeNumber], 
					[numberCircles[idx].innerHTML, idx], 
					activeOp
				]);
				performOperation(activeNumber, idx, activeOp);
				checkWin();
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
		if (sectionWrapper.children[i].classList.contains("activeOption")) {
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
		sectionWrapper.children[idx].classList.add("activeOption");
	}
	else {
		sectionWrapper.children[idx].classList.remove("activeOption");
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
	numberCircles[a_idx].style.visibility = "hidden";
	let a = parseInt(numberCircles[a_idx].innerHTML);
	let b = parseInt(numberCircles[b_idx].innerHTML);
	numberCircles[b_idx].innerHTML = calculateOperation(a, b, op_idx);
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

function hideSectionSolved() {
	sectionSolved.style.visibility = "hidden";
}

const bodyWrapper = document.getElementById("bodyWrapper");
const sectionWrapper = document.getElementById("sectionWrapper");
const target = document.getElementById("target");
const numberCircles = document.getElementsByClassName("number");
const operationCircles = document.getElementsByClassName("operation");
const sectionSolved = document.getElementById("sectionSolved");
const operationHistory = [[], [], [], [], []];
const socket = io({autoConnect: false})


var startingValues = [[], [], [], [], []];
for (let i=0; i<5; i++) {
	for (let j=0; j<6; j++) {
		startingValues[i].push(i*6 + j + 1);
	}
}


socket.on('connect', () => {
    socket.emit('init', 'digits')
    socket.emit('starting values', "1234")
})

socket.on('starting values', (values) => {
	let numbers = [];
	for (let i=0; i<values.length; i++) {
		sectionWrapper.children[i].innerHTML = values[i]["target"];
		numbers.push(values[i]["numbers"]);
	}
	startingValues = numbers;
	resetNumbers(startingValues[0]);
})

function main() {
	socket.connect();
}

