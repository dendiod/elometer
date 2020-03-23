var express = require('express');
var app = express();
app.use(express.static("public"));

const jsonParser = express.json();
  
app.post("/user", jsonParser, (request, response) => {	
	console.log(request.body);	
var engine = stockfish();

function uciCmd(cmd, which) {
        console.log("UCI: " + cmd);        
        engine.postMessage(cmd);
}

uciCmd('setoption name Contempt value 0');
let max_err, err_prob, skill = 0;
uciCmd('setoption name Skill Level value ' + skill);			

///NOTE: Stockfish level 20 does not make errors (intentially), so these numbers have no effect on level 20.
/// Level 0 starts at 1
err_prob = Math.round((skill * 6.35) + 1);
/// Level 0 starts at 10
max_err = Math.round((skill * -0.5) + 10);

uciCmd('setoption name Skill Level Maximum Error value ' + max_err);
uciCmd('setoption name Skill Level Probability value ' + err_prob);

uciCmd('ucinewgame');
uciCmd('isready');

function get_moves()
{
        var moves = '';
        
        for(var i = 0; i < history.length - 1; ++i) {
            var move = history[i];
            moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
        }
        if(history.length > 0 && islastEval){
			var move = history[history.length-1];
			moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
		}
        return moves;
}

function getScore(){
		let score;
		if(engineStatus.score.startsWith('Mate')){
			score = parseFloat(engineStatus.score.substr(8));
			if(Math.abs(score) > 3)
				score = (score < 0) ? -4 : 4;
			else
				score = (score < 0) ? -7 - score : 7 - score;
		}
		else
			score = parseFloat(engineStatus.score);
		score = (playerColor == 'white') ? -score : score;
		return score;
}

function runStockfish(){	
		uciCmd('position startpos moves' + get_moves());
		uciCmd('setoption name Clear Hash');
		uciCmd("go depth 15");  
}
	
function getRandomInt(max) {
		return Math.floor(Math.random() * Math.floor(max));	
}

Set.prototype.getByIndex = function(index) { return [...this][index]; } 


	var engineStatus = {};
	var move;
	var playerColor = request.body.playerColor;
	var islastEval = request.body.islastEval;
	var history = request.body.history;
	var bestFor1Move = new Set();
	var goodFor1Move = new Set();
	var scores = [];
    runStockfish();
	
	engine.onmessage = function(event) {
        var line;
        
        if (event && typeof event === "object") {
            line = event.data;
        } else {
            line = event;
        }
        console.log("Reply: " + line)
        if(line == 'uciok') {
            engineStatus.engineLoaded = true;
        } else if(line == 'readyok') {
            engineStatus.engineReady = true;
        } else {
			var match = line.match(/^info depth (\d+) .*\bpv ([a-h][1-8])([a-h][1-8])([qrbn])?/);
			if(islastEval && match && parseInt(match[1]) > 8 && parseInt(match[1]) < 11){
				let move = match[2] + match[3];
				if(match[4])
					move += match[4];
				goodFor1Move.add(move);
			}
			if(islastEval && match && parseInt(match[1]) >= 14){
				let move = match[2] + match[3];
				if(match[4])
					move += match[4];
				bestFor1Move.add(move);
			}
            if (match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/)){	
				scores.push(getScore());
			      if(islastEval){	
					  islastEval = false;				  
			          let playerAdvantage;
			          if(engineStatus.score.startsWith('Mate'))
			          	playerAdvantage = 2;
			          else 
			          	playerAdvantage = (playerColor == 'white') 
			          ? -parseFloat(engineStatus.score) : parseFloat(engineStatus.score);
			          move = playerAdvantage > 1 ? bestFor1Move.getByIndex(getRandomInt(bestFor1Move.size)) : 
					      goodFor1Move.getByIndex(getRandomInt(goodFor1Move.size)); 
						 
					  response.json({"move": move, "bestmove" : bestFor1Move.getByIndex(bestFor1Move.size-1),
					  "scores" : scores});
					  
			      }
			      else{				
					  islastEval = true;
			          runStockfish();
				  }				
				
            /// Is it sending feedback?
            } else if(match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/)) {
                engineStatus.search = 'Depth: ' + match[1] + ' Nps: ' + match[2];
            }
            
            /// Is it sending feed back with a score?
            if(match = line.match(/^info .*\bscore (\w+) (-?\d+)/)) {
				let color = (islastEval && playerColor == 'white') ? 1 : -1;
                var score = parseInt(match[2]) * color;
                /// Is it measuring in centipawns?
                if(match[1] == 'cp') {
                    engineStatus.score = (score / 100.0).toFixed(2);
                /// Did it find a mate?
                } else if(match[1] == 'mate') {
                    engineStatus.score = 'Mate in ' + score;
                }                
                /// Is the score bounded?
                if(match = line.match(/\b(upper|lower)bound\b/)) {
                    engineStatus.score = ((match[1] == 'upper') == (game.turn() == 'w') ? '<= ' : '>= ') + engineStatus.score
                }
            }
        }
    }
});

let port = 8080;
app.listen(port);
console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");

var stockfish = require("./public/stockfish.js");