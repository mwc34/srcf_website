socket.on('connect', () => {
    socket.emit('init', 'hextension')
    socket.emit('new player', your_name)
})

socket.on('next tile', (next_tile) => {
    curr_tile = next_tile
    for (let i=0; i<remaining_tiles.length; i++) {
        if (String(next_tile) == String(remaining_tiles[i])) {
            remaining_tiles.splice(i, 1)
            break
        }
    }
    for (let p of game_state) {
        p.curr_tile_idx = null
    }
    reDrawRemainingTilesBox()
    reDrawCurrTileBox()
    reDrawPlayerInfoBox()
    reDrawBoard()
})

socket.on('game finished', () => {
    console.log("Game Over!")
    curr_tile = null
    reDrawNextGameButton()
    reDrawPlayerInfoBox()
})

socket.on('next game ready', (player_id) => {
    for (let p of game_state) {
        if (p.player_id == player_id) {
            p.next_game_ready = true
            reDrawPlayerInfoBox()
            reDrawNextGameButton()
        }
    }
})

socket.on('new player', (new_player_info) => {
    game_state.push(new_player_info)
    reDrawPlayerInfoBox()
})

socket.on('kick player', (player_id) => {
    let idx = null
    for (let i=0; i<game_state.length; i++) {
        let p = game_state[i]
        if (p.player_id == player_id) {
            idx = i
            break
        }
    }
    if (idx != null) {
        game_state.splice(idx, 1)
        if (idx == board_player_id) {
            board_player_id = your_player_id
            hover_idx = null
            reDrawBoard()
        }
        reDrawPlayerInfoBox()
    }
})

socket.on('current state', (player_id, curr_state, game_remaining_tiles, current_tile) => {
    game_state = curr_state
    your_player_id = player_id
    if (game_state[game_state.length-1].board_state) {
        board_player_id = player_id
    }
    else {
        idx = 0
        while (game_state.length > idx && !game_state[idx].board_state) {
            idx++
        }
        board_player_id = game_state[idx].player_id
    }
    hover_idx = null
    
    remaining_tiles = game_remaining_tiles
    curr_tile = current_tile
    reDraw()
})

socket.on('place tile', (player_id, idx) => {
    for (let p of game_state) {
        if (p.player_id == player_id) {
            p.board_state[idx] = curr_tile
            
            if (p.curr_tile_idx != null) {
                p.board_state[p.curr_tile_idx] = null
            }
            p.curr_tile_idx = idx
            
            if (p.player_id == your_player_id && p.curr_tile_idx == hover_idx) {
                hover_idx = null
            }
            
            reDrawBoard()
            reDrawPlayerInfoBox()
            break
        }
    }
})