const board = document.getElementById('boardBox')
const square = document.getElementById('square')
const curr_tile_box = document.getElementById('currTileBox')
const remaining_tiles_box = document.getElementById('remainingTilesBox')
const player_info_box = document.getElementById('playerInfoBox')
const next_game_button = document.getElementById('nextGameButton')
const socket = io({autoConnect: false})
var size = Math.min(window.innerWidth, window.innerHeight)
var curr_tile = null
var your_name = null
var your_player_id = null
var board_player_id = null
var game_state = []
var path_counter = 0
var hover_idx = null
const total_tiles = [
    [3, 2, 1],
    [3, 6, 1],
    [3, 7, 1],
    [4, 2, 1],
    [4, 6, 1],
    [4, 7, 1],
    [8, 2, 1],
    [8, 6, 1],
    [8, 7, 1],
    [3, 2, 5],
    [3, 6, 5],
    [3, 7, 5],
    [4, 2, 5],
    [4, 6, 5],
    [4, 7, 5],
    [8, 2, 5],
    [8, 6, 5],
    [8, 7, 5],
    [3, 2, 9],
    [3, 6, 9],
    [3, 7, 9],
    [4, 2, 9],
    [4, 6, 9],
    [4, 7, 9],
    [8, 2, 9],
    [8, 6, 9],
    [8, 7, 9],
]
var remaining_tiles = [].concat(total_tiles)

const scoring_lines = [
    [[2,6,11],[1,5,10,15],[0,4,9,14,18],[3,8,13,17],[7,12,16]],
    [[0,3,7],[1,4,8,12],[2,5,9,13,16],[6,10,14,17],[11,15,18]],
    [[0,1,2],[3,4,5,6],[7,8,9,10,11],[12,13,14,15],[16,17,18]],
]

const next_to = [
    [3,4,1],
    [0,4,5,2],
    [1,5,6],
    [0,4,8,7],
    [0,1,5,9,8,3],
    [1,2,6,10,9,4],
    [11,10,5,2],
    [3,8,12],
    [3,4,9,13,12,7],
    [4,5,10,14,13,8],
    [5,6,11,15,14,9],
    [15,10,6],
    [7,8,13,16],
    [8,9,14,17,16,12],
    [9,10,15,18,17,13],
    [18,14,10,11],
    [12,13,17],
    [16,13,14,18],
    [17,14,15]
]

function getScore(state) {
    if (!state) {
        return ''
    }
    
    let total = 0
    for (let i=0; i<3; i++) {
        for (let j=0; j<5; j++) {
            let value = null
            for (let k of scoring_lines[i][j]) {
                if (state[k] && (value == null || value == state[k][i])) {
                    value = state[k][i]
                }
                else {
                    value = null
                    break
                }
            }
            if (value) {
                total += scoring_lines[i][j].length * value
            }
        }
    }
    
    return total
}

function main() {
    setup()
    style()
    reSize()
    reDraw()
    your_name = window.prompt("Enter your name:")
    reDrawPlayerInfoBox()
    socket.connect()
}