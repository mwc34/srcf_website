socket.on('connect', () => {
    let connection_id = null
    if (sessionStorage.connection_id) {
        connection_id = sessionStorage.connection_id
    }
    else {
        connection_id = Math.random().toString()
        sessionStorage.connection_id = connection_id
    }
    socket.emit('init', 'rummikub')
    socket.emit('new player', your_name, connection_id)
})

socket.on('current state', (player_state, extra_state) => {
    player_info = player_state
    board = [extra_state.board] // To get into a row
    your_hand = extra_state.hand
    your_player_id = extra_state.player_id
    active_player_id = extra_state.active_player_id
    remaining_tiles_count = extra_state.remaining_tiles
    placed_tile = extra_state.placed_tile
    game_winner = extra_state.game_winner
    valid_board = extra_state.valid_board
    
    sortBoard()
    reDraw()

})

socket.on('new player', (p) => {
    player_info.push(p)
    
    reDraw()
})

socket.on('move tiles', (data) => {
    let found = false
    let remove_idxs = null
    for (let i=0; i<board.length; i++) {
        for (let j=0; j<board[i].length; j++) {
            if (board[i][j].set_id == data.target_set.set_id) {
                board[i][j] = data.target_set
                found = true
            }
            if (board[i][j].set_id == data.source_id) {
                board[i][j] = data.rel_source
                if (!data.rel_source.tiles.length) {
                    remove_idxs = [i, j]
                }
            }
        }
    }
    
    if (remove_idxs != null) {
        board[remove_idxs[0]].splice(remove_idxs[1], 1)
    }
    
    
    if (data.source_id == -1) {
        for (let p of player_info) {
            if (p.player_id == active_player_id) {
                p.tiles = data.rel_source
            }
        }
        placed_tile = true
        if (your_player_id == active_player_id) {
            your_hand.new_idxs = []
        }
    }
    
    if (!found) {
        board[board.length-1].splice(board[board.length-1].length-1, 0, data.target_set)
    }
    highlighted_tiles = []
    valid_board = data.valid_board
    reDraw()
    
})

socket.on('update hand', (data) => {
    your_hand = data
    reDrawHandBox()
})

socket.on('draw tile', (id) => {
    for (let p of player_info) {
        if (p.player_id == id) {
            p.tiles++
            remaining_tiles_count--
            break
        }
    }
    reDrawPlayerInfoBox()
})

socket.on('game over', (id) => {
    game_winner = id
    active_player_id = null
    placed_tile = false
    for (let p of player_info) {
        p.ready = false
    }
    reDrawPlayerInfoBox()
    reDrawActionBox()
})

socket.on('new turn', (id) => {
    active_player_id = id
    placed_tile = false
    reDraw()
})

socket.on('ready', (id) => {
    for (let p of player_info) {
        if (p.player_id == id) {
            p.ready = true
            reDrawPlayerInfoBox()
            reDrawActionBox()
            break
        }
    }
})

socket.on('remaining tiles', (c) => {
    remaining_tiles_count = c
    reDrawActionBox()
})

socket.on('new game', (data) => {
    active_player_id = data.active_player
    board = [data.board]
    your_hand = data.hand
    placed_tile = false
    game_winner = null
    
    for (let p of player_info) {
        p.tiles = 14
        p.ready = false
    }
    
    remaining_tiles_count = data.remaining_tiles
    valid_board = true
    sortBoard()
    reDraw()
})

socket.on('kick player', (id) => {
    for (let p of player_info) {
        if (p.player_id == id) {
            player_info.splice(player_info.indexOf(p), 1)
        }
        if (p.ready) {
            p.ready = false
        }
    }
    reDrawPlayerInfoBox()
})

socket.on('dc', (id) => {
    for (let p of player_info) {
        if (p.player_id == id) {
            p.ready = null
        }
    }
    reDrawPlayerInfoBox()
    reDrawActionBox()
})

socket.on('rc', (id, name) => {
    for (let p of player_info) {
        if (p.player_id == id) {
            p.ready = false
            p.name = name
        }
        if (active_player_id == id && game_winner == null) {
            p.ready = false
        }
    }
    reDrawPlayerInfoBox()
    reDrawActionBox()
})

socket.on('undo', (data) => {
    board = [data.board]
    placed_tile = data.placed_tile
    for (let p of player_info) {
        if (p.player_id == data.player_id) {
            p.tiles = data.tiles
        }
    }
    highlighted_tiles = []
    valid_board = data.valid_board
    sortBoard()
    reDraw()
})

















