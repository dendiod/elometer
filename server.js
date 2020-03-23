var express = require('express');
var app = express();
app.use(express.static("public"));
app.use(express.static("node_modules/stockfish/src"));

const jsonParser = express.json();

let stockfishes = [];
let id = 0;
let engineStatuses = [];
let playerColors = [];
let islastEvals = [];
let histories = [];
let bestFor1Move = [];
let goodFor1Move = [];
let scores = [];
app.post("/id", jsonParser, (request, response) => {
	stockfishes.push(stockfish());	
	engineStatuses.push({});
	playerColors.push('');
	islastEvals.push(true);
	histories.push({});
	bestFor1Move.push(new Set());
	goodFor1Move.push(new Set());
	scores.push([]);
	uciCmd('setoption name Contempt value 0', id);
let max_err, err_prob, skill = 0;
uciCmd('setoption name Skill Level value ' + skill, id);			

///NOTE: Stockfish level 20 does not make errors (intentially), so these numbers have no effect on level 20.
/// Level 0 starts at 1
err_prob = Math.round((skill * 6.35) + 1);
/// Level 0 starts at 10
max_err = Math.round((skill * -0.5) + 10);

uciCmd('setoption name Skill Level Maximum Error value ' + max_err, id);
uciCmd('setoption name Skill Level Probability value ' + err_prob, id);

uciCmd('ucinewgame', id);
uciCmd('isready', id);
	response.json({"id": id});
	++id;
});

app.post("/user", jsonParser, (request, response) => {
	let id = request.body.id;
	engineStatuses[id] = {};
	 playerColors[id] = request.body.playerColor;
	 islastEvals[id] = request.body.islastEval;
	 histories[id] = request.body.history;
	 bestFor1Move[id].clear();
	 goodFor1Move[id].clear();
	 scores[id] = [];
    runStockfish(histories[id], islastEvals[id], id);
	
	stockfishes[id].onmessage = function(event) {
        var line;
        
        if (event && typeof event === "object") {
            line = event.data;
        } else {
            line = event;
        }
        console.log("Reply: " + line)
        if(line == 'uciok') {
            engineStatuses[id].engineLoaded = true;
        } else if(line == 'readyok') {
            engineStatuses[id].engineReady = true;
        } else {
			var match = line.match(/^info depth (\d+) .*\bpv ([a-h][1-8])([a-h][1-8])([qrbn])?/);
			if(islastEvals[id] && match && parseInt(match[1]) > 8 && parseInt(match[1]) < 11){
				let move = match[2] + match[3];
				if(match[4])
					move += match[4];
				goodFor1Move[id].add(move);
			}
			if(islastEvals[id] && match && parseInt(match[1]) >= 14){
				let move = match[2] + match[3];
				if(match[4])
					move += match[4];
				bestFor1Move[id].add(move);
			}
            if (match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/)){	
				scores[id].push(getScore(engineStatuses[id].score, playerColors[id]));
			      if(islastEvals[id]){	
					  islastEvals[id] = false;				  
			          let playerAdvantage;
			          if(engineStatuses[id].score.startsWith('Mate'))
			          	playerAdvantage = 2;
			          else 
			          	playerAdvantage = (playerColors[id] == 'white') 
			          ? -parseFloat(engineStatuses[id].score) : parseFloat(engineStatuses[id].score);
			          let move = playerAdvantage > 1 ? bestFor1Move[id].getByIndex(getRandomInt(bestFor1Move[id].size)) : 
					      goodFor1Move[id].getByIndex(getRandomInt(goodFor1Move[id].size)); 
						 
					  response.json({"move": move, "bestmove" : bestFor1Move[id].getByIndex(bestFor1Move[id].size-1),
					  "scores" : scores[id]});
					  
			      }
			      else{				
					  islastEvals[id] = true;
			          runStockfish(histories[id], islastEvals[id], id);
				  }				
				
         
            } 
            
            /// Is it sending feed back with a score?
            if(match = line.match(/^info .*\bscore (\w+) (-?\d+)/)) {
				let color = (islastEvals[id] && playerColors[id] == 'white' || 
				!islastEvals[id] && playerColors[id] != 'white') ? 1 : -1;
                let score = parseInt(match[2]) * color;
                /// Is it measuring in centipawns?
                if(match[1] == 'cp') {
                    engineStatuses[id].score = (score / 100.0).toFixed(2);
                /// Did it find a mate?
                } else if(match[1] == 'mate') {
                    engineStatuses[id].score = 'Mate in ' + score;
                }   
            }
        }
    }
});

function uciCmd(cmd, id) {
        console.log("UCI: " + cmd);        
        stockfishes[id].postMessage(cmd);
}

function get_moves(history, islastEval)
{
        let moves = '';
        
        for(let i = 0; i < history.length - 1; ++i) {
            let move = history[i];
            moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
        }
        if(history.length > 0 && islastEval){
			let move = history[history.length-1];
			moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
		}
        return moves;
}

function getScore(engineStatus, playerColor){
		let score;
		if(engineStatus.startsWith('Mate')){
			score = parseFloat(engineStatus.substr(8));
			if(Math.abs(score) > 3)
				score = (score < 0) ? -4 : 4;
			else
				score = (score < 0) ? -7 - score : 7 - score;
		}
		else
			score = parseFloat(engineStatus);
		score = (playerColor == 'white') ? -score : score;
		return score;
}

function runStockfish(history, islastEval, id){	
		uciCmd('position startpos moves' + get_moves(history, islastEval), id);
		uciCmd('setoption name Clear Hash', id);
		uciCmd("go depth 15", id);  
}

function getRandomInt(max) {
		return Math.floor(Math.random() * Math.floor(max));	
}

Set.prototype.getByIndex = function(index) { return [...this][index]; } 

let port = 8080;
app.listen(port);
console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");

var stockfish = require("./node_modules/stockfish/src/stockfish.js");