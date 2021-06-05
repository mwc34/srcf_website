function setup() {
    setupPlayerInfoBox()
    setupActionBox()
    setupHandBox()
    
    window.onresize = () => {
        clearTimeout(window.resizedFinished)
        window.resizedFinished = setTimeout(() => {
            reSize()
            reDraw()
        }, 250)
    } 
}

border_colour = 'rgb(200, 200, 200)'
board_border_colour = 'rgb(100, 100, 100)'
tile_bg_colour = 'rgb(246, 248, 211)'
tile_selected_colour = 'rgb(0, 100, 0)'
tile_new_colour = 'rgb(252, 138, 220)'

function makeTile() {
    let tile = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    tile.style.position = 'absolute'
    tile.innerHTML = `<path/><path id="path_${path_counter}"/><text><textPath xlink:href="#path_${path_counter}" text-anchor="middle" startOffset="50%" dominant-baseline="central"></textPath></text><image></image>`
    path_counter += 1
        
    tile.children[2].children[0].setAttribute('stroke', 'rgb(0, 0, 0)')
    tile.children[2].style.userSelect = 'none'
    tile.children[0].setAttribute('fill', tile_bg_colour)
    tile.children[0].setAttribute('stroke', 'black')
    
    tile.onclick = () => {
        if (active_player_id == your_player_id) {
            let different_set = false
            for (let i=0; i<highlighted_tiles.length; i++) {
                if (highlighted_tiles[i].toString() == tile.tile_id.toString()) {
                    highlighted_tiles.splice(i, 1)
                    reDrawBoard()
                    reDrawHandBox()
                    return
                }
                else if (highlighted_tiles[i][0] != tile.tile_id[0]) {
                    different_set = true
                    break
                }
            }

            if (!different_set) {
                if (tile.tile_id[0] != 0) {
                    highlighted_tiles.push(tile.tile_id)
                }
            }
            // Not moving to hand
            else if (tile.tile_id[0] != -1) {
                socket.emit('move tiles', tile.tile_id[0], highlighted_tiles)
            }

            reDraw()
        }
    }
    
    return tile
}

function makeTileSet() {
    let div = document.createElement('div')
    div.style.position = 'absolute'
    div.style.borderColor = board_border_colour
    div.style.borderStyle = 'solid solid solid solid'
    
    return div
}

function makePlayerInfo() {
    let div = document.createElement('div')
    div.style.position = 'absolute'
    div.style.borderColor = border_colour
    div.style.borderStyle = 'solid none solid none'
    
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
    
    for (let i=0; i<2; i++) {
        let c = div.children[i]
        c.style.display = 'flex'
        c.style.justifyContent = 'left'
        c.style.alignItems = 'center'
    }
    
    return div
}

function setupPlayerInfoBox() {
    player_info_box.style.position = 'absolute'
    player_info_box.style.borderColor = border_colour
    player_info_box.style.borderStyle = 'solid solid solid solid'
    
    let title = document.createElement('div')
    title.style.position = 'absolute'
    title.innerHTML = 'Player Info'
    title.style.display = 'flex'
    title.style.justifyContent = 'center'
    title.style.alignItems = 'center'
    
    player_info_box.appendChild(title)
    
    player_info_box.appendChild(makePlayerInfo())
}

function setupActionBox() {
    action_box.style.position = 'absolute'
    action_box.style.borderColor = border_colour
    action_box.style.borderStyle = 'solid solid solid none'
    
    let buttons = [
        'Tiles Left:',
        'Undo',
        'Sort Board',
        'Deselect All',
        'End Turn',
    ]
    
    for (let b of buttons) {
        let div = document.createElement('div')
        div.style.position = 'absolute'
        div.innerHTML = b
        div.style.display = 'flex'
        div.style.justifyContent = 'center'
        div.style.alignItems = 'center'
        div.style.userSelect = 'none'
        
        action_box.appendChild(div)
    }
    
    // Undo
    action_box.children[1].onclick = () => {
        if (your_player_id == active_player_id) {
            socket.emit('undo')
        }
    }
    
    // Sort Board
    action_box.children[2].onclick = () => {
        sortBoard()
    }
    
    // Deselect All
    action_box.children[3].onclick = () => {
        highlighted_tiles = []
        reDrawBoard()
        reDrawHandBox()
    }
    
    // End Turn
    action_box.children[4].onclick = () => {
        let active_p = null
        for (let p of player_info) {
            if (p.player_id == active_player_id) {
                active_p = p
                break
            }
        }
        
        if (game_winner != null || (active_p && active_p.ready == null)) {
            for (let p of player_info) {
                if (p.player_id == your_player_id) {
                    if (!p.ready) {
                        socket.emit('ready')
                    }
                    break
                }
            }
        }
        else if (valid_board && active_player_id == your_player_id) {
            socket.emit('end turn')
        }
    }
    
    
}

function setupHandBox() {
    hand_box.style.position = 'absolute'
    hand_box.style.borderColor = border_colour
    hand_box.style.borderStyle = 'solid solid solid none'
}