var state = require("./state.js");
var utils = require("./utils.js");
var tropes = require("./tropes.js");
var moves = require("./moves.json");

exports.drawCombat = function drawCombat(req, ctx) {
	var topDialog = "  ATTACK     ITEM        TROPES     RUN";
	utils.displayBoxText(ctx, topDialog.replace(new RegExp(`(?<=.{${[0,11,23,34][req.state.cursorPos]}}).`), ">"));

    console.log("rendering battle top");

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
		// if the opponents hasn't chosen a move yet, wait and we'll do a redraw when they do
		if(req.state.opponentMove == 9) {
			exports.drawCombat(req, ctx);
			utils.displayBoxText(ctx, "Waiting on opponent's move...");
			return;
		}
		
		// get move name by cursor pos and then load in full move details
		var myMove = myTrope.learnedMoves[req.state.cursorPos];
		var opMove = opTrope.learnedMoves[req.state.opponentMove];
		
		// TODO: sort by speed
		var firstTrope = myTrope;
		var secondTrope = opTrope;
		
		if(myTrope.hp == 0) {
			var failMsg = myTrope.name + " fainted!";
			var anyAlive = false;
			req.state.cursorPos = 0;
			req.state.dialogPos = 0;
			req.state.opponentMove = 9;
			var scenes = require("./scenes.js");
			
			for(var i=1; i<=6; i++) {
				var iTrope = tropes.tropeFromState(req.state["trope"+i]);
				if(iTrope && iTrope.hp != 0) { anyAlive = true; break; }
			}
			if(!anyAlive) {
				// TODO: quit to menu
				failMsg += " All your tropes fainted!";
			    req.state.scene = scenes.MENU;
                
			} else {
				// TODO: switch tropes
				req.state.scene = scenes.TROPE_LIST;
				req.state.dialogPos = 1;
			}
			exports.drawCombat(req, ctx);
			utils.displayBoxText(ctx, failMsg);
			
			return;
		}
		
		// make the sequence of [dialog_message, effect] tuples for each move and concat them
		var sequence = [...makeMessagesForMove(myMove, firstTrope, secondTrope),
		                ...makeMessagesForMove(opMove, secondTrope, firstTrope)]

        // show this message, process combat effects
		if(sequence[req.state.dialogPos-1]) {
		    var msg = sequence[req.state.dialogPos-1][0];
		    var effect = sequence[req.state.dialogPos-1][1];
			
			if(effect) {
				if("damage" in effect) {
					var damage = Math.max(1, effect.damage[0] + effect.damage[1]*effect.self.level + effect.self.attackMod - effect.target.defenseMod);
					if(isEffective(effect.type, effect.target)) { damage = Math.ceil(damage * 1.2); }
					if(isNotEffective(effect.type, effect.target)) { damage = Math.ceil(damage * 0.8); }
					effect.target.hp -= damage;
					effect.target.hp = Math.max(0, effect.target.hp);
				}
				if("attack" in effect) {
					effect.target.atackMod += effect.attack;
				}
				if("defense" in effect) {
					effect.target.defenseMod += effect.defense;
				}
				
			}
			
			exports.drawCombat(req, ctx);
			utils.displayBoxText(ctx, msg);
		}

        // if we just rendered the last message, set cursosrPos=9 to signal a return to top menu
		if(req.state.dialogPos == sequence.length) {
			req.state.cursorPos = 9;
			req.state.dialogPos = 0;
			req.state.opponentMove = 9;
		}
		
	}
}

// handle input when displaying attack list and output
exports.processAttackInput = function(input, req) {
	var scenes = require("./scenes.js");
	var stateHelper = require("./state.js");
	
	// signal to return to battle top menu
	if(req.state.cursorPos == 9) {
	    var scenes = require("./scenes.js");
		req.state.scene = scenes.BATTLE_TOP;
		req.state.cursorPos = 0;
		console.log("just hit cursor 9"); 
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
				if(!req.state.opponentId) {
				    setTimeout(_=>{
						req.state.opponentMove = Math.floor(Math.random() * opTrope.learnedMoves.length);
						var [canvas, ctx] = utils.getCanvasAndCtx();
						req.state.scene.render(req, ctx);
						stateHelper.saveState(null, req.state);
						utils.pushNewFrame(utils.videoStreams[req.state.id], canvas);
					}, 1000);
			    } else {
					// we have a multiplayer opponent, so set our move as their opponent's next move
					var opState = stateHelper.createStateObjectFromID(req.state.opponentId);
					opState.opponentNextMove = req.state.cursorPos;
					
					// if our opponent already selected their next move and pushed it into our state,
					// load that next move into the current opponent move slot and
					// tell their stream to re-render with our choice
					if(req.state.opponentNextMove != 9) {
						req.state.opponentMove = req.state.opponentNextMove;
						req.state.opponentNextMove = 9;
						opState.opponentMove = opState.opponentNextMove;
						opState.opponentNextMove = 9;
						var [canvas, ctx] = utils.getCanvasAndCtx();
						opState.scene.render({ state: opState }, ctx, canvas);
						stateHelper.saveState(null, opState);
						utils.pushNewFrame(utils.videoStreams[opState.id], canvas);
					}
				}
			}
	    }
		// b goes back to top
    	if(input == "b") {
	    	req.state.scene = scenes.BATTLE_TOP;
			req.state.cursorPos = 0;
	    }
	} else {
		if(req.state.opponentMove != 9) {
    		req.state.dialogPos++;
		}
	}
	
}

exports.processInput = function(input, req, ctx) {
	var scenes = require("./scenes.js");
	
	utils.fourCornerPos(input, req);
	

	if(input == "a") {
	    if(req.state.cursorPos == 0) {
	        req.state.scene = scenes.BATTLE_ATTACKS;
			req.state.dialogPos = 0;
	    }
		if(req.state.cursorPos == 3) {
	        req.state.scene = scenes.RUN;
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

function makeMessagesForMove(moveName, attacker, defender) {
	var move = moves.find(m=>m.name==moveName);
	var moveMsgs = move.msg.slice();
	injectEffectiveMessage(moveMsgs, move, defender);
	return moveMsgs.map(m=>[
	              m[0].replace("ATTACKER",attacker.name.toUpperCase()).replace("DEFENDER",defender.name.toUpperCase()),
				  m[1] && Object.assign({target:defender, self:attacker, type:move.type}, m[1])
			  ]);
}