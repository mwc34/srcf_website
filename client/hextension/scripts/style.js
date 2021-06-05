function style() {
    styleBoard()
    styleCurrTileBox()
    styleRemainingTilesBox()
    stylePlayerInfoBox()
    styleNextGameButton()
}

border_colour = 'rgb(200, 200, 200)'

function styleTile(tile) {
    for (let i=0; i<3; i++) {    
        tile.children[7+i].children[0].setAttribute('fill', 'rgb(255, 255, 255)')
        tile.children[7+i].children[0].setAttribute('stroke', 'rgb(0, 0, 0)')
        tile.children[7+i].style.userSelect = 'none'
    }
}

function styleBoard() {
    board.style.borderColor = border_colour
    board.style.borderStyle = 'solid'
    for (let i=0; i<19; i++) {
        let tile = board.children[i]
        
        styleTile(tile)
    }
}

function styleCurrTileBox() {
    let title = curr_tile_box.children[0]
    let tile = curr_tile_box.children[1]
    
    curr_tile_box.style.borderColor = border_colour
    curr_tile_box.style.borderStyle = 'none solid solid none'
    
    title.style.display = 'flex'
    title.style.justifyContent = 'center'
    title.style.alignItems = 'center'
    
    
    styleTile(tile)
}

function styleRemainingTilesBox() {
    let title = remaining_tiles_box.children[0]
    
    remaining_tiles_box.style.borderColor = border_colour
    remaining_tiles_box.style.borderStyle = 'none solid solid solid'
    
    title.style.display = 'flex'
    title.style.justifyContent = 'center'
    title.style.alignItems = 'center'
    
    for (let i=0; i<27; i++) {
        let tile = remaining_tiles_box.children[i+1]
        styleTile(tile)
    }
    
}

function stylePlayerInfo(div) {
    div.style.borderColor = border_colour
    div.style.borderStyle = 'solid none solid none'
    
    for (let i=0; i<2; i++) {
        let c = div.children[i]
        c.style.display = 'flex'
        c.style.justifyContent = 'left'
        c.style.alignItems = 'center'
    }
    
    let clock = div.children[2]
}

function stylePlayerInfoBox() {
    player_info_box.style.borderColor = border_colour
    player_info_box.style.borderStyle = 'solid none solid solid'
    
    let title = player_info_box.children[0]
    title.style.display = 'flex'
    title.style.justifyContent = 'center'
    title.style.alignItems = 'center'
    
    for (let i=0; i<player_info_box.childElementCount-1; i++) {
        stylePlayerInfo(player_info_box.children[i+1])
    }    
}

function styleNextGameButton() {
    next_game_button.style.borderColor = border_colour
    next_game_button.style.borderStyle = 'none none solid solid'
    next_game_button.style.display = 'flex'
    next_game_button.style.justifyContent = 'center'
    next_game_button.style.alignItems = 'center'
    next_game_button.style.textAlign = 'center'
    next_game_button.style.userSelect = 'none'
}