function reDraw() {
    reDrawBoard()
    reDrawPlayerInfoBox()
    reDrawActionBox()
    reDrawHandBox()
}

let pad_set_height = 0.25
let pad_set_width = 0.5

function reDrawTile(tile, value, suit, x, y, w, h, new_tile=false) {
    
    let colour = [
        'rgb(0, 0, 0)',
        'rgb(255, 0, 0)',
        'rgb(51, 190, 255)',
        'rgb(255, 255, 0)'
    ][suit]

    tile.setAttribute('width', w)
    tile.setAttribute('height', h)
    
    tile.children[0].setAttribute('d', `M 0 0 h ${w} v ${h} h ${-w} Z`)
    
    if (highlighted_tiles.map(x => x.toString()).includes(tile.tile_id.toString())) {
        tile.children[0].setAttribute('fill', tile_selected_colour)
    }
    else if (new_tile) {
        tile.children[0].setAttribute('fill', tile_new_colour)
    }
    else {
        tile.children[0].setAttribute('fill', tile_bg_colour)
    }
    
    tile.children[1].setAttribute('d', `M 0 ${h/2} h ${w}`)
    
    // Normal tile
    if (suit >= 0) {
        tile.children[2].children[0].setAttribute('fill', colour)
        tile.children[2].children[0].textContent = value
        
        tile.children[3].setAttribute('href', '')
    }
    // Joker
    else {
        let width_percent = 0.5
        tile.children[3].setAttribute('href', `joker_${value == 'JR' ? 'red' : 'black'}.png`)
        tile.children[3].setAttribute('x', (1 - width_percent) * w/2)
        tile.children[3].setAttribute('y', (h - width_percent * w)/2)
        tile.children[3].setAttribute('width', width_percent * w)
        tile.children[3].setAttribute('height', width_percent * w)
        
        tile.children[2].children[0].textContent = ''
    }
    
    let font_size = w/1.5 + 'px'
    
    tile.children[2].style.fontSize = font_size
    
    tile.style.left = x + 'px'
    tile.style.top = y + 'px'
}

function reDrawBoard() {
    let max_height = board.length * (1 + pad_set_height) // Padding and empty row
    let max_width = 0
    for (let row of board) {
        let curr_width = 0
        for (let set of row) {
            curr_width += set.tiles.length + pad_set_width //Padding
        }
        max_width = Math.max(max_width, curr_width)
    }
    
    let left = window.innerWidth * player_info_percent
    let top = window.innerHeight * action_percent
    let width = window.innerWidth - left
    let height = window.innerHeight - top - window.innerHeight * hand_percent
    
    let tile_width = Math.min(Math.min(width/max_width, (height - max_height * getBorderSize()*2)/(max_height*tile_ratio)), height/(3 * tile_ratio))
    let tile_height = tile_width * tile_ratio
    
    let set_counter = 0
    
    let y = top
    for (let i=0; i<board.length; i++) {
        let x = left
        for (let j=0; j<board[i].length; j++) {
            
            if (board_box.childElementCount <= set_counter) {
                board_box.appendChild(makeTileSet())
            }
            
            let tile_set = board_box.children[set_counter]
            
            tile_set.style.borderRadius = getBorderSize() + 'px'
            
            tile_set.style.top = y + 'px'
            tile_set.style.left = x + 'px'
            let set_width = (board[i][j].tiles.length + pad_set_width) * tile_width - getBorderSize()*2
            tile_set.style.width = set_width + 'px'
            tile_set.style.height = (1 + pad_set_height) * tile_height + 'px'
            
            while (tile_set.childElementCount > board[i][j].tiles.length) {
                tile_set.removeChild(tile_set.children[tile_set.childElementCount-1])
            }
            
            while (tile_set.childElementCount < board[i][j].tiles.length) {
                tile_set.appendChild(makeTile())
            }
            
            for (let k=0; k<board[i][j].tiles.length; k++) {
                let tile_info = board[i][j].tiles[k]
                tile_set.children[k].tile_id = [board[i][j].set_id, k]
                reDrawTile(tile_set.children[k], tile_info[0], tile_info[1], (pad_set_width/2 + k)*tile_width, tile_height*pad_set_height/2, tile_width, tile_height)
            }
            
            set_counter++
            x += set_width + getBorderSize()*2
        }
        y += (1 + pad_set_height) * tile_height + getBorderSize()*2
    }
    
    // Remove remaining sets
    for (let i=board_box.childElementCount-1; i>=set_counter; i--) {
        board_box.removeChild(board_box.children[i])
    }
    
}

function reDrawPlayerInfoBox() {
    let title = player_info_box.children[0]
    
    let changed = false
    
    while (player_info.length >= player_info_box.childElementCount) {
        player_info_box.appendChild(makePlayerInfo())
        changed = true
    }
    
    while (player_info.length+1 < player_info_box.childElementCount) {
        player_info_box.removeChild(player_info_box.children[1])
        changed = true
    }
    
    if (changed) {
        reSizePlayerInfoBox()
    }
    
    let active_p = null
    for (let p of player_info) {
        if (p.player_id == active_player_id) {
            active_p = p
            break
        }
    }
    
    for (let i=0; i<player_info_box.childElementCount-1; i++) {
        let div = player_info_box.children[i+1]
        let name = div.children[0]
        let score = div.children[1]
        let clock = div.children[2]
        let name_type = player_info[i].player_id == game_winner ? 'Winner' : player_info[i].player_id == active_player_id || player_info[i].tiles ? 'Player' : 'Spectator'
        name.innerHTML = `${name_type}: ${player_info[i].name}`
        score.innerHTML = `Tiles: ${player_info[i].tiles}`
        
        if (player_info[i].player_id == your_player_id) {
            name.style.color = 'rgb(150, 0, 0)'
            score.style.color = 'rgb(150, 0, 0)'
        }
        else {
            name.style.color = 'rgb(0, 0, 0)'
            score.style.color = 'rgb(0, 0, 0)'
        }
        
        if (player_info[i].player_id == active_player_id || (game_winner != null && !player_info[i].ready) || (active_p && active_p.ready == null && !player_info[i].ready)) {
            clock.style.visibility = ''
        }
        else {
            clock.style.visibility = 'hidden'
        }
    }
}

function reDrawActionBox() {
    let div = action_box.children[0]
    
    div.innerHTML = `Tiles Left: ${remaining_tiles_count}`
    
    
    div = action_box.children[4]
    
    if (game_winner != null) {
        for (let p of player_info) {
            if (p.player_id == your_player_id) {
                if (p.ready) {
                    div.innerHTML = ''
                    div.style.color = 'black'
                }
                else {
                    div.innerHTML = 'Click to start'
                    div.style.color = 'black'
                }
                break
            }
        }
    }
    else {
        for (let p of player_info) {
            if (p.player_id == active_player_id && p.ready == null) {
                for (let p of player_info) {
                    if (p.player_id == your_player_id) {
                        if (p.ready) {
                            div.innerHTML = ''
                            div.style.color = 'black'
                        }
                        else {
                            div.innerHTML = 'Vote to kick'
                            div.style.color = 'black'
                        }
                        
                        return
                    }
                }
                
                return
            }
        }
        
        if (!valid_board) { 
            div.innerHTML = 'Invalid Board'
            div.style.color = 'red'
        }
        else if (active_player_id != your_player_id) {
            div.innerHTML = 'Valid Board'
            div.style.color = 'green'
        }
        else if (placed_tile) { 
            div.innerHTML = 'End Turn'
            div.style.color = 'black'
        }
        else { 
            div.innerHTML = 'Draw Tile'
            div.style.color = 'black'
        }
    }
    
}

function reDrawHandBox() {
    
    let height = window.innerHeight * hand_percent - getBorderSize()*2
    let width = window.innerWidth * (1 - player_info_percent) - getBorderSize()
    
    let t = Math.floor(width * tile_ratio / height)
    
    let square_size = Math.ceil((-t + Math.sqrt(t**2 + 4 * t * your_hand.tiles.length))/(2*t))
    
    let max_height = square_size
    let max_width = Math.max(max_height*3, Math.ceil(your_hand.tiles.length/max_height))

    let tile_width = Math.min(width/max_width, height/(max_height*tile_ratio))
    let tile_height = tile_width * tile_ratio

    let pad_height = (height - tile_height * max_height)/2
    
    let tile_counter = 0
    
    while (hand_box.childElementCount > your_hand.tiles.length) {
        hand_box.removeChild(hand_box.children[hand_box.childElementCount-1])
    }
    
    while (hand_box.childElementCount < your_hand.tiles.length) {
        hand_box.appendChild(makeTile())
    }
    
    for (let i=0; i<max_height; i++) {
        for (let j=0; j<max_width; j++) {
            let pad_width = (width - tile_width * Math.min(max_width, your_hand.tiles.length - i*max_width))/2
            if (tile_counter >= your_hand.tiles.length) {
                return
            }

            let tile_info = your_hand.tiles[tile_counter]
            let y = i*tile_height + pad_height
            let x = j*tile_width + pad_width
            
            hand_box.children[tile_counter].tile_id = [-1, tile_counter]
            reDrawTile(hand_box.children[tile_counter], tile_info[0], tile_info[1], x, y, tile_width, tile_height, your_hand.new_idxs.includes(tile_counter))
                
            tile_counter++
        }
    }
}