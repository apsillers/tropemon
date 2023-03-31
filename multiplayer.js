var utils = require("./utils.js");

exports.id = 200;

var freeCodes = [...Array(256).keys()];

var playersByBattleId = {};
var battleIdsByPlayer = {};

exports.render = function(req, ctx, canvas) {
	if(req.state.dialogPos == 0) {
	    var topDialog = "  HOST                   JOIN";
	    utils.displayBoxText(ctx, topDialog.replace(new RegExp(`(?<=.{${[0,23][req.state.cursorPos]}}).`), ">"));
	}
    if(req.state.dialogPos == 1) {
		if(battleIdsByPlayer[req.state.id]) {
		    utils.displayBoxText(ctx, "Battle code is " + battleIdsByPlayer[req.state.id] + ". Have another player join, or B to cancel.");
			ctx.font = "bold 20px courier";
			ctx.fillText(battleIdsByPlayer[req.state.id], 10, 50);
		}
	}
	// join menu
	// for dialog 2-5, show between 0-3 digits of cursorPos in base4
	// and show entry options
	if(req.state.dialogPos >= 2 && req.state.dialogPos <= 5) {
		utils.displayBoxText(ctx, "Entering join code:     0  1  2  3            Press B to go back".replace(new RegExp(`(?<=.{${[23,26,29,32][req.state.cursorPos & 3]}}).`), ">"));
		ctx.font = "bold 20px courier";
		ctx.fillText(byteToCode(req.state.cursorPos).substr(0,req.state.dialogPos-2), 10, 50);
	}
	// a dialog 6, code is fully entered
	if(req.state.dialogPos == 6) {
		// final selection
		utils.displayBoxText(ctx, "A: Submit code         B: Go back");
		ctx.font = "bold 20px courier";
		ctx.fillText(byteToCode(req.state.cursorPos), 10, 50);
	}
}

exports.process = async function(input, req) {
	var scenes = require("./scenes.js");
	
	if(req.state.dialogPos == 0) {
		utils.upDownPos(input, req);
		// host
		if(input == "a") {
			// selected "host"
			if(req.state.cursorPos == 0) {
				if(freeCodes.length) {
					// grab a random unused code
					var code = freeCodes.splice(Math.floor(Math.random()*freeCodes.length), 1)[0];
					// split code into a sequence of 4 bit-pairs, i.e., base-4 representation
					code = byteToCode(code);
					console.log("as base4:", code);
					playersByBattleId[code] = req.state.id;
					battleIdsByPlayer[req.state.id] = code;
					// progress to code display
					req.state.dialogPos = 1;
				}
			}
			// selected "join"
			else if(req.state.cursorPos == 1) {
				// progress to code input
				req.state.dialogPos = 2;
				req.state.cursorPos = 0;
				return;
			}
		}
		if(input == "b") {
			req.state.scene = scenes.MENU;
			req.state.dialogPos = 0;
			req.state.cursorPos = 2;
			return;
		}
		return;
	}
	if(req.state.dialogPos == 1) {
		if(input == "b") {
			// release code back into pool and return to multiplayer top
			var code = battleIdsByPlayer[req.state.id];
			delete battleIdsByPlayer[req.state.id];
			delete playersByBattleId[code];
			freeCodes.push(parseInt(code,4));
			req.state.dialogPos = 0;
			req.state.cursorPos = 0;
		}
		return;
	}
	if(req.state.dialogPos >= 2 && req.state.dialogPos <= 5) {
		// the lowest 2 bits hold the current position, higher bits hold past selections
		if(input == "right" && (req.state.cursorPos & 3) < 3) { req.state.cursorPos += 1; }
		if(input == "left" && (req.state.cursorPos & 3) > 0) { req.state.cursorPos -= 1; }

		if(input == "a") {
			// take the lowest 2 bits of cursorPos and put them in position 7&8 for dialog 2, 5&6 for dialog 3, 3&4 for dialog  4
			req.state.cursorPos |= (req.state.cursorPos & 3) << (6 - 2*(req.state.dialogPos - 2));
			req.state.dialogPos++;
			return;
		}
		if(input == "b") {
                        // zero out previous character and decrease dialogPos to get ready to fill it in again
			req.state.cursorPos = [0b11, 0b11, 0b11000011, 0b11110011][req.state.dialogPos - 2] & req.state.cursorPos;
			req.state.dialogPos--;

			// if we've already deleted all digits and hit B, go back to multiplayer top
			if(req.state.dialogPos == 1) { req.state.dialogPos = 0; }
			return;
		}
		return;
	}
	if(req.state.dialogPos == 6) {
		if(input == "a") {
			var stateHelper = require("./state");
			
			var opId = playersByBattleId[byteToCode(req.state.cursorPos)];
			
			if(!opId) {
				req.state.dialogPos = 0;
				req.state.cursorPos = 0;
				return;
			}
			
			var opState = await stateHelper.createStateObjectFromID(opId);
			
			utils.setFirstActiveTrope(req);
			utils.setFirstActiveTrope({ state: opState });
			
			utils.setupCombat(req, opState["trope"+opState.whichTropeActive], opId);
			utils.setupCombat({ state: opState }, req.state["trope"+req.state.whichTropeActive], req.state.id);
			
			await stateHelper.saveState(null, opState);
			
			// if our opponent has an active image stream, render to a new canvas and push it to their stream
			// (otherwise, if their not online, things will just render whenever they return and start a new stream)
			if(utils.videoStreams[opState.id]) {
				var [opCanvas, opCtx] = utils.getCanvasAndCtx();
				await scenes.find(opState.scene).render({ state: opState }, opCtx, opCanvas);
				utils.pushNewFrame(utils.videoStreams[opState.id], opCanvas);
			}

			await stateHelper.saveState(null, opState);
console.log("we just joined!", req.state);

		}
		if(input == "b") {
			req.state.dialogPos--;
		}
	}

}

// turns a byte value into a 4-digit, base-4 string
function byteToCode(code) {
	//return `${(code >> 6) & 3}${(code >> 4) & 3}${(code >> 2) & 3}${code & 3}`
	return code.toString(4).padStart(4,"0");
}
