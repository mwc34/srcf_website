var socket = null;
const local = false;
if (local) {
}
else {
	socket = io("/only_connect", {autoConnect: false})
	socket.on("connect", () => {
		socket.emit("init", "only_connect");
	})
    socket.on("gameState", (newGameState) => {
		buzzerBox.innerHTML = newGameState.buzzer;
	})
}

function capitalize(s) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function buzz() {
	socket.emit("buzz", nameBox.innerHTML);
}

function main() {
	while (!nameBox.innerHTML) {
        nameBox.innerHTML = window.prompt("Enter Your Name");
    }
    nameBox.innerHTML = capitalize(nameBox.innerHTML.toLowerCase());
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
