const fs = require("fs")
const path = require("path")
var io = null

function getPlayerBySocketID(room_id, id) {
    if (!rooms[room_id]) return null
    for (let p of rooms[room_id]) {
        if (p.socket_id == id) {
            return p
        }
    }
    return null
}

const base_player_state = {
    'socket_id' : null,
    'curr_piece' : null,
    'board_state' : null,
    'lines' : 0,
    'ready': false,
}

const rooms = {}

function init(i) {
    io = i
	io.on('connection', connection)
}

function connection(socket) {
    socket.on('new player', (room_id) => {
        if (room_id in rooms && (rooms[room_id].length >= 2 || (rooms[room_id].length && rooms[room_id][0].ready))) {
            return
        }
        
        
        if (!(room_id in rooms)) {
            rooms[room_id] = [];
        }
        
        
        let p = JSON.parse(JSON.stringify(base_player_state));
        
        p.socket_id = socket.id;
        
        let room = rooms[room_id];
        
        room.push(p);
        
        for (let p of rooms[room_id]) {
            io.to(p.socket_id).emit('new player', room_id, room);
        }
    })
    
    socket.on('start game', (room_id) => {
        let p = getPlayerBySocketID(room_id, socket.id);

        if (!p) return
        
        if (p.ready) return
        
        p.ready = true;
        
        for (let p of rooms[room_id]) {
            if (!p.ready) return
        }
        
        rooms[room_id].shapes = [];

        for (let p of rooms[room_id]) {
            io.to(p.socket_id).emit('start game')
        }
    })
    
    socket.on('get shape idx', (room_id, idx) => {
        let p = getPlayerBySocketID(room_id, socket.id);
        if (!p) return
        if (!p.ready) return
        
        let shapes = rooms[room_id].shapes;
        
        while (shapes.length <= idx+1) {
            shapes.push(...[...Array(8).keys()].sort(() => Math.random() - 0.5));
        }

        socket.emit('get shape idx', ...rooms[room_id].shapes.slice(idx, idx+2));
    })
    
    socket.on('update', (room_id, board, curr_piece, lines) => {
        let p = getPlayerBySocketID(room_id, socket.id);
        if (!p) return
        
        p.board_state = board;
        p.curr_piece = curr_piece;
        p.lines = lines;
        
        for (let player of rooms[room_id]) {
            if (player.socket_id != p.socket_id) {
                io.to(player.socket_id).emit('update', p);
            }
        }
    })
    
    socket.on('penalty', (room_id, count) => {
        let p = getPlayerBySocketID(room_id, socket.id);
        if (!p) return
        
        for (let player of rooms[room_id]) {
            if (player.socket_id != p.socket_id) {
                io.to(player.socket_id).emit('penalty', count);
            }
        }
    })
    
    socket.on('dead', (room_id) => {
        let p = getPlayerBySocketID(room_id, socket.id);
        if (!p) return
        
        for (let player of rooms[room_id]) {
            player.ready = false;
            io.to(player.socket_id).emit('game over');
        }
    })
    
    socket.on('disconnect', () => {
        for (let room_id in rooms) {
            let found = false;
            for (let i=0; i<rooms[room_id].length; i++) {
                if (rooms[room_id][i].socket_id == socket.id) {
                    rooms[room_id].splice(i, 1);
                    found = true;
                }
            }
            if (found) {
                for (let i=0; i<rooms[room_id].length; i++) {
                    io.to(rooms[room_id][i].socket_id).emit('left');
                }
                return
            }
        }
    })
}

module.exports = {
    init,
}