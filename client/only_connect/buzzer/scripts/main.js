var socket = null;
const local = false;
if (local) {
}
else {
	socket = io({autoConnect: false})
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

