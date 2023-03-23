var utils = require("./utils.js");
var tropes = require("./tropes.js");

exports.id = 102;

exports.render = function (req, ctx) {
	if(req.state.cursorPos == 0) { req.state.cursorPos = 1; }
	
	for(var i=1; i<=6; i++) {
		var trope = tropes.tropeFromState(req.state["trope" + i]);
		if(!trope) { continue; }
		ctx.fillStyle = "#000";
		ctx.font = "bold 15px 'Noto-Emoji'";
	    ctx.fillText(trope.emoji, 15, i*23 - 4);
		ctx.font = "bold 10px courier";
		drawHPBar(ctx, 35, i*23- 10, trope.name.toUpperCase(), trope.hp, trope.maxHP, trope.xp, trope.level)
	}
	
	ctx.font = "bold 14px courier";
	ctx.fillText(">", 8, 23 * ((req.state.cursorPos & 7)) - 5);
	
	if(req.state.cursorPos & 56) {
		ctx.fillText("*", 0, 23 * ((req.state.cursorPos & 56) >> 3) - 5);
	}
}

exports.process = function(input, req) {
    var scenes = require("./scenes.js");
	
	// honestly I don't know why this bounds checking works, but it does, and I can't spent time making it better right now
	for(var i=1; i<=6; i++) { if(!tropes.tropeFromState(req.state["trope" + i])) { break; } }
	var max = i - 2;
	
	if(input == "down" && (req.state.cursorPos & 7) <= max) { req.state.cursorPos += 1; }
	if(input == "up" && (req.state.cursorPos & 7) > 1) { req.state.cursorPos -= 1; }

	// swapping Trope
	if(req.state.dialogPos == 0) {
		if(input == "a") {
			if(!tropes.tropeFromState(req.state["trope" + (req.state.cursorPos & 7)])) {
				return;
			}
			
			// if the bits 4-6 are empty, no selection yet
			if((req.state.cursorPos & 56) == 0) {
				// when we make a first selection, store the current position up three bits
				var oldCursor = req.state.cursorPos;
				req.state.cursorPos <<= 3;
				req.state.cursorPos += oldCursor;
			} else {
				// we already have a selection stored in the high bits, so do the swap
				var first = (req.state.cursorPos & 56) >> 3;
				var second = req.state.cursorPos & 7;
				
				var firstTrope = req.state["trope" + first];
				var secondTrope = req.state["trope" + second];
				
				req.state["trope" + first] = secondTrope;
				req.state["trope" + second] = firstTrope;
				
				// drop the high-bits selection
				req.state.cursorPos &= 7;
			}
		}
		if(input == "b") {
			if(req.state.cursorPos & 56) { req.state.cursorPos &= 7; }
			else {
				req.state.scene = scenes.MENU;
				req.state.cursorPos = 0;
				req.state.dialogPos = 0;
			}
		}
	}

	// picking trope to switch during battle
	if(req.state.dialogPos > 0) {
		if(input == "a") {
			if(req.state.cursorPos == 0) { req.state.cursorPos = 1; return; }
			
			// can't switch to already-active trope
			if(req.state.cursorPos == req.state.whichTropeActive) { return; }
			
			// in BATTLE_ATTACKS, cursorPos=4 means swtich to trope 1, pos=5 mean to trope 2, etc.
			req.state.cursorPos += 3;
			req.state.scene = scenes.BATTLE_ATTACKS;
			// tell BATTLE_ATTACKS to begin animation
			req.state.dialogPos = 1;
		}
		if(input == "b") {
			// can't back out if your active trope has fainted
			if(tropes.tropeFromState(req.state["trope" + req.state.whichTropeActive]).hp == 0) { return; }
			else {
				// this isn't a mandatory select, back out to choose a different action
				req.state.scene = scenes.BATTLE_TOP;
				req.state.cursorPos = 2;
			}
		}
	}

}

function drawHPBar(ctx, x, y, name, hp, max, xp, level) {
    ctx.beginPath();
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#000";
	ctx.lineWidth = 1;
    ctx.rect(x+1,y,70,3);
    ctx.stroke();
    ctx.rect(x+1,y+1, 70 * hp / max, 1)
    ctx.stroke();
    ctx.closePath();
	
	ctx.beginPath();
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#000";
	ctx.lineWidth = 1;
    ctx.rect(x+1,y+6,70,4);
    ctx.stroke();
    ctx.rect(x+1,y+7, (70 * xp) / (level * 100), 2)
    ctx.stroke();
    ctx.closePath();

    ctx.fillText(name, x, y-2);
    ctx.fillText(`HP ${hp}/${max}`, x+75, y);
    ctx.fillText(`Lv${level}`, x+75, y+9);
}