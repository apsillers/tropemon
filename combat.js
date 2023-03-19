var state = require("./state.js");
var utils = require("./utils.js");
var tropes = require("./tropes.js");
var moves = require("./moves.json");

exports.drawCombat = function drawCombat(req, ctx) {
	var topDialog = "  ATTACK     ITEM        TROPES     RUN";
	utils.displayBoxText(ctx, topDialog.replace(new RegExp(`(?<=.{${[0,11,23,34][req.state.cursorPos]}}).`), ">"));

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
				  m[1] && Object.assign({target:defender, self:attacker}, m[1])
			  ]);
}

// render attack list and output
exports.drawAttackList = function(req, ctx) {
	var myTrope = tropes.tropeFromState(req.state["trope" + req.state.whichTropeActive]);
	req.state["trope" + req.state.whichTropeActive] = myTrope;
	var opTrope = tropes.tropeFromState(req.state["tropeOpponent"]);
	req.state["tropeOpponent"] = opTrope;
	
	// if displaying the attack list
	if(req.state.dialogPos == 0) {
		// render combat state and draw attack options
	    exports.drawCombat(req, ctx);
	    var attacksDialog = ` ${myTrope.learnedMoves[0].toUpperCase().padEnd(10)} ${(myTrope.learnedMoves[1]||"").toUpperCase().padEnd(10)}  ${(myTrope.learnedMoves[2]||"").toUpperCase().padEnd(10)} ${(myTrope.learnedMoves[3]||"").toUpperCase().padEnd(10)}`  ;
	    utils.displayBoxText(ctx, attacksDialog.replace(new RegExp(`(?<=.{${[0,11,23,34][req.state.cursorPos]}}).`), ">"));
	} else {
		if(req.state.opponentMove == 9) {
			if(req.state.opponentId) {
			    exports.drawCombat(req, ctx);
			    utils.displayBoxText(ctx, "Waiting on opponent's move...");
				return;
			} else {
				req.state.opponentMove = Math.floor(Math.random() * opTrope.learnedMoves.length);
			}
		}
		
		// get move name by cursor pos and then load in full move details
		var myMove = myTrope.learnedMoves[req.state.cursorPos];
		var opMove = opTrope.learnedMoves[req.state.opponentMove];
		
		var firstTrope = myTrope;
		var secondTrope = opTrope;
		
		var sequence = [...makeMessagesForMove(myMove, firstTrope, secondTrope),
		                ...makeMessagesForMove(opMove, secondTrope, firstTrope)]

        // show this message, process combat effects
		if(sequence[req.state.dialogPos-1]) {
		    var msg = sequence[req.state.dialogPos-1][0];
		    var effect = sequence[req.state.dialogPos-1][1];
			
			if(effect) {
				if("damage" in effect) {
					console.log(effect.damage[0], effect.damage[1]*effect.self.level, effect.self.attackMod, effect.self.defenseMod);
					effect.target.hp -= Math.max(1, effect.damage[0] + effect.damage[1]*effect.self.level + effect.self.attackMod - effect.target.defenseMod);
					effect.target.hp = Math.max(0, effect.target.hp);
				}
			}
			
			exports.drawCombat(req, ctx);
			utils.displayBoxText(ctx, msg);
		}

		req.state.dialogPos++;
		if(req.state.dialogPos > sequence.length) {
			var scenes = require("./scenes.js");
			req.state.scene = scenes.BATTLE_TOP;
			req.state.cursorPos = 0;
			req.state.dialogPos = 0;
			req.state.opponentMove = 9;
		}
		
	}
}

// handle input when displaying attack list and output
exports.processAttackInput = function(input, req, ctx) {
	var scenes = require("./scenes.js");
	
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