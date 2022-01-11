socket.on('connect', () => {
    socket.emit('init', '3dtris')
    socket.emit('new player', room_id)
    room_id = null;
})

socket.on('new player', (id, room) => {
    room_id = id;
    joinGameDiv.innerHTML = `Join Game (${room_id})`
    if (room.length > 1) {
        other_lines = 0;
    }
    else {
        other_lines = -1;
    }
    board = [];
    currentPiece = null;
    lines = 0;
    other_board = [];
    otherCurrentPiece = null;
    updateBackground();
    updateBackground(otherBgCtx, otherBackgroundCanvas, other_board, otherCurrentPiece);
    updateForeground(0, otherGameCtx, otherGameCanvas, otherBackgroundCanvas);
    updateHUD();
})

socket.on('start game', () => {
    newGameDiv.innerHTML = 'New Game'
    startGame();
})

socket.on('get shape idx', (idx, nextIdx) => {
    shape_idx++;
    if (currentPiece == null) {
        currentPiece = getShape(idx);
    }
    else {
        currentPiece = getShape(idx);
    }
    nextPiece = getShape(nextIdx);
    updateNextShape();
})

socket.on('update', (other_player) => {
    other_lines = other_player.lines;
    other_board = other_player.board_state;
    otherCurrentPiece = other_player.curr_piece;
    updateBackground(otherBgCtx, otherBackgroundCanvas, other_board, otherCurrentPiece);
    updateForeground(0, otherGameCtx, otherGameCanvas, otherBackgroundCanvas, otherCurrentPiece);
    updateHUD();
})

socket.on('penalty', (c) => {
    penaltyCount = c;
})

socket.on('game over', () => {
    currentPiece = null;
    otherCurrentPiece = null;
})

socket.on('left', () => {
    other_lines = -1;
    updateHUD();
})