var state = require("./state.js");
var utils = require("./utils.js");
var tropes = require("./tropes.js");
var moves = require("./moves.json");

exports.drawCombat = function drawCombat(req, ctx) {
	if(req.state.dialogPos == 10) {
		utils.displayBoxText(ctx, "Hey, you can't catch other authors' tropes! That's rude! Not cool.");
	} else {
	    var topDialog = "  ATTACK     CATCH       TROPES     RUN";
	    utils.displayBoxText(ctx, topDialog.replace(new RegExp(`(?<=.{${[0,11,23,34][req.state.cursorPos]}}).`), ">"));
	}

    var myTrope = tropes.tropeFromState(req.state["trope" + req.state.whichTropeActive]);
	var opTrope = tropes.tropeFromState(req.state["tropeOpponent"]);
	
	ctx.font = "40px 'Noto-Emoji'";
	ctx.fillText(opTrope.emoji, 90, 40);
	ctx.fillText(myTrope.emoji, 10, 80);
	ctx.font = "12px courier";
	drawHPBar(ctx, 4, 20, opTrope.name.toUpperCase(), opTrope.hp, opTrope.maxHP, opTrope.level);
    drawHPBar(ctx, 72, 65, myTrope.name.toUpperCase(), myTrope.hp, myTrope.maxHP, myTrope.level);
	
    ctx.font = "12px courier";
}

// render attack list and output
exports.drawAttackList = function(req, ctx) {
	var stateHelper = require("./state.js");
	var myTrope = tropes.tropeFromState(req.state["trope" + req.state.whichTropeActive]);
	req.state["trope" + req.state.whichTropeActive] = myTrope;
	
	if(req.state.opponentId) {
		var opState = stateHelper.createStateObjectFromID(req.state.opponentId);
		req.state["tropeOpponent"] = tropes.tropeFromState(opState["trope" + opState.whichTropeActive]);
	}
	
	var opTrope = tropes.tropeFromState(req.state["tropeOpponent"]);
	req.state["tropeOpponent"] = opTrope;
	
	// if displaying the attack list
	if(req.state.dialogPos == 0) {
		// render combat state and draw attack options
	    exports.drawCombat(req, ctx);
	    var attacksDialog = ` ${myTrope.learnedMoves[0].toUpperCase().padEnd(10)} ${(myTrope.learnedMoves[1]||"").toUpperCase().padEnd(10)}  ${(myTrope.learnedMoves[2]||"").toUpperCase().padEnd(10)} ${(myTrope.learnedMoves[3]||"").toUpperCase().padEnd(10)}`  ;
	    utils.displayBoxText(ctx, attacksDialog.replace(new RegExp(`(?<=.{${[0,11,23,34][req.state.cursorPos]}}).`), ">"));
	} else {
		// if we are beginning a new combat sequence from the top
		if(req.state.dialogPos == 1) {
			if(!req.state.opponentId) {
				// if we have no opponent, randomly choose the opponent trope's move and draw
				//setTimeout(_=>{
					req.state.opponentMove = Math.floor(Math.random() * opTrope.learnedMoves.length);
				//	var [canvas, ctx] = utils.getCanvasAndCtx();
				//	req.state.scene.render(req, ctx);
				//	stateHelper.saveState(null, req.state);
				//	utils.pushNewFrame(utils.videoStreams[req.state.id], canvas);
				//}, 1000);
			} else {
				// we have a multiplayer opponent, so set our move choice as their opponent's next move
				var opState = stateHelper.createStateObjectFromID(req.state.opponentId);
				opState.opponentNextMove = req.state.cursorPos;
				
				// If our opponent already selected their next move and pushed it into our state,
				//   then each player now knows their opponent's next move.
				// Load that next move into the current opponent-move slot and
				//   tell their stream to re-render with our choice
				if(req.state.opponentNextMove != 99) {
					// make next move the current move and reset next move to 99
					req.state.opponentMove = req.state.opponentNextMove;
					req.state.opponentNextMove = 99;
					opState.opponentMove = opState.opponentNextMove;
					opState.opponentNextMove = 99;
					
					// if our opponent has an active image stream, render to a new canvas and push it to their stream
					// (otherwise, if their not online, things will just render whenever they return and start a new stream)
					if(utils.videoStreams[opState.id]) {
						var [canvas, ctx] = utils.getCanvasAndCtx();
						opState.scene.render({ state: opState }, ctx, canvas);
						stateHelper.saveState(null, opState);
						utils.pushNewFrame(utils.videoStreams[opState.id], canvas);
					}
				}
			}
		}
		
		// if the opponents hasn't chosen a move yet, wait and we'll do a redraw when they do
		if(req.state.opponentMove == 99) {
			exports.drawCombat(req, ctx);
			utils.displayBoxText(ctx, "Waiting on opponent's move...");
			return;
		}
		
		// get move name by cursor pos and then load in full move details
		if(req.state.cursorPos <= 3) {
		    var myMove = myTrope.learnedMoves[req.state.cursorPos];
		} else if(req.state.cursorPos == 10) {
			var myMove = "CATCH";
		} else {
			var myMove = "SWITCH" + (req.state.cursorPos - 3);
		}
		
		if(req.state.opponentMove <= 3) {
		    var opMove = opTrope.learnedMoves[req.state.opponentMove];
		} else {
			var opMove = "SWITCH" + (req.state.opponentMove - 3);
		}
		
		// TODO: sort by speed
		var [firstMove, secondMove, firstTrope, secondTrope] = speedSortMovesAndTropes(myMove, opMove, myTrope, opTrope, req.state.id, req.state.opponentId);
		
		// show faint if hp==0 and not actively switching away
		// (i.e., don't show faint if there is a SWITCH away from the active trope)
		if(myTrope.hp == 0 && !(myMove.startsWith("SWITCH") && req.state.whichTropeActive != +myMove[6])) {
			var failMsg = myTrope.name.toUpperCase() + " fainted!";
			var anyAlive = false;
			req.state.cursorPos = 0;
			req.state.dialogPos = 0;
			req.state.opponentMove = 99;
			var scenes = require("./scenes.js");
			
			for(var i=1; i<=6; i++) {
				var iTrope = tropes.tropeFromState(req.state["trope"+i]);
				if(iTrope && iTrope.hp != 0) { anyAlive = true; break; }
			}
			if(!anyAlive) {
				// TODO: quit to menu
				failMsg += " All your tropes fainted!";
			    req.state.scene = scenes.MENU;
				req.state.opponentId = "";
				req.state.opponentNextMove = 99;
			} else {
				// select a replacement
				req.state.scene = scenes.TROPE_LIST;
				req.state.dialogPos = 1;
				// HACK: use invalid TROPE_LIST cursor state 0 to allow a free press to render
				// (TROPE_LIST processor will correct to 1 and return immediately, and re-render)
				req.state.cursorPos = 0;
			}
			exports.drawCombat(req, ctx);
			utils.displayBoxText(ctx, failMsg);
			
			return;
		}
		
		if(opTrope.hp == 0) {
			var msg = opTrope.name.toUpperCase() + " fainted!";
			if(!req.state.opponentId) {
				msg += " You win!";
			}
		}
		
		// make the sequence of [dialog_message, effect] tuples for each move and concat them
		var sequence = [...makeMessagesForMove(firstMove, firstTrope, secondTrope),
		                ...makeMessagesForMove(secondMove, secondTrope, firstTrope)]

        // show combat message/effect in sequence at `dialogPos-1`
		if(sequence[req.state.dialogPos-1]) {
		    var msg = sequence[req.state.dialogPos-1][0];
		    var effect = sequence[req.state.dialogPos-1][1];
			
			// apply effect
			if(effect) {
				if("damage" in effect) {
					var damage = Math.max(1, effect.damage[0] + effect.damage[1]*effect.self.level + effect.self.attackMod - effect.target.defenseMod);
					if(isEffective(effect.type, effect.target)) { damage = Math.ceil(damage * 1.2); }
					if(isNotEffective(effect.type, effect.target)) { damage = Math.ceil(damage * 0.8); }
					effect.target.hp -= damage;
					effect.target.hp = Math.max(0, effect.target.hp);
				}
				if("attack" in effect) {
					effect.target.attackMod += +effect.attack;
				}
				if("defense" in effect) {
					effect.target.defenseMod += +effect.defense;
				}
				if("switchTo" in effect) {
					if(effect.self == myTrope) {
						req.state.whichTropeActive = effect.switchTo;
						msg += "with " + tropes.tropeFromState(req.state["trope" + req.state.whichTropeActive]).name.toUpperCase() + "!";
					} else {
						// only multiplayer opponents can switch, so we know opState exists
						opState.whichTropeActive = effect.switchTo;
						req.state["tropeOpponent"] = tropes.tropeFromState(opState["trope" + opState.whichTropeActive]);
						msg += "with " + req.state.tropeOpponent.name.toUpperCase() + "!";
						stateHelper.saveState(null, opState);
					}
				}
			}
			
			exports.drawCombat(req, ctx);
			utils.displayBoxText(ctx, msg);
		}

        // if we just rendered the last message, set cursosrPos=9 to signal a return to top menu
		if(req.state.dialogPos == sequence.length) {
			req.state.cursorPos = 99;
			req.state.dialogPos = 0;
			req.state.opponentMove = 99;
		}
		
	}
}

// handle input when displaying attack list and output
exports.processAttackInput = function(input, req) {
	var scenes = require("./scenes.js");
	var stateHelper = require("./state.js");
	
	// signal to return to battle top menu
	if(req.state.cursorPos == 99) {
	    var scenes = require("./scenes.js");
		req.state.scene = scenes.BATTLE_TOP;
		req.state.cursorPos = 0;
		console.log("just hit cursor 99"); 
		return;
	}
	
	if(req.state.dialogPos == 0) {
        utils.fourCornerPos(input, req);
	
	    var myTrope = tropes.tropeFromState(req.state["trope" + req.state.whichTropeActive]);
		var opTrope = tropes.tropeFromState(req.state["tropeOpponent"]);
	
	    if(input == "a") {
			if(myTrope.learnedMoves[req.state.cursorPos]) {
				// dialogPos=1 signals to the renderer to begin showing the combat sequence
    	        req.state.dialogPos = 1;
			}
	    }
		// b goes back to top
    	if(input == "b") {
	    	req.state.scene = scenes.BATTLE_TOP;
			req.state.cursorPos = 0;
	    }
	} else {
		if(req.state.opponentMove != 99) {
    		req.state.dialogPos++;
		}
	}
	
}

exports.processInput = function(input, req, ctx) {
	var scenes = require("./scenes.js");
	
	utils.fourCornerPos(input, req);

	if(input == "a") {
		if(req.state.dialogPos == 10) {
			req.state.dialogPos = 0;
			return;
		}
		
		// attacks
	    if(req.state.cursorPos == 0) {
	        req.state.scene = scenes.BATTLE_ATTACKS;
			req.state.dialogPos = 0;
	    }
		
		// catch
	    if(req.state.cursorPos == 1) {
			// if not a multiplayer opponent, select "catch" (10) as your action instead of attack
			if(!req.state.opponentId) {
				// do an "index 10" attack which is a signal to try catching
			    //req.state.scene = scenes.BATTLE_ATTACKS;
			    //req.state.dialogPos = 1;
			    //req.state.cursorPos = 10;
			} else {
			    req.state.dialogPos = 10;
			}
	    }
		
		// tropes
		if(req.state.cursorPos == 2) {
			req.state.scene = scenes.TROPE_LIST;
			req.state.dialogPos = 1;
			req.state.cursorPos = 1;
		}
		
		// run
		if(req.state.cursorPos == 3) {
			// TODO
	        //req.state.scene = scenes.RUN;
	    }
	}
}

function drawHPBar(ctx, x, y, name, hp, max, level) {
    ctx.beginPath();
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#000";
	ctx.lineWidth = 1;
    ctx.rect(x+1,y,70,3);
    ctx.stroke();
    ctx.rect(x+1,y+1, 70 * hp / max, 1)
    ctx.stroke();
    ctx.closePath();

    ctx.fillText(name, x, y-2);
    ctx.fillText(`${hp}/${max}`, x, y+14);
    ctx.fillText(`Lv${level}`, x+50, y+14);
}

function isEffective(attack, target) {
	return (attack=="A" && target=="F") ||
	       (attack=="F" && target=="S") ||
	       (attack=="S" && target=="A");
}

function isNotEffective(attack, target) {
	return (attack=="A" && target=="S") ||
	       (attack=="F" && target=="A") ||
	       (attack=="S" && target=="F");
}

function injectEffectiveMessage(msgs, move, trope) {
	var index = msgs.findIndex(m=>m[1] && m[1].damage && isEffective(move.type, trope.type));
	if(index != -1) { msgs.splice(index+1, 0, ["It's super effective!"]); }
	index = msgs.findIndex(m=>m[1] && m[1].damage && isNotEffective(move.type, trope.type))
	if(index != -1) { msgs.splice(index+1, 0, ["It's not very effective..."]); }
}

function speedSortMovesAndTropes(move1, move2, trope1, trope2, id1, id2) {
	if(move1 == "CATCH") { return [move1, move2, trope1, trope2]; }
	if(move2 == "CATCH") { return [move2, move1, trope2, trope1]; }
	
	// always do switches first before a non-switch other move
	if(move1.startsWith("SWITCH") && !move2.startsWith("SWITCH")) {
		return [move1, move2, trope1, trope2];
	}
	if(move2.startsWith("SWITCH") && !move1.startsWith("SWITCH")) {
		return [move2, move1, trope2, trope1];
	}
	
	// fluff is fastest, angst is slowest, so any non-same type combos
	// with an F or an A must resolve in F's favor and A's disfavor
	if((trope1.type=="F" && trope2.type!="F") || (trope2.type=="A" && trope1.type!="A")) {
		return [move1, move2, trope1, trope2];
	}
	if((trope2.type=="F" && trope1.type!="F") || (trope1.type=="A" && trope2.type!="A")) {
		return [move2, move1, trope2, trope1];
	}
	
	// type is same, so just lex sort the attack names, and we'll do it that way, I guess??
	if(move1 < move2) {
		return [move1, move2, trope1, trope2];
	}
	if(move1 < move2) {
		return [move2, move1, trope2, trope1];
	}
	
	// same trope types, same move names, uhhh... sort by player ID, then, why not
	return id1>id2 ? [move1, move2, trope1, trope2] : [move2, move1, trope2, trope1];
}

function makeMessagesForMove(moveName, attacker, defender) {
	console.log(moveName);
	if(moveName.startsWith("SWITCH")) {
		moveMsgs = [["ATTACKER is swapped out ", {switchTo:+moveName[6]}]];
		var move = {};
	} else {
	    var move = moves.find(m=>m.name==moveName);
	    var moveMsgs = move.msg.slice();
	    injectEffectiveMessage(moveMsgs, move, defender);
	}
	return moveMsgs.map(m=>[
	              m[0].replace("ATTACKER",attacker.name.toUpperCase()).replace("DEFENDER",defender.name.toUpperCase()),
				  m[1] && Object.assign({target:defender, self:attacker, type:move.type}, m[1])
			  ]);
}