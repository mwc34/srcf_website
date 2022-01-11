let rachel = [

    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 0],
    [2, 1],
    [1, 2],
    [2, 3],
    [2, 4],
    
    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],
    [5, 0],
    [5, 2],
    [6, 0],
    [6, 1],
    [6, 2],
    [6, 3],
    [6, 4],
    
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [9, 0],
    [10, 0],
    [9, 4],
    [10, 4],
    
    [12, 0],
    [12, 1],
    [12, 2],
    [12, 3],
    [12, 4],
    [13, 2],
    [14, 0],
    [14, 1],
    [14, 2],
    [14, 3],
    [14, 4],
    
    [16, 0],
    [16, 1],
    [16, 2],
    [16, 3],
    [16, 4],
    [17, 0],
    [17, 2],
    [17, 4],
    [18, 0],
    [18, 2],
    [18, 4],
    
    [20, 0],
    [20, 1],
    [20, 2],
    [20, 3],
    [20, 4],
    [21, 4],
    [22, 4],
]



function intro(rot=0) {
    if (!playIntro) return
    let z = -radius*50;
    // Get background
    gameCtx.globalAlpha = 1.0;
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    gameCtx.drawImage(backgroundCanvas, 0, 0);
    
    let tt = []

    for (i of rachel) {
        tt.push(...calcCube(...boardToSpace([i[0] - 11 + (boardSize-1)/2, i[1] - 2 + (boardSize-1)/2, z]).slice(0, 2), z, radius, {'r' : rot, 'c' : [camera[X], camera[Y], z], 'axis' : Y}, true, 'red', 1))
    }
    
    drawFaces(gameCtx, tt, radius/2);
    
    setTimeout(() => {intro(rot=rot+Math.PI/10)}, 100)
}