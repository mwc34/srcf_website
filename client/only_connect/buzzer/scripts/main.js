var socket = null;
const local = true;
if (local) {
}
else {
	socket = io({autoConnect: false})
	socket.on('connect', () => {
		socket.emit('init', 'only_connect');
	})
}

function buzz() {
	console.log("buzz");
}

function main() {
	while (!nameBox.innerHTML) {
        nameBox.innerHTML = window.prompt('Enter Your Name');
    }
	socket.connect();
}

