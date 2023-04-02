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

var dialogs = ["Welcome to the amazing world of TROPEMON! Press A to continue...",
               "Anyone who loves fanfic knows it's full of tropes! But...",
			   "Ever wondered which trope is the coolest? Strongest? Best??",
               "Good news! Science has made tropes physically real, so now they can",
			   "visciously fight each other! Let's begin your journey!",
			   "GENDER",
			   "Great!",
			   "There are many tropes but they fall into three main types:",
			   "FLUFF-type tropes are quick, light, and rejuvinating!",
			   "Who could resist this cute lil CINNAMON ROLL?",
			   "But ANGST-type tropes hit hard and crush Fluff!",
			   "This PINING is sure to make your opponents weep!",
			   "But even the strongest Angst can give way to SMUT-types!",
			   "Who can stay angsty in the face of some spicy FANSERVICE?",
			   "Typically, Angst crushes Fluff, Fluff defuses Smut, and",
			   "Smut overcomes Angst! (Helpfully, it goes in alphabetical order.)",
			   "But with the right author, anything is possible!",
			   "Now that you know the types, what trope will you start with?",
			   "STARTERSELECT",
			   "STARTERSAY",
			   "The bond between trope and author is a special one.",
			   "Take care of your tropes and they'll take care of you, too.",
			   "Now, let's make our tropes fight until one passes out!"]

exports.drawIntro = function drawIntro(req, ctx) {
	
	var dialog = dialogs[req.state.dialogPos];
	
	// render menus, or else print dialogue
	if(dialog == "GENDER") {
    	utils.displayBoxText(ctx, "Are you a boy or girl?   YES, I AM              NO I'M NOT".replace(new RegExp(`(?<=.{${23+req.state.cursorPos*23}}).`), ">"));
	} else if(dialog == "STARTERSELECT") {
		utils.displayBoxText(ctx, "   🌀 CINNAMON ROLL       🥺 PINING              😘 FANSERVICE".replace(new RegExp(`(?<=.{${1+req.state.cursorPos*23}}).`), ">"));
	} else if(dialog == "STARTERSAY") {
		utils.displayBoxText(ctx, `Picking ${tropes.tropeFromState(req.state.trope1).name.toUpperCase()} says a lot about you personally! Wow!`);
	} else {
		utils.displayBoxText(ctx, dialog);
	}
	
	// after page 8, move professor to the side and render some tropes
	if(req.state.dialogPos < 8) {
	    ctx.font = "80px 'Noto Emoji'";
	    ctx.fillText('👨‍🔬', 30, 80);
	} else {
	    ctx.font = "80px 'Noto Emoji'";
	    ctx.fillText('👨‍🔬', 75, 80);
		
		ctx.font = "18px 'Noto Emoji'";
	    ctx.fillText('🌀Fluff', 2, 30);
		
		if(req.state.dialogPos >= 10) {
			ctx.fillText('🥺Angst', 2, 60);
		}
		if(req.state.dialogPos >= 12) {
			ctx.fillText('😘Smut', 2, 90);
		}
	}		
}

exports.processInput = function(input, req, ctx) {
	var scenes = require("./scenes.js");
	
    if(input == "a") {
		// after STARTERSELECT menu, set trope1 based on cursor position
		if(dialogs[req.state.dialogPos] == "STARTERSELECT") {
			req.state.trope1 = tropes.createNewTrope(req.state.cursorPos * 2 + 1);
		}
		
		// pressed A, so step to next text
		req.state.dialogPos++; 
		
		// reset cursor to 0 for each menu
	    if(["GENDER", "STARTERSELECT"].includes(dialogs[req.state.dialogPos])) { req.state.cursorPos = 0; }
		
		// at the end of dialog, enter combat
		if(dialogs[req.state.dialogPos] == undefined) {
			req.state.cursorPos = 0;
			req.state.dialogPos = 0;
			// choose opponent trope based on player choice
			var opNum = (req.state.trope1[0] + 2) % 6;
			req.state.tropeOpponent = tropes.createNewTrope(opNum, 1);
			req.state.scene = scenes.BATTLE_TOP;
		}
	}
	// accept D-pad input to mutate cursorPos, for menus
	if(dialogs[req.state.dialogPos] == "GENDER") { utils.upDownPos(input, req); }
	if(dialogs[req.state.dialogPos] == "STARTERSELECT") { utils.upDownMidPos(input, req); }
}
