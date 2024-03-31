const fs = require("fs")
const path = require("path")
var io = null

function getPlayerBySocketID(id) {
    for (let p of game_state) {
        if (p.socket_id == id) {
            return p
        }
    }
    return null
}

const base_board_state = []
for (let i=0; i<19; i++) {
    base_board_state.push(null)
}
const base_player_state = {
    'name' : null,
    'player_id' : null,
    'socket_id' : null,
    'curr_tile_idx' : null,
    'board_state' : null,
}

var next_player_id = 0

const game_state = []
var curr_tile = null
const total_tiles = [
    [3, 2, 1],
    [3, 6, 1],
    [3, 7, 1],
    [4, 2, 1],
    [4, 6, 1],
    [4, 7, 1],
    [8, 2, 1],
    [8, 6, 1],
    [8, 7, 1],
    [3, 2, 5],
    [3, 6, 5],
    [3, 7, 5],
    [4, 2, 5],
    [4, 6, 5],
    [4, 7, 5],
    [8, 2, 5],
    [8, 6, 5],
    [8, 7, 5],
    [3, 2, 9],
    [3, 6, 9],
    [3, 7, 9],
    [4, 2, 9],
    [4, 6, 9],
    [4, 7, 9],
    [8, 2, 9],
    [8, 6, 9],
    [8, 7, 9],
]
var remaining_tiles = [].concat(total_tiles)

const scoring_lines = [
    [[2,6,11],[1,5,10,15],[0,4,9,14,18],[3,8,13,17],[7,12,16]],
    [[0,3,7],[1,4,8,12],[2,5,9,13,16],[6,10,14,17],[11,15,18]],
    [[0,1,2],[3,4,5,6],[7,8,9,10,11],[12,13,14,15],[16,17,18]],
]

const next_to = [
    [3,4,1],
    [0,4,5,2],
    [1,5,6],
    [0,4,8,7],
    [0,1,5,9,8,3],
    [1,2,6,10,9,4],
    [11,10,5,2],
    [3,8,12],
    [3,4,9,13,12,7],
    [4,5,10,14,13,8],
    [5,6,11,15,14,9],
    [15,10,6],
    [7,8,13,16],
    [8,9,14,17,16,12],
    [9,10,15,18,17,13],
    [18,14,10,11],
    [12,13,17],
    [16,13,14,18],
    [17,14,15]
]

function resetGame() {
    curr_tile = null
    remaining_tiles = JSON.parse(JSON.stringify(total_tiles))
    
    for (let p of game_state) {
        p.board_state = JSON.parse(JSON.stringify(base_board_state))
        p.curr_tile_idx = null
        p.next_game_ready = false
    }
    
    let to_emit = []
    for (let p of game_state) {
        to_emit.push({'name' : p.name, 'player_id' : p.player_id, 'board_state' : p.board_state, 'curr_tile_idx' : p.curr_tile_idx})
    }
    for (let p of game_state) {
        io.to(p.socket_id).emit('current state', p.player_id, to_emit, remaining_tiles, curr_tile)
    }
    
    
    getNextTile()
}

function getNextTile() {
    if (remaining_tiles.length > 8) {
        let idx = Math.floor(Math.random() * remaining_tiles.length)
        curr_tile = remaining_tiles[idx]
        remaining_tiles.splice(idx, 1)
        for (let p of game_state) {
            p.curr_tile_idx = null
        }
        io.emit('next tile', curr_tile)
    }
    else {
        curr_tile = null
        io.emit('game finished')
    }
}

function init(i) {
    io = i
	io.on('connection', connection)
    resetGame()
}

function connection(socket) {

    socket.on('new player', (name) => {
        console.log("new player: " + name)
        let p = JSON.parse(JSON.stringify(base_player_state))
        p.player_id = next_player_id
        p.socket_id = socket.id
        next_player_id++
        p.name = name
        
        if (remaining_tiles.length == 26) {
            p.board_state = JSON.parse(JSON.stringify(base_board_state))
        }
        
        game_state.push(p)
        
        let to_emit = []
        for (let p of game_state) {
            to_emit.push({'name' : p.name, 'player_id' : p.player_id, 'board_state' : p.board_state, 'curr_tile_idx' : p.curr_tile_idx})
        }
        socket.emit('current state', p.player_id, to_emit, remaining_tiles, curr_tile)
        socket.to('hextension').emit('new player', {'player_id' : p.player_id, 'name' : name, 'board_state' : p.board_state, 'curr_tile_idx' : null})
    })
    
    socket.on('place tile', (idx) => {
        let p = getPlayerBySocketID(socket.id)
        if (p && p.board_state) {
            if (!p.board_state[idx] && curr_tile) {
                let neighbour = false
                    for (let n of next_to[idx]) {
                        if (p.board_state[n] && n != p.curr_tile_idx) {
                            neighbour = true
                        }
                    }
                if (neighbour || remaining_tiles.length == 26) {
                    p.board_state[idx] = curr_tile
                    if (p.curr_tile_idx != null) {
                        p.board_state[p.curr_tile_idx] = null
                    }
                    p.curr_tile_idx = idx

                    io.emit('place tile', p.player_id, idx)
                    
                    let all_finished = true
                    
                    for (let p of game_state) {
                        if (p.board_state && p.curr_tile_idx == null) {
                            all_finished = false
                            break
                        }
                    }
                    
                    if (all_finished) {
                        
                        getNextTile()
                    }
                }
            }
        }
    })
    
    socket.on('next game ready', () => {
        let p = getPlayerBySocketID(socket.id)
        if (p) {
            p.next_game_ready = true
            
            io.emit('next game ready', p.player_id)
            
            let next_game = true
            for (let p of game_state) {
                if (p.board_state && !p.next_game_ready) {
                    next_game = false
                }
            }
            
            if (next_game) {
                resetGame()
            }
        }
    })
    
    
    
    
    socket.on('disconnect', () => {
        let p = getPlayerBySocketID(socket.id)
        if (p) {
            console.log(p.name + " kicked")
            game_state.splice(game_state.indexOf(p), 1)
            io.emit('kick player', p.player_id)
            
            let reset_game = true
            let finish_game = remaining_tiles.length == 8 && curr_tile == null
            for (let p of game_state) {
                if (p.board_state) {
                    reset_game = false
                    if (!p.next_game_ready) {
                        finish_game = false
                    }
                }
                
            }
            
            if (reset_game || finish_game) {
                resetGame()
            }
            else {
                let all_finished = true
                    
                for (let p of game_state) {
                    if (p.board_state && p.curr_tile_idx == null) {
                        all_finished = false
                        break
                    }
                }
                
                if (all_finished) {
                    
                    getNextTile()
                }
            }
        }
    })
    
}

module.exports = {
    init,
}