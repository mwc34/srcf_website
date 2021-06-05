function reSize() {
    size = Math.min(window.innerWidth, window.innerHeight)
    square.style.left = (window.innerWidth - size)/2 + 'px'
    square.style.top = (window.innerHeight - size)/2 + 'px'
    reSizeBoard()
    reSizeCurrTileBox()
    reSizeRemainingTilesBox()
    reSizePlayerInfoBox()
    reSizeNextGameButton()
}

board_height_fraction = 0.7

function getBorderSize() {
    return size/250
}

function reSizeTile(tile, width) {
    let height = width * Math.sqrt(3) / 2
    let line = width / 2
    let colour_line = line / 3
    let font_size = width / 4.5
    let number_offset = font_size*0.75
    
    tile.setAttribute('width', width)
    tile.setAttribute('height', height)
    
    tile.children[0].setAttribute('d', `M 0 ${height/2} L ${line/2} 0 h ${line} L ${width} ${height/2} L ${3*line/2} ${height} h ${-line} Z`)
    
    tile.children[1].setAttribute('d', `M ${(line - colour_line)/4} ${height/2 - (line - colour_line) * Math.sqrt(3)/4} l ${colour_line/2} ${-colour_line * Math.sqrt(3)/2} L ${width - (line - colour_line)/4} ${height/2 + (line - colour_line) * Math.sqrt(3)/4} l ${-colour_line/2} ${colour_line * Math.sqrt(3)/2} Z`)
    tile.children[2].setAttribute('d', `M ${width*0.25 - (line - colour_line)/4} ${height - (line-colour_line) * Math.sqrt(3)/4} l ${-colour_line/2} ${-colour_line * Math.sqrt(3)/2} L ${width/2 - colour_line} ${height/2} h ${colour_line*2} L ${width - (line - colour_line)/4} ${height/2 - (line - colour_line) * Math.sqrt(3)/4} l ${-colour_line/2} ${-colour_line * Math.sqrt(3)/2} L ${width/2 + colour_line/2} ${height/2 - colour_line * Math.sqrt(3)/2} L ${width/2 - colour_line/2} ${height/2 + colour_line * Math.sqrt(3)/2} Z`)
    tile.children[3].setAttribute('d', `M ${line - colour_line/2} 0 h ${colour_line} v ${height} h ${-colour_line} Z`)
    
    tile.children[4].setAttribute('d', `M ${(line)/4 + number_offset*Math.sqrt(3)/2 - colour_line/2} ${height/2 - (line)*Math.sqrt(3)/4 + number_offset/2} h ${colour_line}`)
    tile.children[5].setAttribute('d', `M ${width*0.75 + line/4 - number_offset*Math.sqrt(3)/2 - colour_line/2} ${line*Math.sqrt(3)/4 + number_offset/2} h ${colour_line}`)
    tile.children[6].setAttribute('d', `M ${width/2 - colour_line/2} ${number_offset} h ${colour_line}`)
        
    tile.children[7].style.fontSize = font_size + 'px'
    tile.children[8].style.fontSize = font_size + 'px'
    tile.children[9].style.fontSize = font_size + 'px'
}

function reSizeBoard() {
    let height = size * board_height_fraction - getBorderSize()*2
    let width = height * 8 / (5 * Math.sqrt(3))
    board.style.width = width + 'px'
    board.style.height = height + 'px'
    board.style.left = size - width - getBorderSize()*2 + 'px'

    board.style.borderWidth = getBorderSize() + 'px'
    
    for (let i=0; i<19; i++) {
        let tile = board.children[i]
        let height = parseFloat(board.style.height)/5
        let width = 2 * height / Math.sqrt(3)
        reSizeTile(tile, width)
        
        let x_bins = [0, 3, 7, 12, 16, 19]
        let y_start = [1, 0.5, 0, 0.5, 1]
        
        let bin = 0
        while (x_bins[bin+1] <= i) {
            bin++
        }
        
        tile.style.left = bin * width * 0.75 + 'px'
        tile.style.top = (y_start[bin] + i - x_bins[bin]) * height + 'px'
        
    }
}

function reSizeCurrTileBox() {
    
    let fraction_of_board_size = 0.9
    
    let height = (parseFloat(board.style.height)/5) * fraction_of_board_size - getBorderSize()
    let title_height = height * 0.2
    let width = 2 * (height - title_height) / Math.sqrt(3)
    
    curr_tile_box.style.width = width + 'px'
    curr_tile_box.style.height = height + 'px'
    curr_tile_box.style.left = parseFloat(board.style.left) + getBorderSize() + 'px'
    curr_tile_box.style.top = getBorderSize() + 'px'
    
    curr_tile_box.style.borderWidth = getBorderSize() + 'px'
    
    let title = curr_tile_box.children[0]
    let tile = curr_tile_box.children[1]
    
    reSizeTile(tile, width)
    
    let font_size = title_height / 2
    
    title.style.width = width + 'px'
    title.style.height = title_height + 'px'
    title.style.fontSize = font_size + 'px'
    
    tile.style.top = title_height + 'px'
}

function reSizeRemainingTilesBox() {
    let height = size * (1 - board_height_fraction) - getBorderSize()
    let title_height = height * 0.2
    let width = size - getBorderSize()*2
    
    remaining_tiles_box.style.width = width + 'px'
    remaining_tiles_box.style.height = height + 'px'
    remaining_tiles_box.style.top = size * board_height_fraction + 'px'
    
    remaining_tiles_box.style.borderWidth = getBorderSize() + 'px'
    
    let title = remaining_tiles_box.children[0]
    let font_size = title_height
    
    title.style.width = width + 'px'
    title.style.height = title_height + 'px'
    title.style.fontSize = font_size + 'px'
    
    let padding = 0.05
    
    for (let i=0; i<27; i++) {
        let tile = remaining_tiles_box.children[i+1]
        
        let tile_width = Math.min(width/9, 2*(height - title_height)/(Math.sqrt(3) * 3))
        let tile_height = tile_width * Math.sqrt(3)/2
        
        let offset_x = (width - tile_width*9)/2
        let offset_y = (height - title_height - tile_height*3)/2
        
        reSizeTile(tile, tile_width*(1 - padding*2))
        
        tile.style.left = offset_x + tile_width * ((i % 9) + padding) + 'px'
        tile.style.top = offset_y + title_height + (padding + Math.floor(i/9)) * tile_height + 'px'
        
    }
}

function reSizePlayerInfo(div, w, h, top, bottom) {
    let width = w
    let height = h - getBorderSize()
    
    div.style.width = width + 'px'
    div.style.height = height + 'px'
    let t = getBorderSize()
    div.style.borderWidth = `${t * top}px 0px ${t * !bottom}px 0px`
    
    let name = div.children[0]
    let score = div.children[1]
    let clock = div.children[2]
    
    let font_size = height/4
    
    let clock_width_fraction = 0.1
    let padding = 0.05
    
    left_width = width * (1 - clock_width_fraction - padding*2)
    clock_width = width * clock_width_fraction
    
    name.style.width = left_width + 'px'
    name.style.height = height/2 + 'px'
    name.style.fontSize = font_size + 'px'
    
    score.style.width = left_width + 'px'
    score.style.height = height/2 + 'px'
    score.style.top = height/2 + 'px'
    score.style.fontSize = font_size + 'px'
    
    clock.width = clock_width
    clock.height = clock_width
    clock.style.left = left_width + padding * width + 'px'
    clock.style.top = (height - clock_width)/2 + 'px'
    
    
}

function reSizePlayerInfoBox() {
    let height = size * board_height_fraction - getBorderSize()*2
    let title_height = height * 0.2
    let width = size - parseFloat(board.style.width) - getBorderSize()*3
    
    player_info_box.style.width = width + 'px'
    player_info_box.style.height = height + 'px'
    player_info_box.style.borderWidth = getBorderSize() + 'px'
    
    let title = player_info_box.children[0]
    let font_size = title_height/2
    
    title.style.width = width + 'px'
    title.style.height = title_height + 'px'
    title.style.fontSize = font_size + 'px'
    
    let lower_bound = 5
    
    for (let i=0; i<player_info_box.childElementCount-1; i++) {
        let div = player_info_box.children[i+1]
        let div_height = Math.min((height - title_height)/(player_info_box.childElementCount-1), (height - title_height)/lower_bound)
        reSizePlayerInfo(div, width, div_height, i == 0, i+2 == player_info_box.childElementCount && i+1 >= lower_bound)
        div.style.top = title_height + div_height*i + 'px'
        
    }
}

function reSizeNextGameButton() {
    let fraction_of_board_size = 0.9
    
    let height = (parseFloat(board.style.height)/5) * fraction_of_board_size - getBorderSize()
    let title_height = height * 0.2
    let width = 2 * (height - title_height) / Math.sqrt(3)
    
    next_game_button.style.width = width + 'px'
    next_game_button.style.height = height + 'px'
    next_game_button.style.left = parseFloat(board.style.left) + parseFloat(board.style.width) - width + 'px'
    
    next_game_button.style.borderWidth = getBorderSize() + 'px'
}