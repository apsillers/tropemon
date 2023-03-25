var utils = require("./utils.js");
var tropes = require("./tropes.js");

exports.id = 101;

exports.render = function (req, ctx) {
	if(req.state.dialogPos == 0) {
	    var topDialog = " NEW BATTLE   REORDER   MULTIPLAYER  HEAL";
	    utils.displayBoxText(ctx, topDialog.replace(new RegExp(`(?<=.{${[0,13,23,36][req.state.cursorPos]}}).`), ">"));
	}
	if(req.state.dialogPos == 1) {
		var anyAlive = false;
		for(var i=1; i<=6; i++) {
			var trope = tropes.tropeFromState(req.state["trope" + i]);
			if(!trope) { break; }
			if(trope.hp > 0) { anyAlive = true; }
		}
		if(!anyAlive) {
			utils.displayBoxText(ctx, "You need to HEAL your tropes first!");
			req.state.cursorPos = 9;
			return;
		}
		var topDialog = " ANGST        FLUFF     SMUT         RANDOM";
	    utils.displayBoxText(ctx, topDialog.replace(new RegExp(`(?<=.{${[0,13,23,36][req.state.cursorPos]}}).`), ">"));
	}
	
	if(req.state.dialogPos == 3) {
		utils.displayBoxText(ctx, "Our betas have patched your tropes all up, good as new!");
		req.state.cursorPos = 9;
	}
}

exports.process = function(input, req) {
	var scenes = require("./scenes.js");
	//message you cna dismiss with A to return to top menu
	if(req.state.cursorPos == 9) {
		if(input == "a") {
			req.state.dialogPos = 0;
			req.state.cursorPos = 0;
		}
		return;
	}
	
	utils.fourCornerPos(input, req);
	if(input == "a") {
		if(req.state.dialogPos == 0) {
			if(req.state.cursorPos == 0) {
				req.state.dialogPos = 1;
				return;
			}
			if(req.state.cursorPos == 1) {
				// reorder
				req.state.scene = scenes.TROPE_LIST;
				req.state.dialogPos = 0;
				req.state.cursorPos = 1;
			}
			if(req.state.cursorPos == 2) {
				// multiplayer
			}
			if(req.state.cursorPos == 3) {
				req.state.dialogPos = 3;
				for(var i=1; i<=6; i++) {
					var trope = tropes.tropeFromState(req.state["trope" + i]);
					if(!trope) { break; }
					trope.hp = trope.maxHP;
					for(var j=0; j<trope.learnedMoves.length; j++) {
						trope["pp"+(j+1)] = trope.learnedMoves[j].pp;
					}
					req.state["trope"+i] = trope;
				}
			}
		}
		if(req.state.dialogPos == 1) {
			// pick a level between 0-4 levels above your team's average level
			var averageLevel = 0;
			for(var i=1; i<=6; i++) {
				var trope = tropes.tropeFromState(req.state["trope" + i]);
				if(!trope) { break; }
				averageLevel += trope.level;
			}
			averageLevel /= i-1;
			var opponentLevel = Math.floor(Math.random()*5+averageLevel);
			
			// random battle
			if(req.state.cursorPos < 3) {
				var trope = tropes.randomTrope(opponentLevel, t=>t.type=="AFS"[req.state.cursorPos])
			} else {
				var trope = tropes.randomTrope(opponentLevel);
			}
			req.state.tropeOpponent = trope;
			req.state.scene = scenes.BATTLE_TOP;
			req.state.dialogPos = 0;
		}
	}
	
	if(input == "b") { req.state.dialogPos = 0; req.state.cursorPos = 0; }
}