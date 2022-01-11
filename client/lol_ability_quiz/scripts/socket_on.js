socket.on('connect', () => {
    socket.emit('init', 'lol_ability_quiz');
})

socket.on('player id', (pid) => {
    playerID = pid;
    updateHUD();
})

socket.on('preload', (urls) => {
    for (let s of urls) {
        let i = document.createElement('img');
        i.src = s;
        i.onload = () => {
            requestedLoaded++;
            if (requestedLoaded == urls.length) {
                socket.emit('new player', playerName);
            }
        }
        requestedImages.push(i);
    }
})

socket.on('answer', (lcpi, scoreDelta, correctIdx) => {
    if (lcpi != null) {
        for (let i=0; i<players.length; i++) {
            let p = players[i];
            if (p.player_id == lcpi) {
                let div = playerWrapper.children[i];
                if (scoreDelta > 0) {
                    div.classList.add('correct');
                    div.classList.remove('incorrect');
                }
                else {
                    div.classList.add('incorrect');
                    div.classList.remove('correct');
                }
                if (p.player_id == playerID) {
                    let tmp = scoreDelta > 0 ? 'correct' : 'incorrect';
                    gameWrapper.classList.add(tmp);
                    setTimeout(() => {
                        gameWrapper.classList.remove(tmp);
                    }, 1000);
                }
                break;
            }
        }
    }
        
    if (correctIdx != null) {
        gameAnswers.children[correctIdx].classList.add('correct');
    }
})

socket.on('new question', (qid, q, a) => {
    for (let i=0; i<players.length; i++) {
        let div = playerWrapper.children[i];
        div.classList.remove('correct');
        div.classList.remove('incorrect');
    }
    
    gameQuestion.innerHTML = processAnswerKey(...q);
    
    for (let i=0; i<gameAnswers.childElementCount; i++) {
        gameAnswers.children[i].innerHTML = processAnswerKey(...a[i]);
        gameAnswers.children[i].classList.remove('correct');
    }
    
    questionID = qid;
})

socket.on('update', (state) => {
    players = state;
    updateHUD();
})