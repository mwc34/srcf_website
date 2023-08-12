const fs = require("fs")
const path = require("path")
const {spawn} = require('child_process');
var io = null


function file_exists(file_name) {
	try {
		if (fs.existsSync(file_name)) {
			return true;
		}
	} catch(err) {}
	return false;
}

function send_file(socket, file_name, emit_name) {
	// Read JSON
	if (file_exists(file_name)) {
		starting_values = JSON.parse(fs.readFileSync(file_name, 'utf8'));
		socket.emit(emit_name, starting_values);
	}
}

function init(i) {
    io = i
}

function connection(socket) {
    socket.on('starting values', (dateString, tomorrowDateString) => {
        // See if file exists
		file_name = "./digits/starting_values/" + dateString + ".json";
		if (!file_exists(file_name)) {
			// Generate today's quickly without optimal counts
			const python = spawn('python3', ['./digits/generate.py', dateString, "0"]);
			python.on('close', (c) => {
				send_file(socket, file_name, 'starting values');
				// Generate today's with optimal counts
				spawn('python3', ['./digits/generate.py', dateString, "1"]);
			});
		}
		else {
			send_file(socket, file_name, 'starting values');
		}
		// Generate tomorrow's with optimal counts
		spawn('python3', ['./digits/generate.py', tomorrowDateString, "1"]);
    })
	
	socket.on('reload starting values', (dateString) => {
		file_name = "./digits/starting_values/" + dateString + ".json";
		send_file(socket, file_name, 'reload starting values');
	})
}

module.exports = {
    init,
    connection,
}