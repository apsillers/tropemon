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

exports.id = 102;

exports.render = function (req, ctx) {
	if(req.state.cursorPos == 0) { req.state.cursorPos = 1; }
	
	for(var i=1; i<=6; i++) {
		var trope = tropes.tropeFromState(req.state["trope" + i]);
		if(!trope) { continue; }
	    ctx.fillText(trope.emoji, 12, i*23 - 4, 15);
		drawHPBar(ctx, 32, i*23- 10, trope.name.toUpperCase(), trope.hp, trope.maxHP, trope.xp, trope.level)
	}
	
	ctx.fillText(">", 7, 23 * ((req.state.cursorPos & 7)) - 5);
	
	if(req.state.cursorPos & 56) {
		ctx.fillText("*", 0, 23 * ((req.state.cursorPos & 56) >> 3) - 5);
	}
}

exports.process = function(input, req) {
    var scenes = require("./scenes.js");
	
	for(var i=1; i<=6; i++) { if(!tropes.tropeFromState(req.state["trope" + i])) { break; } }
	var max = i - 2;
	
	// move cursor based on low 3 bits of cursorPos
	if(input == "down" && (req.state.cursorPos & 7) <= max) { req.state.cursorPos += 1; }
	if(input == "up" && (req.state.cursorPos & 7) > 1) { req.state.cursorPos -= 1; }

	// swapping Trope
	if(req.state.dialogPos == 0) {
		if(input == "a") {
			// don't select empty solts, if we got to them somehow
			if(!tropes.tropeFromState(req.state["trope" + (req.state.cursorPos & 7)])) {
				return;
			}
			
			// if the high bits 4-6 are empty, no selection yet
			if((req.state.cursorPos & 56) == 0) {
				// when we make a first selection, store the selected position up three bits (the "high bits", versus the 1-3 "low bits")
				var oldCursor = req.state.cursorPos;
				req.state.cursorPos <<= 3;
				req.state.cursorPos += oldCursor;
			} else {
				// we already have a selection stored in the high bits, so do the swap
				// shift the high bits into their original position, 00xxx000 >> 00000xxx
				var first = (req.state.cursorPos & 56) >> 3;
				// capture the low bts of the current position
				var second = req.state.cursorPos & 7;
				
				var firstTrope = req.state["trope" + first];
				var secondTrope = req.state["trope" + second];
				
				req.state["trope" + first] = secondTrope;
				req.state["trope" + second] = firstTrope;
				
				// after swap, drop the high bits of the selection, only preserve the actual current position in bits 1-3
				req.state.cursorPos &= 7;
			}
		}
		if(input == "b") {
			// if a previous selection has been made, forget it
			if(req.state.cursorPos & 56) { req.state.cursorPos &= 7; }
			else {
				// if no selection has been made, go back to menu
				req.state.scene = scenes.MENU;
				req.state.cursorPos = 1;
				req.state.dialogPos = 0;
			}
		}
		// always return, to avoid matching another dialogPos after change
		return;
	}

	// picking trope to switch during battle
	if(req.state.dialogPos == 1) {
		if(input == "a") {
			if(req.state.cursorPos == 0) { req.state.cursorPos = 1; return; }
			
			// can't switch to already-active trope
			if(req.state.cursorPos == req.state.whichTropeActive) { return; }
			
			// in BATTLE_ATTACKS, cursorPos=4 means swtich to trope 1, pos=5 mean to trope 2, etc.
			// because 0-3 mean attacks 1-4
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
		// always return, to avoid matching another dialogPos after change
		return;
	}
	
	// choosing trope to permanently replace
	if(req.state.dialogPos == 2 || req.state.dialogPos == 3) {
		if(input == "a") {
			if(req.state.cursorPos == 0) { req.state.cursorPos = 1; return; }
			
			// clobber trope #i with just-caught opponent
			req.state["trope" + req.state.cursorPos] = req.state.tropeOpponent;
			
			// progress to AFTER_BATTLE
			req.state.scene = scenes.AFTER_BATTLE;
			req.state.dialogPos = 0;
			return;
		}
		if(input == "b") {
			req.state.scene = scenes.AFTER_BATTLE;
			req.state.dialogPos = 0;
		}
		// always return, to avoid matching another dialogPos after change
		return;
	}

}

function drawHPBar(ctx, x, y, name, hp, max, xp, level) {
	var ratio = hp / max;
	var color = "#0c0";
	if(ratio <= 0.5) { color = "#ca0"; }
	if(ratio <= 0.25) { color = "#c00"; }
	
    ctx.rect(x+1,y+1,70,3);
    ctx.rect(x+2,y+2, 68 * hp / max, 1, "", color);
    ctx.rect(x+1,y+6, 70 * Math.min((xp / (level * 100)), 1), 1, "", "#c0c");

    ctx.fillText(name.padEnd(12) + ` HP ${hp}/${max}`, x, y-2, 10);
    ctx.fillText(`Lv${level}`, x+77, y+9, 10);
}
