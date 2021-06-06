const fs = require("fs")
const path = require("path")
var io = null

function getPlayerBySocketID(id) {
    for (let p of player_info) {
        if (p.socket_id == id) {
            return p
        }
    }
    return null
}

const base_hand = {
    'set_id' : -1,
    'tiles' : [],
    'new_idxs' : [],
    'value_remaining' : 30,
}

const base_player_info = {
    'name' : null,
    'player_id' : null,
    'socket_id' : null,
    'connection_id' : null,
    'ready' : false,
    'hand' : base_hand,
}

const base_board = [
    {
        'set_id' : 0,
        'tiles' : [['', 0]],
    }, 
]

var remaining_tiles = []
const player_info = []
var active_player_id = null
var next_set_id = 1
var next_player_id = 0
var board = JSON.parse(JSON.stringify(base_board))
var placed_tile = false
var valid_board = false
var game_winner = -1
var undo_states = []

function resetGame() {
    // Fill Deck
    remaining_tiles = []
    for (let v=1; v<=13; v++) {
        for (let s=0; s<4; s++) {
            remaining_tiles.push([v, s])
            remaining_tiles.push([v, s])
        }
    }
    // Jokers
    remaining_tiles.push(['JR', -1])
    remaining_tiles.push(['JB', -1])
    
    // Reset and Fill hands
    for (let p of player_info) {
        if (p.ready) {
            p.ready = false
        }
        p.hand = JSON.parse(JSON.stringify(base_hand))
        for (let i=0; i<14; i++) {
            let t = drawTile()
            if (t) {
                p.hand.tiles.push(t)
            }
        }
        sortSet(p.hand)
    }
    
    // Reset board
    board = JSON.parse(JSON.stringify(base_board))
    validateBoard()
    
    // Other
    next_set_id = 1
    game_winner = null
    placed_tile = false
    active_player_id = player_info[0].player_id
    
    for (let p of player_info) {
        io.to(p.socket_id).emit('new game', {
            'active_player' : active_player_id,
            'board' : board,
            'hand' : p.hand,
            'remaining_tiles' : remaining_tiles.length,
        })
    }
    
    undo_states = [
        {
            'hand' : JSON.stringify(player_info[0].hand),
            'board' : JSON.stringify(board),
        }
    ]
 
}

function drawTile() {
    if (remaining_tiles.length) {
        let idx = Math.floor(Math.random() * remaining_tiles.length)
        let t = remaining_tiles.splice(idx, 1)[0]
        remaining_tiles_count = remaining_tiles.length
        return t
    }
    return null
}

function quantifyJoker(s) {
    let to_return = {}
    let joker_red = null
    let joker_black = null
    
    for (t of s.tiles) {
        if (t[0] == 'JR') {
            joker_red = s.tiles.indexOf(t)
            to_return['JR'] = []
        }
        else if (t[0] == 'JB') {
            joker_black = s.tiles.indexOf(t)
            to_return['JB'] = []
        }
    }
    
    let working_tiles = JSON.parse(JSON.stringify(s.tiles))
    
    for (let i=0; i<(1 + (joker_red != null) * 51); i++) {
        
        if (joker_red != null) {
            working_tiles[joker_red][0] = (i % 13) + 1
            working_tiles[joker_red][1] = Math.floor(i/13)
        }
        
        
        for (let j=0; j<(1 + (joker_black != null) * 51); j++) {
            if (joker_black != null) {
                working_tiles[joker_black][0] = (j % 13) + 1
                working_tiles[joker_black][1] = Math.floor(j/13)
            }
            
            let values = []
            let suits = []
            for (let t of working_tiles) {
                values.push(t[0])
                suits.push(t[1])
            }
            if (validateSet(values, suits)) {
                if (joker_red != null) {
                    to_return.JR.push(working_tiles[joker_red].slice())
                }
                if (joker_black != null) {
                    to_return.JB.push(working_tiles[joker_black].slice())
                }
            }
            
        }
    
    }
    
    return to_return
}

function validateSet(values, suits) {
    if (
        (new Set(suits)).size == 2 ||
        ((new Set(suits)).size == 1 && 
            (
                (new Set(values)).size != values.length ||
                Math.max(...values) - Math.min(...values) != values.length-1 ||
                values.length < 3
            )
        ) ||
        ((new Set(suits)).size > 2 &&
            (
                (new Set(suits)).size != suits.length ||
                (new Set(values)).size != 1
            )
        )
    ) {
        return false
    }
    return true
}

function validateBoard() {
    
    for (let s of board) {
        if (s.set_id == 0) {
            break
        }
        let values = []
        let suits = []
        let jokers_present = false
        for (let t of s.tiles) {
            if (t[1] == -1) {
                jokers_present = true
                break
            }
            values.push(t[0])
            suits.push(t[1])
        }
        
        let valid = false
        
        if (jokers_present) {
            let t = quantifyJoker(s)
            valid = Object.keys(t).length && t[Object.keys(t)[0]].length
        }
        else {
            valid = validateSet(values, suits)
        }
        if (!valid) {
            valid_board = false
            return
        }
    }
    
    valid_board = true
}

function sortSet(s) {
    let jokers_present = false
    for (let t of s.tiles) {
        if (t[1] == -1) {
            jokers_present = true
            break
        }
    }
    let valid_jokers = null
    if (jokers_present) {
        valid_jokers = quantifyJoker(s)
    }
    
    s.tiles.sort((a, b) => {
        let a2 = a.slice()
        let b2 = b.slice()
        
        if (jokers_present) {
            if (a[1] == -1) {
                let t = valid_jokers[a[0]]
                if (t.length) {
                    a2 = t[0]
                }
                else {
                    a2 = [0, 0]
                }
            }
            if (b[1] == -1) {
                let t = valid_jokers[b[0]]
                if (t.length) {
                    b2 = t[0]
                }
                else {
                    b2 = [0, 0]
                }
            }
        }
        
        let t = a2[1] - b2[1]
        if (!t) {
            return a2[0] - b2[0]
        }
        return t
    })
}

function nextTurn(id) {
    placed_tile = false
        
    let cycle = []
    for (let p of player_info) {
        if (p.hand.tiles.length) {
            cycle.push(p.player_id)
        }
    }
    
    active_player_id = cycle[(cycle.indexOf(id)+1) % cycle.length]

    io.in('rummikub').emit('new turn', active_player_id)
    
    let player = null
    for (let p of player_info) {
        if (p.player_id == active_player_id) {
            player = p
            break
        }
    }
    
    undo_states = [
        {
            'hand' : JSON.stringify(player.hand),
            'board' : JSON.stringify(board),
        }
    ]
}


function init(i) {
    io = i
}

function connection(socket) {
    
    socket.on('new player', (name, connection_id) => {
        console.log("new player: " + name)
        
        let p = null
        for (let player of player_info) {
            if (player.connection_id == connection_id && player.socket_id == null) {
                p = player
                break
            }
        }
        
        // New Player
        if (p == null) {
            p = JSON.parse(JSON.stringify(base_player_info))
            p.player_id = next_player_id++
            p.socket_id = socket.id
            p.connection_id = connection_id
            p.name = name
            
            
            player_info.push(p)
            
            socket.to('rummikub').emit('new player', {
                'name' : p.name,
                'player_id' : p.player_id,
                'ready' : p.ready,
                'tiles' : p.hand.tiles.length,
            })
        }
        else {
            p.name = name
            p.ready = false
            p.socket_id = socket.id
            if (p.player_id == active_player_id && game_winner == null) {
                for (let player of player_info) {
                    if (player.ready) {
                        player.ready = false
                    }
                }
            }
            io.in('rummikub').emit('rc', p.player_id, p.name)
        }
        
        
        
        // Both new and returning
        let to_emit_player_info = []
        for (let p of player_info) {
            to_emit_player_info.push({
                'name' : p.name, 
                'player_id' : p.player_id,
                'ready' : p.ready,
                'tiles' : p.hand.tiles.length,
            })
        }
        
        socket.emit('current state', to_emit_player_info, {
            'hand' : p.hand,
            'board' : board,
            'player_id' : p.player_id,
            'remaining_tiles' : remaining_tiles.length,
            'placed_tile' : placed_tile,
            'game_winner' : game_winner,
            'active_player_id' : active_player_id,
            'valid_board' : valid_board,
        })
        
        
    })
    
    socket.on('move tiles', (target_id, source_tiles) => {
        // Check is active player
        let p = getPlayerBySocketID(socket.id)

        if (!p || p.player_id != active_player_id) {
            return
        }

        // Make sure source_tiles all same set and different to target_id
        if (!Array.isArray(source_tiles) || source_tiles.length < 1 || !Array.isArray(source_tiles[0]) || source_tiles[0].length != 2) {
            return
        }

        let source_set_ids = [...(new Set(source_tiles.map(x => x[0])))]
        
        if (source_set_ids.length != 1 || source_set_ids[0] == target_id) {
            return
        }
        
        // Reject if not reached value_remaining yet
        if (target_id != 0 && p.hand.value_remaining > 0) {
            return
        }
        
        // Reject if not valid and have only reached value_remaining this turn
        if (target_id != 0 && p.hand.value_remaining != null && !valid_board) {
            return
        }
        
        let source_id = source_set_ids[0]

        
        let target_set = null
        let new_set = false
        if (target_id == 0) {
            target_set = {
                'set_id' : next_set_id++,
                'tiles' : []
            }
            new_set = true
        }
        else {
            for (let i=0; i<board.length; i++) {
                if (board[i].set_id == target_id) {
                    target_set = board[i]
                    break
                }
            }
        }
        
        // Locate source set, find out if from hand or not
        let from_hand = source_id == -1
        let source_set = null
        let source_pos = [null, null]
        
        if (from_hand) {
            // // Reject if using joker before value_remaining
            // if ((p.hand.value_remaining > 0 || (p.hand.value_remaining != null && !valid_board)) && source_tiles.map(x => p.hand.tiles[x[1]][1]).includes(-1)) {
                // return
            // }
            
            
            
            source_set = p.hand
            // Tabulate position for Undo
            let state = {
                'board' : JSON.stringify(board),
            }
            p.hand.new_idxs = source_tiles.map(x => x[1])
            state['hand'] = JSON.stringify(p.hand)
            undo_states.push(state)
            
            if (p.hand.value_remaining != null) {
                p.hand.value_remaining -= source_tiles.reduce((a,b) => a + (p.hand.tiles[b[1]][1] == -1 ? 0 : p.hand.tiles[b[1]][0]) , 0)
            }
            
        }
        else {
            for (let i=0; i<board.length; i++) {
                if (board[i].set_id == source_id) {
                    source_set = board[i]
                    source_pos = i
                    break
                }
            }
        }
        
        // In order, move the tiles over
        source_tiles.sort((a, b) => b[1] - a[1])
        for (let t of source_tiles) {
            target_set.tiles.push(
                source_set.tiles.splice(t[1], 1)[0]
            )
        }

        
        
        // Sort and maybe remove empty set
        sortSet(target_set)
        if (!source_set.tiles.length && !from_hand) {
            board.splice(source_pos, 1)
        }

        // Add new set to end if applicable
        if (new_set) {
            board.splice(board.length-1, 0, target_set)
        }
        validateBoard()
        // Update hand specific things
        if (from_hand) {
            placed_tile = true
            p.hand.new_idxs = []
        }


        // Send it out
        io.in('rummikub').emit('move tiles', {
            'target_set' : target_set,
            'source_id' : source_id,
            'rel_source' : source_id == -1 ? p.hand.tiles.length : source_set,
            'valid_board' : valid_board,
        })
        
        if (source_id == -1) {
            socket.emit('update hand', source_set)
        }

    })
    
    socket.on('end turn', () => {
        let p = getPlayerBySocketID(socket.id)
        
        if (!p) {
            return
        }
        
        if (!valid_board || active_player_id != p.player_id) {
            return
        }

        if (p.hand.value_remaining > 0 && placed_tile) {
            return
        }
        else if (p.hand.value_remaining <= 0) {
            p.hand.value_remaining = null
        }

                
        // Draw Tile
        if (!placed_tile) {

            let t = drawTile()
            if (t) {
                p.hand.tiles.push(t)
                p.hand.new_idxs = []
                sortSet(p.hand)
                for (let i=0; i<p.hand.tiles.length; i++) {
                    if (p.hand.tiles[i] == t) {
                        p.hand.new_idxs = [i]
                    }
                }
                io.in('rummikub').emit('draw tile', p.player_id)

                socket.emit('update hand', p.hand)
            }
        }

        
        // Check win
        placed_tile = false
        if (!p.hand.tiles.length) {
            io.in('rummikub').emit('game over', active_player_id)
            game_winner = active_player_id
            for (let p of player_info) {
                if (p.socket_id == null) {
                    player_info.splice(player_info.indexOf(p), 1)
                    io.in('rummikub').emit('kick player', p.player_id)
                }
            }
        }
        // End Turn
        else {
            nextTurn(p.player_id)
        }
    })
    
    socket.on('ready', () => {
        let p = getPlayerBySocketID(socket.id)
        if (p) {
            // Start game
            if (game_winner != null) {
                if (!p.ready) {
                    p.ready = true
                    io.in('rummikub').emit('ready', p.player_id)
                    
                    for (let p of player_info) {
                        if (!p.ready) {
                            return
                        }
                    }
                    resetGame()
                }
            }
            else {
                let active_p = null
                for (let p of player_info) {
                    if (p.player_id == active_player_id) {
                        active_p = p
                        break
                    }
                }
                if (active_p && active_p.ready == null) {
                    if (!p.ready) {
                        p.ready = true
                        io.in('rummikub').emit('ready', p.player_id)
                        for (let p of player_info) {
                            if (p.ready == false) {
                                return
                            }
                        }
                        
                        // Next turn
                        nextTurn(active_p.player_id)
                        
                        
                        // Kick the dc player
                        console.log(p.name + " kicked")
                        player_info.splice(player_info.indexOf(active_p), 1)
                        io.in('rummikub').emit('kick player', active_p.player_id)
                        
                        for (let t of active_p.hand.tiles) {
                            remaining_tiles.push(t)
                        }
                        
                        for (let p of player_info) {
                            if (p.ready) {
                                p.ready = false
                            }
                        }
                        
                        io.in('rummikub').emit('remaining tiles', remaining_tiles.length)
                        
                        // End Game if they were solo
                        if (active_p.player_id == active_player_id) {
                            game_winner = -1
                            active_player_id = null
                            placed_tile = false
                            for (let p of player_info) {
                                p.ready = false
                                if (p.socket_id == null) {
                                    player_info.splice(player_info.indexOf(p), 1)
                                    io.in('rummikub').emit('kick player', p.player_id)
                                }
                            }
                            io.in('rummikub').emit('game over', game_winner)
                            
                        }
                    }
                }
            }
        }
    })
    
    socket.on('undo', () => {
        let p = getPlayerBySocketID(socket.id)
        
        if (p && active_player_id == p.player_id && undo_states.length) {
            let state = undo_states[undo_states.length-1]
            
            if (undo_states.length > 1) {
                undo_states.splice(undo_states.length-1, 1)
            }
            
            let value = p.hand.tiles.reduce((a,b) => a + (b[1] == -1 ? 0 : b[0]), 0)
            
            board = JSON.parse(state.board)
            p.hand = JSON.parse(state.hand)
            
            validateBoard()
            
            if (undo_states.length <= 1) {
                placed_tile = false
            }
            
            io.in('rummikub').emit('undo', {
                'player_id' : p.player_id,
                'board' : board,
                'placed_tile' : placed_tile,
                'tiles' : p.hand.tiles.length,
                'valid_board' : valid_board,
            })
            
            socket.emit('update hand', p.hand)
        }
    })

    socket.on('disconnect', () => {
        let p = getPlayerBySocketID(socket.id)
        if (p) {
            // Not playing
            if (!p.hand.tiles.length || game_winner != null) {
                console.log(p.name + " kicked")
                player_info.splice(player_info.indexOf(p), 1)
                io.in('rummikub').emit('kick player', p.player_id)
            
            }
            // Playing
            else {
                console.log(p.name + " soft kick")
                p.socket_id = null
                p.ready = null
                io.in('rummikub').emit('dc', p.player_id)
            }
        }
    })
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
}

module.exports = {
    init,
    connection,
}