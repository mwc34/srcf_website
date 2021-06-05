function reSize() {
    reSizePlayerInfoBox()
    reSizeActionBox()
    reSizeHandBox()
}

const player_info_percent = 0.25
const action_percent = 0.1
const hand_percent = 0.2

function getBorderSize() {
    return Math.min(window.innerHeight, window.innerWidth)/250
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
    
    let font_size = height/5
    
    let clock_width_fraction = 0.1
    let padding = 0.1
    
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
    let height = window.innerHeight - getBorderSize() * 2
    let title_height = window.innerHeight * action_percent - getBorderSize() * 2
    let width = window.innerWidth * player_info_percent - getBorderSize()*2
    
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

function reSizeActionBox() {
    let height = window.innerHeight * action_percent - getBorderSize()*2
    let width = window.innerWidth * (1 - player_info_percent) - getBorderSize()
    let left = window.innerWidth * player_info_percent
    
    let button_width = width/action_box.childElementCount
    let font_size = height/2.5
    
    action_box.style.left = left + 'px'
    action_box.style.width = width + 'px'
    action_box.style.height = height + 'px'
    action_box.style.borderWidth = getBorderSize() + 'px'
    
    for (let i=0; i<action_box.childElementCount; i++) {
        let div = action_box.children[i]
        div.style.left = getBorderSize() + i*button_width + 'px'
        div.style.width = button_width + 'px'
        div.style.height = height + 'px'
        div.style.fontSize = font_size + 'px'
    }
}

function reSizeHandBox() {
    let height = window.innerHeight * hand_percent - getBorderSize()*2
    let width = window.innerWidth * (1 - player_info_percent) - getBorderSize()
    let left = window.innerWidth * player_info_percent
    let top = window.innerHeight * (1 - hand_percent)
    
    hand_box.style.left = left + 'px'
    hand_box.style.width = width + 'px'
    hand_box.style.height = height + 'px'
    hand_box.style.top = top + 'px'
    
    
}