const gameCanvas = document.getElementById('gameCanvas');
const gameCtx = gameCanvas.getContext('2d');
const backgroundCanvas = document.createElement('canvas');
const bgCtx = backgroundCanvas.getContext('2d');

const otherGameCanvas = document.getElementById('otherGameCanvas');
const otherGameCtx = otherGameCanvas.getContext('2d');
const otherBackgroundCanvas = document.createElement('canvas');
const otherBgCtx = otherBackgroundCanvas.getContext('2d');

const newGameDiv = document.getElementById('newGame');
const joinGameDiv = document.getElementById('joinGame');

const linesCounter = document.getElementById('linesCounter');
const otherLinesCounter = document.getElementById('otherLinesCounter');

const sideView = document.getElementById('sideView');
const nextCanvas = document.getElementById('nextShape');
const nextCtx = nextCanvas.getContext('2d');

nextCtx.scale(0.25, 0.25);

const socket = io("/3dtris", {autoConnect: false})

const X = 0;
const Y = 1;
const Z = 2;

var penaltyCount = 0;
var shape_idx = 0;
var room_id = null;
var board = [];
var other_board = [];
var other_lines = -1;
var otherCurrentPiece = null;
var playIntro = false;

var lines = 0;
const boardSize = 5;
const boardHeight = 12;
const screenZ = 0;
var radius = null;
var boardZero = null;
var camera = null;
const animationTime = 500;
var baseStepTime = (c) => {
    let times = [
        1000,
        900,
        800,
        700,
        600,
        500,
        400,
        300,
        200,
        100,
    ];
    
    let line_divider = 3;
    
    return times[Math.min(Math.floor(c/line_divider), times.length-1)];
};

var stepTime = baseStepTime(Math.max(lines, other_lines));
const currentColour = '#AAAAAA'
const backColours = [
    '#000000',
    '#000099',
];
const pieceColours = [
    '#00CCCC',
    '#99CC33',
    '#FF9933',
    '#FF0066',
    '#0099CC',
    '#33CC33',
    '#FFCC33',
    '#FF944C',
    '#0066CC',
    '#00CC99',
    '#CCCC33',
    '#FF0000',
];


// PIECE ORDER HARD CODED : I T L S 3L 3R 3X O

var nextShapes = [];
var currentPiece = null;
var nextPiece = null;

window.onresize = () => {
    let size = parseFloat(window.getComputedStyle(gameCanvas).width);
    gameCanvas.width = size;
    gameCanvas.height = size;
    backgroundCanvas.width = size;
    backgroundCanvas.height = size;
    
    radius = size/(2*boardSize);
    boardZero = [radius, radius, radius*(1 - boardHeight*2)];
    camera = [radius*(boardSize), radius*(boardSize), radius*boardHeight];
    
    nextCanvas.width = size;
    nextCanvas.height = size;
    
    otherGameCanvas.width = size;
    otherGameCanvas.height = size;
    otherBackgroundCanvas.width = size;
    otherBackgroundCanvas.height = size;
    
    updateBackground();
    updateBackground(otherBgCtx, otherBackgroundCanvas, other_board, otherCurrentPiece);
    updateForeground(0, otherGameCtx, otherGameCanvas, otherBackgroundCanvas, otherCurrentPiece);
}

function setupKeyEvents() {
    document.body.addEventListener('keydown', (ev) => {
        if (ev.repeat) return
        if (!currentPiece) return
        switch (ev.key) {
            case 'q':
                rotateShape(0, false);
                break;
            case 'a':
                rotateShape(0, true);
                break;
            case 'w':
                rotateShape(1, false);
                break;
            case 's':
                rotateShape(1, true);
                break;
            case 'e':
                rotateShape(2, false);
                break;
            case 'd':
                rotateShape(2, true);
                break;
            
            case 'ArrowUp':
                moveShape(Y, true);
                break;
            case 'ArrowDown':
                moveShape(Y, false);
                break;
            case 'ArrowLeft':
                moveShape(X, true);
                break;
            case 'ArrowRight':
                moveShape(X, false);
                break;
                
            case ' ':
                stepTime = 10;
                break;
        }
    })
}

function joinGame() {
    room_id = prompt('Enter the room ID');
    joinGameDiv.innerHTML = 'Join Game';
    if (socket.connected)
        socket.disconnect();
    
    if (room_id != null)
        socket.connect();
}

function newGame() {
    if (room_id == null) {
        startGame();
    } 
    else {
        newGameDiv.innerHTML = 'Waiting...';
        socket.emit('start game', room_id);
    }
}

function startGame() {
    
    board = [];
    lines = 0;
    penaltyCount = 0;
    other_lines = other_lines >= 0 ? 0 : -1;
    stepTime = baseStepTime(Math.max(lines, other_lines));
    other_board = [];
    otherCurrentPiece = null;
    currentPiece = null;
    shape_idx = 0;
    nextShapes = [];
    createNewShape();
    
    updateBackground();
    
    updateBackground(otherBgCtx, otherBackgroundCanvas, other_board, otherCurrentPiece);
    updateForeground(0, otherGameCtx, otherGameCanvas, otherBackgroundCanvas, otherCurrentPiece);
    
    updateHUD();
}

function setupSideView() {
    for (let i=0; i<boardHeight; i++) {
        let d = document.createElement('div');
        d.style.position = 'absolute';
        d.style.left = '0%';
        d.style.top = 100*(boardHeight-1-i)/boardHeight + '%';
        d.style.width = '100%';
        d.style.height = 100/boardHeight + '%';
        d.style.border = 'solid white 1px';
        d.style.backgroundColor = '';
        sideView.appendChild(d)
    }
}

function main() {
    window.onresize();
    setupKeyEvents();
    setupSideView();
    updateForeground();
}