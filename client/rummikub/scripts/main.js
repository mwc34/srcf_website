const player_info_box = document.getElementById('playerInfoBox')
const action_box = document.getElementById('actionBox')
const board_box = document.getElementById('boardBox')
const hand_box = document.getElementById('handBox')

const socket = io("/rummikub", {autoConnect: false})

const tile_ratio = 1.5 // Height is tile_ratio * width

var your_hand = {
    'set_id' : -1,
    'tiles' : [],
    'new_idxs' : [],
    'value_remaining' : 30,
}

var player_info = []

var remaining_tiles_count = null
var path_counter = 0
var your_name = null
var game_winner = null
var your_player_id = null
var active_player_id = null
var valid_board = false
var placed_tile = false
var highlighted_tiles = []

var board = [
    [
        {
            'set_id' : 0,
            'tiles' : [['', 0]],
        },
    ]
]

function sortBoard() {
    function binPack(items, W) {
        sorted_items = items.slice().sort((x,y) => y-x)
        bins = [[]]
        for (let item of sorted_items) {
            let b = 0
            while (b < bins.length && bins[b].reduce((x,y) => x+y, 0) + item > W) {
                b++
            }
            if (b == bins.length) {
                bins.push([])
            }
            bins[b].push(item)
        }
        return bins
    }
    
    items = board.reduce(
        (x,y) => {
            x.push(...y.reduce(
                (a,b) => {
                    a.push(b.tiles.length + pad_set_width)
                    return a
                }, []))
            return x
        }, [])
    
    let width = window.innerWidth * (1 - player_info_percent)
    let height = window.innerHeight * (1 - action_percent - hand_percent)
    min_w = Math.ceil(Math.max(...items))
    max_w = Math.ceil(items.reduce((x,y)=>x+y, 0))
    rows = Infinity
    best_bins = null
    
    for (let w=min_w; w<=max_w; w++) {
        bins = binPack(items, w)
        
        r = Math.max(
            bins.length * (1 + pad_set_height),
            Math.ceil((w * height)/(width * tile_ratio))
        )
        
        if (r <= rows) {
            rows = r
            best_bins = bins
        }
        else {
            break
        }
    }
    
    // Rearrange so that a 1 block is at the end (new set placeholder)
    for (let i=best_bins.length-1; i>=0; i--) {
        let b = best_bins[i]
        if (b.includes(1 + pad_set_width)) {
            let j = b.indexOf(1)
            b.splice(j, 1)
            b.push(1 + pad_set_width)
            
            best_bins.splice(i, 1)
            best_bins.push(b)
            
            break
        }
    }
    
    new_board = []
    
    for (let b of best_bins) {
        let row = []
        for (let w of b) {
            let match = false
            for (let i=0; i<board.length; i++) {
                for (let j=0; j<board[i].length; j++) {
                    if (board[i][j].tiles.length == w - pad_set_width) {
                        let t = board[i].splice(j, 1)[0]
                        row.push(t)
                        match = true
                        break
                    }
                }
                if (match) {break}
            }
        }
        new_board.push(row)
    }
    
    board = new_board
    highlighted_tiles = []
    reDrawBoard()
    
}



function main() {
    setup()
    reSize()
    reDraw()
    your_name = window.prompt("Enter your name:")
    socket.connect()
}