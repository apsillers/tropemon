/*
    Copyright (C) 2023 Andrew Sillers

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

var utils = require("./utils.js");
var tropes = require("./tropes.js");
var moves = require("./moves.json");

exports.id = 101;

exports.render = function (req, ctx) {
	if(req.state.dialogPos == 0) {
		var topDialog = " NEW BATTLE   REORDER   MULTIPLAYER  HEAL";
		utils.displayBoxText(ctx, topDialog.replace(new RegExp(`(?<=.{${[0,13,23,36][req.state.cursorPos]}}).`), ">"));
		ctx.fillText('TROPEMON!', 30, 80, 20);

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
		ctx.fillText('👩‍⚕️', 25, 80, 80);
		ctx.fillText('❤️', 10, 65, 30);
		ctx.fillText('❤️', 105, 55, 30);
		
		req.state.cursorPos = 9;
	}
}

exports.process = function(input, req) {
	
	var scenes = require("./scenes.js");
	
	req.state.tropeOpponent = [0];
	
	//message you can dismiss with A to return to top menu
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
			}
			if(req.state.cursorPos == 1) {
				// reorder
				req.state.scene = scenes.TROPE_LIST;
				req.state.dialogPos = 0;
				req.state.cursorPos = 1;
			}
			if(req.state.cursorPos == 2) {
				// multiplayer
				req.state.scene = scenes.MULTIPLAYER;
				req.state.dialogPos = 0;
				req.state.cursorPos = 0;
			}
			if(req.state.cursorPos == 3) {
				// heal
				req.state.dialogPos = 3;
				for(var i=1; i<=6; i++) {
					var trope = tropes.tropeFromState(req.state["trope" + i]);
					if(!trope) { break; }
					trope.hp = trope.maxHP;
					for(var j=0; j<trope.learnedMoves.length; j++) {
						trope["pp"+(j+1)] = moves.find(m=>m.name == trope.learnedMoves[j]).pp;
					}
					req.state["trope"+i] = trope;
				}
			}
			return;
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

			// if you have 2 or fewer tropes, match average; otherwise, beef em up a lil
			if(i <= 3) {
				var opponentLevel = Math.floor(averageLevel);
			} else {
				var opponentLevel = Math.floor(Math.random()*3+averageLevel);
			}
			// random battle
			if(req.state.cursorPos < 3) {
				var trope = tropes.randomTrope(opponentLevel, t=>t.type=="AFS"[req.state.cursorPos])
			} else {
				var trope = tropes.randomTrope(opponentLevel);
			}
			utils.setFirstActiveTrope(req);
			utils.setupCombat(req, trope, "");
		}
	}
	
	if(input == "b") { req.state.dialogPos = 0; req.state.cursorPos = 0; }
}
