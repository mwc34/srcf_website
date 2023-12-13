const fs = require("fs");
const path = require("path");
var io = null;

function init(i) {
    io = i
}

function connection(socket) {
    
}

module.exports = {
    init,
    connection,
}