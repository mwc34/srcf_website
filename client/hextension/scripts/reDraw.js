function reDraw() {
    reDrawBoard()
    reDrawCurrTileBox()
    reDrawRemainingTilesBox()
    reDrawPlayerInfoBox()
    reDrawNextGameButton()
}

function reDrawTile(tile, values) {
    
    if (values) {
        tile.children[0].setAttribute('fill', 'rgb(100, 100, 100)')
        
        for (let i=0; i<3; i++) {
            let colour = [
                'rgb(89, 89, 89)',
                'rgb(0, 0, 0)',
                'rgb(196, 108, 64)',
                'rgb(32, 107, 173)',
                'rgb(229, 217, 55)',
                'rgb(102, 193, 60)',
                'rgb(219, 28, 28)',
                'rgb(255, 255, 255)',
                'rgb(69, 10, 112)',
            ][values[i]-1]
            tile.children[1+i].setAttribute('fill', colour)
            tile.children[7+i].children[0].textContent = values[i]
        }
    }
    else {
        tile.children[0].setAttribute('fill', 'rgb(0, 0, 0)')
        tile.children[1].setAttribute('fill', 'none')
        tile.children[2].setAttribute('fill', 'none')
        tile.children[3].setAttribute('fill', 'none')
        tile.children[4].setAttribute('fill', 'none')
        tile.children[5].setAttribute('fill', 'none')
        tile.children[6].setAttribute('fill', 'none')
        
        tile.children[7].children[0].textContent = ''
        tile.children[8].children[0].textContent = ''
        tile.children[9].children[0].textContent = ''
    }
        
    
}

function reDrawBoard() {
    let b = []
    for (let p of game_state) {
        if (p.player_id == board_player_id && p.board_state) {
            b = p.board_state
            break
        }
    }
    for (let i=0; i<19; i++) {
        let tile = board.children[i]
        
        if (hover_idx == i && b.length) {
            reDrawTile(tile, curr_tile)
            tile.style.opacity = 0.5
        }
        else {
            reDrawTile(tile, b[i])
            tile.style.opacity = 1
        }
        
        
    }
}

function reDrawCurrTileBox() {
    let title = curr_tile_box.children[0]
    let tile = curr_tile_box.children[1]
    
    reDrawTile(tile, curr_tile)
}

function reDrawRemainingTilesBox() {
    let title = remaining_tiles_box.children[0]
    
    let next_tile_idx = 0
    
    for (let i=0; i<27; i++) {
        let tile = remaining_tiles_box.children[i+1]
        if (String(total_tiles[i]) == String(remaining_tiles[next_tile_idx])) {
            reDrawTile(tile, total_tiles[i])
            next_tile_idx++
        }
        else {
            reDrawTile(tile)
        }
    }
}

function reDrawPlayerInfoBox() {
    let title = player_info_box.children[0]
    
    let changed = false
    
    while (game_state.length >= player_info_box.childElementCount) {
        player_info_box.appendChild(makePlayerInfo())
        changed = true
    }
    
    while (game_state.length+1 < player_info_box.childElementCount) {
        player_info_box.removeChild(player_info_box.children[1])
        changed = true
    }
    
    if (changed) {
        stylePlayerInfoBox()
        reSizePlayerInfoBox()
    }
    
    for (let i=0; i<player_info_box.childElementCount-1; i++) {
        let div = player_info_box.children[i+1]
        let name = div.children[0]
        let score = div.children[1]
        let clock = div.children[2]
        name.innerHTML = `${game_state[i].board_state ? 'Player' : 'Spectator'}: ${game_state[i].name}`
        score.innerHTML = `Score: ${getScore(game_state[i].board_state)}`
        
        if (game_state.length > i && game_state[i].player_id == board_player_id) {
            div.style.backgroundColor = 'rgb(200, 100, 200)'
        }
        else {
            div.style.backgroundColor = 'rgb(255, 255, 255)'
        }
        
        if (game_state.length > i && game_state[i].player_id == your_player_id) {
            name.style.color = 'rgb(150, 0, 0)'
            score.style.color = 'rgb(150, 0, 0)'
        }
        else {
            name.style.color = 'rgb(0, 0, 0)'
            score.style.color = 'rgb(0, 0, 0)'
        }
        if (game_state.length > i && game_state[i].board_state && ((game_state[i].curr_tile_idx == null && curr_tile && game_state.length > 1) || (remaining_tiles.length == 8 && !curr_tile && !game_state[i].next_game_ready))) {
            clock.style.visibility = ''
        }
        else {
            clock.style.visibility = 'hidden'
        }
        
    }
}

function reDrawNextGameButton() {
    next_game_button.style.visibility = 'hidden'
    for (let p of game_state) {
        if (p.player_id == your_player_id && p.board_state && !p.next_game_ready && remaining_tiles.length == 8 && !curr_tile) {
            next_game_button.style.visibility = ''
            break
        }
    }
}