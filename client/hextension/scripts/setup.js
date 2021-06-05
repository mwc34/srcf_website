function setup() {
    square.style.position = 'absolute'
    setupTiles()
    setupCurrTileBox()
    setupRemainingTilesBox()
    setupPlayerInfoBox()
    setupNextGameButton()
    
    window.onresize = () => {
        clearTimeout(window.resizedFinished)
        window.resizedFinished = setTimeout(() => {
            reSize()
            reDraw()
        }, 250)
    }
}

function makeTile() {
    let tile = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    tile.style.position = 'absolute'
    tile.innerHTML = `<path/><path/><path/><path/><path id="path_${path_counter}"/><path id="path_${path_counter+1}"/><path id="path_${path_counter+2}"/><text><textPath xlink:href="#path_${path_counter}" text-anchor="middle" startOffset="50%" dominant-baseline="central"></textPath></text><text><textPath xlink:href="#path_${path_counter+1}" text-anchor="middle" startOffset="50%" dominant-baseline="central"></textPath></text><text><textPath xlink:href="#path_${path_counter+2}" text-anchor="middle" startOffset="50%" dominant-baseline="central"></textPath></text>`
    path_counter += 3
    
    return tile
}

function setupTiles() {
    board.style.position = 'absolute'
    for (let i=0; i<19; i++) {
        let tile = makeTile()
        board.appendChild(tile)
        
        tile.onclick = () => {
            if (board_player_id == your_player_id) {
                let player = null
                for (let p of game_state) {
                    if (p.player_id == your_player_id && p.board_state) {
                        player = p
                        break
                    }
                }
                if (player.board_state && !player.board_state[i] && curr_tile) {
                    let neighbour = false
                    for (let n of next_to[i]) {
                        if (player.board_state[n] && n != player.curr_tile_idx) {
                            neighbour = true
                        }
                    }
                    if (neighbour || remaining_tiles.length == 26) {
                        socket.emit('place tile', i)
                    }
                }
            }
        }
        
        tile.onmouseover = () => {
            if (board_player_id == your_player_id && curr_tile) {
                let player = null
                for (let p of game_state) {
                    if (p.player_id == your_player_id && p.board_state) {
                        player = p
                        break
                    }
                }
                if (player.board_state && !player.board_state[i] && curr_tile) {
                    let neighbour = false
                    for (let n of next_to[i]) {
                        if (player.board_state[n] && n != player.curr_tile_idx) {
                            neighbour = true
                        }
                    }
                    if (neighbour || remaining_tiles.length == 26) {
                        hover_idx = i
                        reDrawBoard()
                    }
                }
            }
        }
        
        tile.onmouseout = () => {
            hover_idx = null
            reDrawBoard()
        }
    }
}

function setupCurrTileBox() {
    curr_tile_box.style.position = 'absolute'
    
    let title = document.createElement('div')
    title.style.position = 'absolute'
    title.innerHTML = 'Current Tile'
    curr_tile_box.appendChild(title)
    
    let tile = makeTile()
    curr_tile_box.appendChild(tile)
}

function setupRemainingTilesBox() {
    remaining_tiles_box.style.position = 'absolute'
    
    let title = document.createElement('div')
    title.style.position = 'absolute'
    title.innerHTML = 'Remaining Tiles'
    remaining_tiles_box.appendChild(title)
    
    for (let i=0; i<27; i++) {
        let tile = makeTile()
        remaining_tiles_box.appendChild(tile)
    }
}

function makePlayerInfo() {
    let div = document.createElement('div')
    div.style.position = 'absolute'
    
    let name = document.createElement('div')
    name.style.position = 'absolute'
    
    let score = document.createElement('div')
    score.style.position = 'absolute'
    
    let clock = document.createElement('img')
    clock.style.position = 'absolute'
    clock.style.visibility = 'hidden'
    clock.src = 'waiting.png'
    
    div.appendChild(name)
    div.appendChild(score)
    div.appendChild(clock)

    div.onclick = () => {
        let i = null
        for (let idx=1; idx<player_info_box.childElementCount; idx++) {
            if (div == player_info_box.children[idx]) {
                i = idx-1
                break
            }
        }
        
        if (game_state.length > i && (game_state[i].board_state || game_state[i].player_id == your_player_id)) {
            board_player_id = game_state[i].player_id
            hover_idx = null
            reDrawPlayerInfoBox()
            reDrawBoard()
        }
    }
    
    return div
}

function setupPlayerInfoBox() {
    player_info_box.style.position = 'absolute'
    
    let title = document.createElement('div')
    title.style.position = 'absolute'
    title.innerHTML = 'Player Info'
    player_info_box.appendChild(title)
    
    player_info_box.appendChild(makePlayerInfo())
}

function setupNextGameButton() {
    next_game_button.style.position = 'absolute'
    next_game_button.innerHTML = 'Click to play again'
    
    next_game_button.onclick = () => {
        socket.emit('next game ready')
    }
}