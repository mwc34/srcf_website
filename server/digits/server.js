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

function send_file(socket, file_name) {
	// Read JSON
	starting_values = JSON.parse(fs.readFileSync(file_name, 'utf8'));
	socket.emit("starting values", starting_values);
}

function init(i) {
    io = i
}

function connection(socket) {
    socket.on('starting values', (datestring) => {
        // See if file exists
		file_name = "./digits/starting_values/" + datestring + ".json";
		if (!file_exists(file_name)) {
			const python = spawn('python3', ['./digits/generate.py', datestring]);
			python.on('close', (c) => {send_file(socket, file_name)});
		}
		else {
			send_file(socket, file_name);
		}
		
		
    })
}

module.exports = {
    init,
    connection,
}