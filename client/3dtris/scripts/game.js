function boardToSpace(coord) {
    return  [
        boardZero[X] + coord[X] * radius * 2,
        boardZero[Y] + coord[Y] * radius * 2,
        boardZero[Z] + coord[Z] * radius * 2
    ]
}

function getShape(idx) {
    let c = Math.floor(boardSize/2);
    let h = boardHeight;
    
    let currentPiece = {}
    
    currentPiece.time = (new Date()).getTime();
    
    currentPiece.center = () => currentPiece.tiles[0]

    switch (idx) {
        // I
        case 0:
            currentPiece.tiles = [
                [c, c, h],
                [c-2, c, h],
                [c-1, c, h],
                [c+1, c, h],
            ];
            break
        // T
        case 1:
            currentPiece.tiles = [
                [c, c, h],
                [c-1, c, h],
                [c+1, c, h],
                [c, c+1, h],
            ];
            break
        // L
        case 2:
            currentPiece.tiles = [
                [c, c, h],
                [c+1, c, h],
                [c-1, c, h],
                [c-1, c+1, h],
            ];
            break
        // S
        case 3:
            currentPiece.tiles = [
                [c, c, h],
                [c+1, c, h],
                [c, c-1, h],
                [c-1, c-1, h],
            ];
            break
        // 3L
        case 4:
            currentPiece.tiles = [
                [c, c, h],
                [c, c-1, h],
                [c+1, c-1, h],
                [c, c, h+1],
            ];
            break
        // 3R
        case 5:
            currentPiece.tiles = [
                [c, c, h],
                [c, c-1, h],
                [c-1, c-1, h],
                [c, c, h+1],
            ];
            break
        // 3X
        case 6:
            currentPiece.tiles = [
                [c, c, h],
                [c, c, h+1],
                [c+1, c, h],
                [c, c-1, h],
            ];
            break
        // O
        case 7:
            currentPiece.tiles = [
                [c, c, h],
                [c, c-1, h],
                [c-1, c, h],
                [c-1, c-1, h],
            ];
            break
        
    }
    
    return currentPiece;
}

function createNewShape() {
    let shape = null;
    stepTime = baseStepTime(Math.max(lines, other_lines));
    if (room_id == null) {
        if (nextShapes.length <= 1) {
            nextShapes.push(...[...Array(8).keys()].sort(() => Math.random() - 0.5));
        }
        shape = nextShapes.splice(0, 1)[0];
        
        nextPiece = getShape(nextShapes[0]);
    
        shape_idx++;
        
        currentPiece = getShape(shape);
        
        updateNextShape();
    
    }
    else {
        socket.emit('get shape idx', room_id, shape_idx)
    }
    
    
}

function rotateShape(axis, reverse=false) {
    let c = currentPiece.center(axis);
    let sign = reverse ? 1 : -1
    
    let tmp = [];
    for (let i=0; i<4; i++) {
        let t = currentPiece.tiles[i];
        
        t = [
            t[X] - c[X],
            t[Y] - c[Y],
            t[Z] - c[Z],
        ];
        
        let cos = Math.cos(sign * Math.PI/2);
        let sin = Math.sin(sign * Math.PI/2);
        
        if (axis == X) {
            t = [
                t[X],
                t[Y]*cos - t[Z]*sin,
                t[Y]*sin + t[Z]*cos,
            ];
        }
        else if (axis == Y) {
            t = [
                t[X]*cos + t[Z]*sin,
                t[Y],
                -t[X]*sin + t[Z]*cos,
            ];
        }
        else if (axis == Z) {
            t = [
                t[X]*cos - t[Y]*sin,
                t[X]*sin + t[Y]*cos,
                t[Z],
            ];
        }

        t = [
            Math.round(t[X] + c[X]),
            Math.round(t[Y] + c[Y]),
            Math.round(t[Z] + c[Z]),
        ];
        
        tmp.push(t);
    }
    
    // Snap somewhere else
    let out = [];
    for (let i=0; i<4; i++) {
        let p = tmp[i];
        if (p[X] < 0 || p[Y] < 0 
                     || p[X] >= boardSize 
                     || p[Y] >= boardSize
                     || (board.length > p[Z] && board[p[Z]][p[Y]][p[X]])) {
            out.push(i);
        }
    }
    
    // Try to push once
    if (out.length) {
        let p = tmp[out[0]];
        let d = [
            c[X] - p[X],
            c[Y] - p[Y],
            c[Z] - p[Z],
        ];

        d = [
            d[X] ? (d[X] > 0 ? 1 : -1) : 0,
            d[Y] ? (d[Y] > 0 ? 1 : -1) : 0,
            d[Z] ? (d[Z] > 0 ? 1 : -1) : 0,
        ];

        for (let t of tmp) {
            t[X] += d[X];
            t[Y] += d[Y];
            t[Z] += d[Z];
        }
    }
    
    // Check valid
    for (let i=0; i<4; i++) {
        let p = tmp[i];
        if (p[X] < 0 || p[Y] < 0 
                     || p[X] >= boardSize 
                     || p[Y] >= boardSize
                     || (board.length > p[Z] && board[p[Z]][p[Y]][p[X]])) {
            return
        }
    }
    
    currentPiece.rot = {
        'r' : null,
        'c' : null,
        'axis' : axis,
        'sign' : sign,
        'time' : (new Date()).getTime(),
    }
    currentPiece.tiles = tmp;
    updateBackground();
}

function stepShape() {
    let tmp = [];
    for (let t of currentPiece.tiles) {
        let p = [
            t[X],
            t[Y],
            t[Z] - 1
        ];
        if (p[Z] < 0) break
        if (board.length > p[Z] && board[p[Z]][p[Y]][p[X]]) break
        tmp.push(p);
    }
    
    if (tmp.length == 4) {
        currentPiece.tiles = tmp
        currentPiece.time = (new Date()).getTime();
    }
    else {
        for (let t of currentPiece.tiles) {
            while (board.length <= t[Z]) {
                board.push(new Array(boardSize).fill(null));
                for (let i=0; i<boardSize; i++) {
                    board[board.length-1][i] = new Array(boardSize).fill(false);
                }
            }
            board[t[Z]][t[Y]][t[X]] = true;
        }
        let newLines = new Set();
        for (let t of currentPiece.tiles) {
            let count = board[t[Z]].reduce((a, b) => a + b.reduce((x, y) => x + y), 0)
            if (count == boardSize**2) {
                newLines.add(t[Z])
            }
        }
        if (newLines.size) {
            for (let z of Array.from(newLines).sort().reverse()) {
                board.splice(z, 1);
                lines += 1;
            }
        }
        
        if (room_id != null && newLines.size >= 2) {
            let count = [0, 0, 0, 0, 1][newLines.size];
            socket.emit('penalty', room_id, count);
        }
        
        for (let i=0; i<penaltyCount; i++) {
            let layer = [];
            let added = 0;
            for (let y=0; y<boardSize; y++) {
                let row = [];
                for (let x=0; x<boardSize; x++) {
                    let t = Math.random() > 0.5 ? true : false
                    if (t)
                        added++
                    row.push(t);
                }
                layer.push(row);
            }
            if (!added || added == boardSize**2) {
                let row = Math.floor(Math.random() * 5)
                let col = Math.floor(Math.random() * 5)
                layer[row][col] = !added;
            }
            board.splice(0, 0, layer)
        }
        
        penaltyCount = 0;
        
        if (board.length > boardHeight) {
            currentPiece = null;
            if (room_id != null) {
                socket.emit('dead', room_id)
            }
        }
        else {
            currentPiece = null;
            createNewShape();
        }

        if (room_id != null)
            socket.emit('update', room_id, board, currentPiece, lines);
        
        updateBackground();
    }
    
    updateHUD();
    
}

function moveShape(axis, reverse=false) {
    let tmp = [];
    
    for (let t of currentPiece.tiles) {
        let v = t[axis] + (reverse ? -1 : 1)
        if (v < 0 || v >= boardSize) return
        
        let p = [
            t[X],
            t[Y],
            t[Z],
        ];
        
        p[axis] = v;
        
        if (board.length > p[Z] && board[p[Z]][p[Y]][p[X]]) return
        tmp.push(p);
    }
    
    currentPiece.tiles = tmp;
    updateBackground();
    
}

function updateForeground(firstArg, ctx=gameCtx, canvas=gameCanvas, backCanvas=backgroundCanvas, currPiece=currentPiece) {
    let t = (new Date()).getTime();
    
    // Step Down
    if (currPiece && t - currPiece.time > stepTime) {
        stepShape()
    }
    
    // Get background
    if (!playIntro) {
        ctx.globalAlpha = 1.0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(backCanvas, 0, 0);
    }
        
    if (currPiece && !playIntro) {
        // Rotate Animation
        if (currPiece.rot) {
            t = (t - currPiece.rot.time)/animationTime;
            if (t > 1) {
                currPiece.rot = null;
            }
            else {
                currPiece.rot.r = (t - 1) * currPiece.rot.sign * Math.PI/2;
                currPiece.rot.c = boardToSpace(currPiece.center(currPiece.rot.axis));
            }
        }
        
        let faces = [];
        
        for (let t of currPiece.tiles) {
            faces.push(...calcCube(
                ...boardToSpace(t),
                radius,
                currPiece.rot,
                true,
                currentColour,
                0.5
            ));
        }
        
        drawFaces(ctx, faces, tol=radius/2);
    }
    
    if (firstArg != 0)
        window.requestAnimationFrame(updateForeground);
}

function updateBackground(backCtx=bgCtx, backCanvas=backgroundCanvas, b=board, currPiece=currentPiece) {
    backCtx.clearRect(0, 0, backCanvas.width, backCanvas.height);
    
    // Walls
    let faces = [];
    
    // Floor
    for (let y=0; y<boardSize; y++) {
        for (let x=0; x<boardSize; x++) {
            faces.push(
                calcFace([
                    boardToSpace([x - 0.5, y - 0.5, 0]),
                    boardToSpace([x - 0.5, y + 0.5, 0]),
                    boardToSpace([x + 0.5, y + 0.5, 0]),
                    boardToSpace([x + 0.5, y - 0.5, 0]),
                ], null, backColours[(y + x) % 2])
            );
        }
    }
    
    // Sides
    for (let z=0; z<boardHeight; z++) {
        for (let y=0; y<boardSize; y++) {
            for (let x of [-0.5, boardSize-0.5]) {
                faces.push(
                    calcFace([
                        boardToSpace([x, y - 0.5, z - 0.5]),
                        boardToSpace([x, y - 0.5, z + 0.5]),
                        boardToSpace([x, y + 0.5, z + 0.5]),
                        boardToSpace([x, y + 0.5, z - 0.5]),
                    ], null, backColours[(2 + x + 0.5 + (x > 0) + y + z) % 2])
                );
                faces.push(
                    calcFace([
                        boardToSpace([y - 0.5, x, z - 0.5]),
                        boardToSpace([y - 0.5, x, z + 0.5]),
                        boardToSpace([y + 0.5, x, z + 0.5]),
                        boardToSpace([y + 0.5, x, z - 0.5]),
                    ], null, backColours[(2 + x - 0.5 + (x > 0) + y + z) % 2])
                );
            }
        }
    }
    
    // Pieces
    for (let z=0; z<b.length; z++) {
        let level = b[z];
        for (let y=0; y<level.length; y++) {
            let row = level[y];
            for (let x=0; x<row.length; x++) {
                let col = row[x];
                
                if (col) {
                    faces.push(...calcCube(
                        ...boardToSpace([x, y, z]),
                        radius,
                        null,
                        false,
                        pieceColours[z]
                    ));
                }
                
            }
        }
    }
    
    
    
    // Shadows
    if (currPiece) {
        let highestZ = 0;
        for (let t of currPiece.tiles) {
            // Shadow
            let z = t[Z];
            while (z > 0 && (board.length <= z || !board[z][t[Y]][t[X]])) {
                z--;
            }
            
            highestZ = Math.max(highestZ, z);
        }
        
        for (let t of currPiece.tiles) {
            faces.push(calcFace([
                boardToSpace([t[X]-0.5, t[Y]-0.5, highestZ+0.6]),
                boardToSpace([t[X]-0.5, t[Y]+0.5, highestZ+0.6]),
                boardToSpace([t[X]+0.5, t[Y]+0.5, highestZ+0.6]),
                boardToSpace([t[X]+0.5, t[Y]-0.5, highestZ+0.6]),
            ], null, '#FFFFFF', 0.5));
        }
    }
    
    drawFaces(backCtx, faces, tol=radius/2);
}

function updateHUD() {
    if (other_lines < 0) {
        otherLinesCounter.style.visibility = 'hidden';
        otherGameCanvas.style.visibility = 'hidden';
    }
    else {
        otherLinesCounter.style.visibility = 'visible';
        otherGameCanvas.style.visibility = 'visible';
    }
    
    linesCounter.innerHTML = `Lines: ${lines}`
    otherLinesCounter.innerHTML = `Lines : ${other_lines}`
    for (let i=0; i<boardHeight; i++) {
        if (board.length > i) {
            sideView.children[i].style.backgroundColor = pieceColours[i];
        }
        else {
            sideView.children[i].style.backgroundColor = '#000000';
        }
        sideView.children[i].style.opacity = 1.0;
    }
    if (!currentPiece) return
    for (let t of currentPiece.tiles) {
        if (t[Z] < boardHeight) {
            sideView.children[t[Z]].style.opacity = 0.5;
        }
    }
}

function updateNextShape() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.lineWidth = 5;
    let faces = [];
    
    let shape = nextPiece;
    
    for (let t of shape.tiles) {
        faces.push(...calcCube(
            ...boardToSpace(t),
            radius,
            {'r' : -Math.PI/4, 'axis' : Y, 'c' : boardToSpace(shape.tiles[0])},
            true,
            'purple'
        ));
    }
    
    drawFaces(nextCtx, faces, tol=radius/2);
}






