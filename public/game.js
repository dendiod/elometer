function play(options) {
    options = options || {}
    var game = new Chess();
    var board;
    var engineStatus = {};
    var time = { wtime: 300000, btime: 300000, winc: 2000, binc: 2000 };
    var playerColor = 'white';
    var clockTimeoutID = null;
	let evals;
	let bestmoves;
	let islastEval;
	let gameResult;
	let isEngineRunning;
    var announced_game_over;
    // do not pick up pieces if the game is over
    // only pick up pieces for White
    var onDragStart = function(source, piece, position, orientation) {
        var re = playerColor == 'white' ? /^b/ : /^w/
            if (announced_game_over ||
                piece.search(re) !== -1) {
                return false;
            }
    };
      

    function displayClock(color, t) {
        var isRunning = false;
        if(time.startTime > 0 && color == time.clockColor) {
            t = Math.max(0, t + time.startTime - Date.now());
            isRunning = true;
        }
        var id = color == playerColor ? '#time2' : '#time1';
        var sec = Math.ceil(t / 1000);
        var min = Math.floor(sec / 60);
        sec -= min * 60;
        var hours = Math.floor(min / 60);
        min -= hours * 60;
        var display = hours + ':' + ('0' + min).slice(-2) + ':' + ('0' + sec).slice(-2);
        if(isRunning) {
            display += sec & 1 ? ' <--' : ' <-';
        }
        $(id).text(display);
		if(min == 0 && sec == 0){
			announced_game_over = true;
			gameResult = 'lost on time';
			finishGame();			
		}
    }

    function updateClock() {
        displayClock('white', time.wtime);
        displayClock('black', time.btime);
    }

    function clockTick() {
		if(announced_game_over)
			return;		
        updateClock();
        var t = (time.clockColor == 'white' ? time.wtime : time.btime) + time.startTime - Date.now();
        var timeToNextSecond = (t % 1000) + 1;
        clockTimeoutID = setTimeout(clockTick, timeToNextSecond);
    }

    function stopClock() {
        if(clockTimeoutID !== null) {
            clearTimeout(clockTimeoutID);
            clockTimeoutID = null;
        }
        if(time.startTime > 0) {
            var elapsed = Date.now() - time.startTime;
            time.startTime = null;
            if(time.clockColor == 'white') {
                time.wtime = Math.max(0, time.wtime - elapsed);
            } else {
                time.btime = Math.max(0, time.btime - elapsed);
            }
        }
    }

    function startClock() {
        if(game.turn() == 'w') {
            time.wtime += time.winc;
            time.clockColor = 'white';
        } else {
            time.btime += time.binc;
            time.clockColor = 'black';
        }
        time.startTime = Date.now();
        clockTick();
    }    
	
	function getBestPlayedCoef(startIndex){
		let curHistory = game.history({verbose: true});
		let bestPlayedCoef = 0;
		for(let i = startIndex; i < evals.length; i+=2){ 		
			let curMove = curHistory[i-1];
			let move = curMove.from + curMove.to;			
			if(curMove.promotion)
				move +=  curMove.promotion;
			if(bestmoves[(i-1) / 2] != move){	
				console.log(evals[i-1] + ' ' + evals[i] + ' ' + i);			
				bestPlayedCoef += evals[i] - evals[i-1];			
			}
		}
		return bestPlayedCoef.toPrecision(3) + 10;
	}		
	
	function checkAdvantage(){
		if(evals.length > 0){
			if(evals[evals.length-1] < -5 ||
			evals.length > 1 &&			  
			   evals[evals.length-2] > 5 && evals[evals.length-1] > 5)
				   announced_game_over = true;
		}
	}
	
	
	 function finishGame(){		         
		let bestPlayedCoef = playerColor == 'white' ? getBestPlayedCoef(1) : getBestPlayedCoef(2);		
		let output = "";
		let advantageCoef;
		if(game.game_over()){
			if(game.in_checkmate()){
				var turn = game.turn() == 'w' ? 'white' : 'black';
				if(turn == playerColor){
					output = "Checkmate! You lost!";
					advantageCoef = -5;
				}
				else{
					output = "Checkmate! You won!";	
					advantageCoef = 5;
				}					
			}		
			else{
				if(game.in_threefold_repetition())
					output = "Three fold repetition";
				else if(game.insufficient_material())
					output = "Draw! Insufficient material";
				else if(game.in_stalemate())
					output = "Stalemate!";		
				else
					output = "Draw! 50-move rule";	
				advantageCoef = 0;
			}
		}
		else{
			if(gameResult == 'resigned'){
				output = "You resigned";
				advantageCoef = -5;
			}	
			else if(gameResult == 'lost on time'){
				output = "You lost on time";
				advantageCoef = -5;
			}
			else{
				let score = evals[evals.length-1];
				if(Math.abs(score) > 5){				
					if(score < -5){
						output = "You will lose soon";
						advantageCoef = -5;
					}
					else{
						output = "You will win soon";	
						advantageCoef = 5;
					}						
				}
				else
					advantageCoef = score;
			}
		}			
		let movesCoef = advantageCoef == 0 ? 0 : (100.0 / parseInt(((game.history().length + 1) / 2))).toPrecision(3);
		if(advantageCoef < 0)
			movesCoef = -movesCoef;
		console.log("bestPlayedCoef " + bestPlayedCoef + " moves " + movesCoef + " koef " + advantageCoef); 
		
		// using coefs from neural network
		let x = 0.0108 * bestPlayedCoef + 0.1196 * movesCoef + 0.0073 * advantageCoef;
		let elo = parseInt(5000.0 / (1 + Math.exp(-x))) - 123;
		if(playerColor != 'white')
			elo += 30;
		output += '\nYour elo ';
		output += elo < 900 ? 'is less than 900' : elo;
		document.getElementById("resignBtn").disabled = true;
		alert(output);		     
	}	

    async function prepareMove() {		
		document.getElementById("resignLabel").innerHTML = "";
		var turn = game.turn() == 'w' ? 'white' : 'black';		
        stopClock();
        $('#pgn').text(game.pgn());
        board.position(game.fen());		
        updateClock();
		checkAdvantage();
		let curHistory = game.history({verbose: true});
		if(curHistory.length == 102 && playerColor == 'white' ||
		   curHistory.length == 101 && playerColor != 'white')
				announced_game_over = true;
		if(announced_game_over || game.game_over()){
			await new Promise(r => setTimeout(r, 250));
			finishGame();
			return;
		}
        if(turn != playerColor) {
			isEngineRunning = true;
            let user = JSON.stringify({id: id, playerColor: playerColor,
			islastEval: islastEval, 
			history: curHistory});			
            let request = new XMLHttpRequest();
             request.open("POST", "/user", true); 
	     request.onerror = function () {
		 stopClock();   
		 alert("Connection with server failed");
		 return;
	     };	
             request.setRequestHeader("Content-Type", "application/json");
             request.addEventListener("load", function () {
                 let receivedUser = JSON.parse(request.response);
				 let move = receivedUser.move;
				 game.move({from: move.substr(0, 2), to: move.substr(2, 2), promotion: move[4]});
				 if(receivedUser.bestmove)
					 bestmoves.push(receivedUser.bestmove);
				 evals.push(receivedUser.scores[0]);
				 if(receivedUser.scores[1])
					 evals.push(receivedUser.scores[1]);
				 isEngineRunning = false;
				 islastEval = false;
				 prepareMove();
             });
             request.send(user);			
		}			
        if(game.history().length > 0 && !time.depth && !time.nodes) {
             startClock();
        }        		
    }

    var onDrop = function(source, target) {
        // see if the move is legal
        var move = game.move({
            from: source,
            to: target,
            promotion: document.getElementById("promote").value
        });

        // illegal move
        if (move === null) return 'snapback';
		document.getElementById("resignBtn").disabled = false;
        prepareMove();
    };

    // update the board position after the piece snap
    // for castling, en passant, pawn promotion
    var onSnapEnd = function() {
        board.position(game.fen());
    };

    var cfg = {
        showErrors: true,
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    };

    board = new ChessBoard('board', cfg);

    return {
        reset: function() {
            game.reset();
        },
		resign: function() {
			announced_game_over = true;
			gameResult = 'resigned';
			document.getElementById("resignLabel").innerHTML = "Waiting for elo...";
			if(!isEngineRunning)
				prepareMove();
		},
        setPlayerColor: function(color) {
            playerColor = color;
            board.orientation(playerColor);
        },        
        setTime: function(baseTime, inc) {
            time = { wtime: baseTime * 1000, btime: baseTime * 1000, winc: inc * 1000, binc: inc * 1000 };
        },        
        start: function() {            
            engineStatus.engineReady = false;
            engineStatus.search = null; 
			bestmoves = [];
			evals = [];			
			gameResult = '';
			islastEval = (playerColor == 'white') ? false : true;
			announced_game_over = false;    
			prepareMove();			         
        }
    };
}
