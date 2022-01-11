function calcPixel(x, y, z) {
    return [((x - camera[X])*(screenZ - camera[Z]))/(z - camera[Z]) + camera[X], ((y - camera[Y])*(screenZ - camera[Z]))/(z - camera[Z]) + camera[Y]];
}

function calcFace(points, rot=null, colour='#FFFFFF', alpha=1) {
    let canvasPoints = [];
    
    let averagePoints = [0, 0, 0];
    
    for (let i=0; i<4; i++) {
        let p = points[i];
        
        if (rot) {
            let cos = Math.cos(rot.r);
            let sin = Math.sin(rot.r);
            
            let tmp = [p[X] - rot.c[X], p[Y] - rot.c[Y], p[Z] - rot.c[Z]];
            
            if (rot.axis == X) {
                tmp  = [tmp[X], tmp[Y]*cos - tmp[Z]*sin, tmp[Y]*sin + tmp[Z]*cos]
            } else if (rot.axis == Y) {
                tmp = [tmp[X]*cos + tmp[Z]*sin, tmp[Y], -tmp[X]*sin + tmp[Z]*cos]
            } else if (rot.axis == Z) {
                tmp = [tmp[X]*cos - tmp[Y]*sin, tmp[X]*sin + tmp[Y]*cos, tmp[Z]]
            }
            
            p = [tmp[X] + rot.c[X], tmp[Y] + rot.c[Y], tmp[Z] + rot.c[Z]];
        }
        
        averagePoints[X] += p[X]
        averagePoints[Y] += p[Y]
        averagePoints[Z] += p[Z]
        
        canvasPoints.push(calcPixel(...p));
    }
    
    return [canvasPoints, averagePoints.map(x => x/4), colour, alpha]
}

function calcCube(x, y, z, r, rot=null, drawAll=false, colour='#FFFFFF', alpha=1) {
    let faces = [];
    
    // Back Face
    if (drawAll) {
        faces.push(
            calcFace([
                [x - r, y - r, z - r],
                [x - r, y + r, z - r],
                [x + r, y + r, z - r],
                [x + r, y - r, z - r],        
            ], rot, colour, alpha)
        );
    }
    
    // Middle Faces
    sign = x > camera[X] ? -1 : 1
    faces.push(
        calcFace([
            [x + sign*r, y - r, z - r],
            [x + sign*r, y - r, z + r],
            [x + sign*r, y + r, z + r],
            [x + sign*r, y + r, z - r],        
        ], rot, colour, alpha)
    );
    
    if (drawAll) {
        faces.push(
            calcFace([
                [x - sign*r, y - r, z - r],
                [x - sign*r, y - r, z + r],
                [x - sign*r, y + r, z + r],
                [x - sign*r, y + r, z - r],        
            ], rot, colour, alpha)
        );        
    }
    
    sign = y > camera[Y] ? -1 : 1
    faces.push(
        calcFace([
            [x - r, y + sign*r, z - r],
            [x - r, y + sign*r, z + r],
            [x + r, y + sign*r, z + r],
            [x + r, y + sign*r, z - r],        
        ], rot, colour, alpha)
    );
     
    if (drawAll) {
        faces.push(
            calcFace([
                [x - r, y - sign*r, z - r],
                [x - r, y - sign*r, z + r],
                [x + r, y - sign*r, z + r],
                [x + r, y - sign*r, z - r],        
            ], rot, colour, alpha)
        );    
    }
     
    // Close Face
    faces.push(
        calcFace([
            [x - r, y - r, z + r],
            [x - r, y + r, z + r],
            [x + r, y + r, z + r],
            [x + r, y - r, z + r],        
        ], rot, colour, alpha)
    );
    
    return faces;
}

function drawFaces(ctx, faces, tol=1) {
    faces.sort((a, b) => {
        let t = (a[1][Z] - b[1][Z]);
        return (Math.abs(t) > tol) ? t : ((b[1][X]-camera[X])**2 + (b[1][Y]-camera[Y])**2 - (a[1][X]-camera[X])**2 - (a[1][Y]-camera[Y])**2)
    });
    
    for (face of faces) {
        let points = face[0];
        ctx.fillStyle = face[2];
        ctx.globalAlpha = face[3];
        ctx.beginPath();
        for (let i=0; i<4; i++) {
            if (!i) {
                ctx.moveTo(...points[i]);
            }
            else {
                ctx.lineTo(...points[i]);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}