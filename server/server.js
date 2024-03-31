// External Modules
const express = require('express')
const app = express()
const fs = require("fs")
const path = require("path")
const server = require('http').createServer(app)
const io = require('socket.io')(server, {
    pingInterval: 20000,
    pingTimeout: 10000,
    maxHttpBufferSize: 50000,
})

// Internal Modules
const modules = {}

let folders = fs.readdirSync('.').filter(function (file) {
    return fs.statSync('./'+file).isDirectory();
})

for (let f of folders) {
    modules[f] = require('./' + f + '/server.js')
    modules[f].init(io.of('/' + f))
}

app.use(function(req, res, next) {
  res.setHeader('x-debug', 'hit')
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  res.setHeader('Expires', '-1')
  res.setHeader('Pragma', 'no-cache')
  next();
});

// io.on('connection', (socket) => {
    // socket.on('init', (m) => {
        // socket.join(m)
        // modules[m].connection(socket)
    // })
// })

// Listen
console.log('Server Loaded')
// server.listen('~/myapp/web.sock')
server.listen('40458')