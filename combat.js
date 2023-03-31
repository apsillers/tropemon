var state = require("./state.js");
var utils = require("./utils.js");
var tropes = require("./tropes.js");
var moves = require("./moves.json");

exports.drawCombat = function drawCombat(req, ctx) {
	if(req.state.dialogPos == 10) {
		utils.displayBoxText(ctx, "Hey, you can't catch other authors' tropes! That's plagiarism!");
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
exports.drawAttackList = async function(req, ctx, canvas, isPush) {
	var stateHelper = require("./state.js");
	var scenes  = require("./scenes.js");
	var myTrope = tropes.tropeFromState(req.state["trope" + req.state.whichTropeActive]);
	req.state["trope" + req.state.whichTropeActive] = myTrope;
	
	console.log(req.state.id, "at the top, whichTropeActive ==", req.state.whichTropeActive)
	
	if(req.state.opponentId) {
		var opState = await stateHelper.createStateObjectFromID(req.state.opponentId);
	}
	
	var opTrope = tropes.tropeFromState(req.state["tropeOpponent"]);
	req.state["tropeOpponent"] = opTrope;
	
	console.log(req.state.id, "drawing attack and opponentNextMove is", req.state.opponentNextMove);
	
	// signal to return to battle top menu
	if(req.state.cursorPos == 99) {
		var scenes = require("./scenes.js");
		req.state.scene = scenes.BATTLE_TOP;
		req.state.cursorPos = 0;
		req.state.dialogPos = 0;
		await scenes.find(req.state.scene).render(req, ctx);
		return;
	}
	
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
				// if we have no opponent, randomly choose the opponent trope's move
				req.state.opponentMove = Math.floor(Math.random() * opTrope.learnedMoves.length);
			} else {
				// we have a multiplayer opponent, so set our move choice as their opponent's next move
				// NOTE: we don't run this if we are running a push-based re-render because that would
				//       put our move as the opponent's opponentNextMove after we've just cleared it
				if(!isPush) {
				    opState.opponentNextMove = req.state.cursorPos;
				}
				
				if(opTrope.hp == 0) { var opStartedDead = true; }
				
				await stateHelper.saveState(null, opState);

				console.log(req.state.id, "dialog 1, set opponent's opponentNextMove to", opState.opponentNextMove)
				
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
					
					await stateHelper.saveState(null, opState);
					
					console.log(req.state.id, "opponent already picked attacks so we are telling them to draw")
					
					// if our opponent has an active image stream, render to a new canvas and push it to their stream
					// (otherwise, if their not online, things will just render whenever they return and start a new stream)
					if(utils.videoStreams[opState.id]) {
						var [opCanvas, opCtx] = utils.getCanvasAndCtx();
						await scenes.find(opState.scene).render({ state: opState }, opCtx, opCanvas, true);
						await stateHelper.saveState(null, opState);
						utils.pushNewFrame(utils.videoStreams[opState.id], opCanvas);
					}
				}
			}
		}
		
		console.log(req.state.id, "out of ")
		
		// if the opponents hasn't chosen a move yet, wait and we'll do a redraw when they do
		if(req.state.opponentMove == 99) {
			exports.drawCombat(req, ctx);
			utils.displayBoxText(ctx, "Waiting on opponent's move...");
			console.log(req.state.id, "waiting on op move")
			return;
		}
		
		// if opponent ran away or lost, end combat
		if(req.state.opponentMove == 101) {
			console.log(req.state.id, "opponent fled!")
			utils.displayBoxText(ctx, "Your opponent lost the battle! You win!");
			req.state.cursorPos = 100;
			// combat is over, clear out opponent state
			req.state.opponentId = "";
			req.state.opponentMove = 99;
			req.state.opponentNextMove = 99;
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
		
		// get opponent move or switch
		if(req.state.opponentMove <= 3) {
		    var opMove = opTrope.learnedMoves[req.state.opponentMove];
		} else {
			var opMove = "SWITCH" + (req.state.opponentMove - 3);
		}
		
		console.log(req.state.id, "myMove:", myMove, "opMove:", opMove)
		
		// sort who goes first by speed algorithm
		if(req.state.id > req.state.opponentId) {
			var [firstMove, secondMove, firstTrope, secondTrope] = speedSortMovesAndTropes(myMove, opMove, myTrope, opTrope);
		} else {
			var [firstMove, secondMove, firstTrope, secondTrope] = speedSortMovesAndTropes(opMove, myMove, opTrope, myTrope);
		}
		console.log(req.state.id, "order:", firstMove, secondMove);
		
		// show faint if hp==0 and: there's no switch OR the switch was to this trope
		// i.e., don't show faint if there is a SWITCH away from the active (fainted) trope
		// (still DO show faint if we just did a switch TO the active trope: i.e., we swapped to this and it died immediately D: D: D:)
		// myMove[6] is the number at the end of the SWITCH command, e.g., SWITCH1
		if(myTrope.hp == 0 && (!myMove.startsWith("SWITCH") || req.state.whichTropeActive == +myMove[6])) {
			
			console.log(req.state.id, "showing my faint when whichTropeActive is", req.state.whichTropeActive)
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
				failMsg += " All your tropes fainted!";
				req.state.cursorPos = 100;
				// combat is over, clear out opponent state
				req.state.opponentId = "";
				req.state.opponentNextMove = 99;
				req.state.opponentMove = 99;
				// tell opponent we lost
				if(opState) {
					opState.opponentMove = 101;
					await stateHelper.saveState(null, opState);
				}
			} else {
				// swap in a replacement
				req.state.scene = scenes.TROPE_LIST;
				req.state.dialogPos = 1;
				// HACK: use invalid TROPE_LIST cursor state 0 to allow a free press to render
				// (on any press or render, TROPE_LIST processor will correct to 1, return immediately, and re-render)
				req.state.cursorPos = 0;
			}
			exports.drawCombat(req, ctx);
			utils.displayBoxText(ctx, failMsg);
			
			return;
		}
		
		// this opponent has fainted
		// similar to the check above for myTrope, but cannot use opState.whichTropeActive
		// because that is already mutated for the opponent's display
		// Instead, we capture if we started the round with a dead opponent, above, in opStartedDead
		if(opTrope.hp == 0 && (!opMove.startsWith("SWITCH") || !opStartedDead)) {
			var msg = opTrope.name.toUpperCase() + " fainted!";
			myTrope.xp += 15 + opTrope.level*10;
			// if this is a single player battle, it's over
			if(!req.state.opponentId) {
				msg += " You win!";
				req.state.cursorPos = 100;
				req.state.opponentMove = 99;
			} else {
				// if this is a multiplayer battle
				// if they have no more tropes, they'll set their attack to 101, to be checked elsewhere
				msg += " Opponent is choosing a new trope...";
				req.state.cursorPos = 99;
				req.state.dialogPos = 0;
				req.state.opponentMove = 99;
			}
			exports.drawCombat(req, ctx);
			utils.displayBoxText(ctx, msg);
			return;
		}
		
		// make the sequence of [dialog_message, effect] tuples for each move and concat them
		var sequence = [...makeMessagesForMove(firstMove, firstTrope, secondTrope, req),
		                ...makeMessagesForMove(secondMove, secondTrope, firstTrope, req)]

		console.log(req.state.id, "seq len:", sequence.length);

		console.log(req.state.id, "showing dialog #", req.state.dialogPos-1);
		
		//console.log(req.state.id, "this item", sequence[req.state.dialogPos-1][0]);

        // show combat message/effect in sequence at `dialogPos-1`
		if(sequence[req.state.dialogPos-1]) {
		    var msg = sequence[req.state.dialogPos-1][0];
		    var effect = sequence[req.state.dialogPos-1][1];
			
			// apply effect
			if(effect) {
				if("damage" in effect || "drain" in effect) {
					var damage = Math.max(1, effect.damage[0] + effect.damage[1]*effect.self.level + effect.self.attackMod - effect.target.defenseMod);
					if(isEffective(effect.type, effect.target)) { damage = Math.ceil(damage * 1.2); }
					if(isNotEffective(effect.type, effect.target)) { damage = Math.ceil(damage * 0.8); }
					// "drain" means steal HP: compute how much HP is actually lost, and add it to HP, not going over our max
					if("drain" in effect) {
						var gain = Math.min(damage, effect.target.hp);
						effect.self.hp = Math.min(effect.self.hp + gain, effect.self.maxHP);
					}
					effect.target.hp -= damage;
					effect.target.hp = Math.max(0, effect.target.hp);
					effect.self.xp += 14;
				}
				if("heal" in effect) {
					effect.self.hp = Math.min(effect.self.hp + effect.heal[0] + effect.heal[1] * effect.self.level, effect.self.maxHP);
					effect.self.xp += 9;
				}
				if("attack" in effect) {
					effect.target.attackMod += +effect.attack;
					effect.self.xp += 9;
				}
				if("defense" in effect) {
					effect.target.defenseMod += +effect.defense;
					effect.self.xp += 9;
				}
				if("defenseSelf" in effect) {
					effect.self.defenseMod += +effect.defenseSelf;
					effect.self.xp += 9;
				}
				if("attackSelf" in effect) {
					effect.self.attackMod += +effect.attackSelf;
					effect.self.xp += 9;
				}
				if("caught" in effect) {
					var freeSlot = false;
					for(var i=1; i<=6; i++) {
						var iTrope = tropes.tropeFromState(req.state["trope"+i]);
						if(!iTrope) { freeSlot = i; break; }
					}
					if(freeSlot) {
						// if we have a free slot, just drop the new trope in
						req.state["trope"+i] = req.state["tropeOpponent"];
						// enemy is caught, combat is over
						req.state.cursorPos = 100;
					} else {
						// make a permanent replacement, dialogPos = 2
						// the assignment to trope+i is done in TROPE_LIST
						req.state.scene = scenes.TROPE_LIST;
						req.state.dialogPos = 2;
						// HACK: use invalid TROPE_LIST cursor state 0 to allow a free press to render
						// (on any press or render, TROPE_LIST processor will correct to 1, return immediately, and re-render)
						req.state.cursorPos = 0;
					}
				}
				if("switchTo" in effect) {
					// if this is you
					if(effect.self == myTrope) {
						// give xp for hangin in there last round, and make sure it saves its state
						myTrope.xp += 14;
						req.state["trope" + req.state.whichTropeActive] = myTrope;
						
						req.state.whichTropeActive = effect.switchTo;
						var newTrope = tropes.tropeFromState(req.state["trope" + req.state.whichTropeActive]);
						msg += "with " + newTrope.name.toUpperCase() + "!";
						newTrope.xp += 14;
						req.state["trope" + req.state.whichTropeActive] = newTrope;
					} else {
						// only multiplayer opponents can switch, so we know opState exists
						// show who they're switching to
						req.state["tropeOpponent"] = tropes.tropeFromState(opState["trope" + effect.switchTo]);
						msg += "with " + req.state.tropeOpponent.name.toUpperCase() + "!";
					}
				}
			}
			
			exports.drawCombat(req, ctx);
			utils.displayBoxText(ctx, msg);
		} else {
			// if we already rendered the last message, set cursosrPos=99 to signal a return to top menu
			// unless a trope is dead, then we need to do one more round of messages
			if(opTrope.hp != 0 && myTrope.hp != 0) {
				req.state.cursorPos = 0;
				req.state.dialogPos = 0;
				await scenes.BATTLE_TOP.render(req, ctx);
				req.state.scene = scenes.BATTLE_TOP.id;
				//req.state.cursorPos = 99;
				req.state.opponentMove = 99;
				return;
			}
		}
		req.state.dialogPos++;
	}
}

// handle input when displaying attack list and output
exports.processAttackInput = function(input, req) {
	var scenes = require("./scenes.js");
	var stateHelper = require("./state.js");
	
	// signal to return to battle top menu
	if(req.state.cursorPos == 99) {
		req.state.scene = scenes.BATTLE_TOP;
		req.state.dialogPos = 0;
		req.state.cursorPos = 0;
		return;
	}
	
	// battle has fully ended
	if(req.state.cursorPos == 100) {
		req.state.scene = scenes.AFTER_BATTLE;
		req.state.cursorPos = 0;
		req.state.dialogPos = 0;
		for(var i=1; i<=6; i++) {
			var iTrope = tropes.tropeFromState(req.state["trope"+i]);
			if(!iTrope) { break; }
			iTrope.attackMod = 0;
			iTrope.defenseMod = 0;
			req.state["trope"+i] = iTrope;
		}
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
    		
		}
	}
	
}

exports.processInput = async function(input, req, ctx) {
	var scenes = require("./scenes.js");
	var stateHelper = require("./state.js");

	utils.fourCornerPos(input, req);

	if(input == "a") {
		
		// if showing catch error message, return to dialog 0, top menu
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
			    req.state.scene = scenes.BATTLE_ATTACKS;
			    req.state.dialogPos = 1;
			    req.state.cursorPos = 10;
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
			console.log("running away")
			if(req.state.opponentId) {
				var opState = await stateHelper.createStateObjectFromID(req.state.opponentId);
				opState.opponentNextMove = 101;
				await stateHelper.saveState(null, opState);
			}
			req.state.scene = scenes.BATTLE_RUN;
			req.state.opponentId = "";
                        req.state.opponentNextMove = 99;
			req.state.opponentMove = 99;

			console.log("running", req.state)
	    }
	}
}

// post-battle messages are signaled by
// dialogPos <= 6 : trope # has leveled up
// dialogPos >= 7 (but < 128): trope (#-6) has evolved
// dialogPos >= 128 : trope (#-128-6) has evolved and we're showing a second message about it
exports.processAfterBattleInput = function(input, req) {
	var scenes = require("./scenes.js");
	
	req.state.opponentMove = 99;
	req.state.opponentNextMove = 99;
	req.state.opponentId = "";

	if(input == "a") {
		// evolution takes 2 messages
		// if we're on first evolve message, progress to the next one
		if(req.state.dialogPos >= 7 && req.state.dialogPos < 128) {
			req.state.dialogPos += 128;
			return;
		}
		
		var nextTrope;
		// level the next trope with excess xp, or evolve
		if(nextTrope = nextLeveledTrope(req) || nextEvolvedTrope(req)) {
			req.state.dialogPos = nextTrope[0];
		} else {
			req.state.scene = scenes.MENU;
			req.state.dialogPos = 0;
			req.state.cursorPos = 0;
		}
	}
}

exports.drawAfterBattle = function(req, ctx) {
	    if(req.state.dialogPos == 0) {
			utils.displayBoxText(ctx, "Good hustle, everyone!");
			return;
		}
		var msg;
		var nextTrope;
		if(req.state.dialogPos < 7) {
			nextTrope = tropes.tropeFromState(req.state["trope"+req.state.dialogPos]);
			msg = nextTrope.name.toUpperCase() + " reached level " + nextTrope.level;
			var learnedMove = nextTrope.moves.find(m=>m[1] == nextTrope.level);
			if(learnedMove) { msg += " and learned " + learnedMove[0] };
			msg += "!";
		} else if(req.state.dialogPos >= 7 && req.state.dialogPos < 128) {
			console.log(req.state.dialogPos)
			nextTrope = tropes.tropeFromState(req.state["trope"+(req.state.dialogPos-6)]);
			console.log(nextTrope)
			nextTrope = tropes.getUnevolvedType(nextTrope);
			msg = "What's this?? " + nextTrope.name.toUpperCase() + " is evolving!! " + ["Amazing!", "Tight!", "Nice!", "Holy crap!"][~~(Math.random()*4)]
		} else {
			nextTrope = tropes.tropeFromState(req.state["trope"+(req.state.dialogPos-128-6)]);
			msg = ["Bruh!", "Nuh-uh!", "Rad!", "Aces!"][~~(Math.random()*4)] + " " + tropes.getUnevolvedType(nextTrope).name.toUpperCase() + " evolved into " + nextTrope.name.toUpperCase() + "!!";
		}

		utils.displayBoxText(ctx, msg);
		ctx.font = "80px 'Noto-Emoji'";
		ctx.fillText(nextTrope.emoji, 30, 80);
		
}

exports.processRun = function(input, req) {
	var scenes = require("./scenes.js");
	if(input == "a") {
		req.state.scene = scenes.AFTER_BATTLE;
		req.state.cursorPos = 0;
		req.state.dialogPos = 0;
		for(var i=1; i<=6; i++) {
			var iTrope = tropes.tropeFromState(req.state["trope"+i]);
			if(!iTrope) { break; }
			iTrope.attackMod = 0;
			iTrope.defenseMod = 0;
			req.state["trope"+i] = iTrope;
		}
	}
}

exports.drawRun = function(req, ctx) {
	utils.displayBoxText(ctx, "All right, beat it, then! Get outta here!");
}

function nextLeveledTrope(req) {
	var leveled = false;
	for(var i=1; i<=6; i++) {
		var iTrope = tropes.tropeFromState(req.state["trope"+i]);
		while(iTrope && iTrope.xp >= iTrope.level * 100 && iTrope.level < 10) {
			iTrope.xp -= iTrope.level * 100;
			iTrope.level += 1;
			leveled = true;
			req.state["trope"+i] = iTrope;
		}
		if(leveled) { break; }
	}
	if(leveled && iTrope) { return [i, iTrope]; }
	return undefined;
}

function nextEvolvedTrope(req) {
	var evolved = false;
	for(var i=1; i<=6; i++) {
		var iTrope = tropes.tropeFromState(req.state["trope"+i]);
		if(iTrope && iTrope.evolve && iTrope.level >= iTrope.evolve[1]) {
			var iName = iTrope.name;
			iTrope = tropes.createNewTrope(iTrope.evolve[0], iTrope.level);
			evolved = true;
			req.state["trope"+i] = iTrope;
		}
		if(evolved) { break; }
	}
	if(evolved && iTrope) { return [6 + i, iName, iTrope]; }
	return undefined;
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
	
	// type tie, so higher level goes first
	if(trope1.level > trope2.level) {
		return [move1, move2, trope1, trope2];
	}
	if(trope2.level > trope1.level) {
		return [move2, move1, trope2, trope1];
	}
	
	// level is ALSO same, so just lex sort the attack names, and we'll do it that way, I guess??
	if(move1 < move2) {
		return [move1, move2, trope1, trope2];
	}
	if(move1 < move2) {
		return [move2, move1, trope2, trope1];
	}
	
	// same trope types, same move names, uhhh... sort by player ID, then, why not
	return [move1, move2, trope1, trope2];

}

function makeMessagesForMove(moveName, attacker, defender, req) {
	if(moveName.startsWith("SWITCH")) {
		moveMsgs = [["ATTACKER is swapped out ", {switchTo:+moveName[6]}]];
		var move = {};
	} else if(moveName == "CATCH") {
		var move = {};
		if(defender.hp > defender.maxHP / 3) {
			moveMsgs = [["Trying to catch DEFENDER..."], ["DEFENDER's HP is still too high!"]];
		} else if(Math.random() > (defender.hp / (defender.maxHP / 3))) {
			// we got em
			var freeSlot = false;
			for(var i=1; i<=6; i++) {
				if(!tropes.tropeFromState(req.state["trope"+i])) { freeSlot = i; break; }
			}
			moveMsgs = [["Trying to catch DEFENDER..."], ["You got DEFENDER!" + (freeSlot?"":" Pick a trope to set free, or B to cancel."), { "caught": true }]];
		} else {
			moveMsgs = [["Trying to catch DEFENDER..."], ["Dang! Couldn't quite catch it!"]];
		}
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
