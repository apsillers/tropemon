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

const { SVGCanvas } = require("./svgcanvas.js");

exports.videoStreams = {};
exports.homeURL = "https://archiveofourown.org/works/45988723#game";

exports.pushNewFrame = function (res, canvas) {
	var outBuffer = canvas.toBuffer();
	res.write(outBuffer);
	res.write(`--endofsection\n`);
	res.write(`Content-Type:image/svg+xml\n\n`);
}

exports.getCanvasAndCtx = function() {
	var dims = [160, 144];
	const canvas = new SVGCanvas(dims[0], dims[1], "#fff", "#000");
	const ctx = canvas.getContext('2d');
	ctx.rect(0,0,dims[0], dims[1]);
	return [canvas, ctx];
}

exports.fourCornerPos = function(input, req) {
	if(input == "down" && req.state.cursorPos < 2) { req.state.cursorPos += 2; }
	if(input == "up" && req.state.cursorPos > 1) { req.state.cursorPos -= 2; }
	if(input == "right" && req.state.cursorPos % 2 == 0) { req.state.cursorPos += 1; }
	if(input == "left" && req.state.cursorPos % 2 == 1) { req.state.cursorPos -= 1; }
}

exports.upDownPos = function(input, req) {
	if(input == "down" && req.state.cursorPos % 2 == 0) { req.state.cursorPos += 1; }
	if(input == "up" && req.state.cursorPos % 2 == 1) { req.state.cursorPos -= 1; }
}

exports.upDownMidPos = function(input, req) {
	if(input == "down" && req.state.cursorPos < 2) { req.state.cursorPos += 1; }
	if(input == "up" && req.state.cursorPos > 0) { req.state.cursorPos -= 1; }
}

exports.oneToNPos = function(n, input, req) {
	if(input == "down" && req.state.cursorPos <= n) { req.state.cursorPos += 1; }
	if(input == "up" && req.state.cursorPos > 1) { req.state.cursorPos -= 1; }
}

exports.displayPP = function(ctx, pp, maxPP) {
    ctx.rect(90, 83, 67, 17, "#fff", "#000", 2);
    ctx.fillText("PP: " + pp + "/" + maxPP, 94, 96, 11.5);
}

exports.displayBoxText = function(ctx, text) {
	// draw dialog box
	ctx.rect(2, 102, 156, 40, "#fff", "#000", 2);

	// find the longest substring length<=22 prior to a space and split input
	var lines = text.match(/(^.{0,22})( .{0,22})?( .{0,22})?$/);
    
	if(lines == null) { ctx.fillText("ERROR too long", 4, 140-28); return; }
	
	// output first and optionally second lines
	// trim leading space from second line
	ctx.fillText(lines[1], 4, 140-28);
	if(lines[2]) {
		ctx.fillText(lines[2].substr(1), 4, 140-14);
	}
	if(lines[3]) {
		ctx.fillText(lines[3].substr(1), 4, 140-2);
	}
}

exports.setFirstActiveTrope = function(req) {
	var tropes = require("./tropes.js")
	for(var i=1; i<=6; i++) {
		var trope = tropes.tropeFromState(req.state["trope" + i]);
		if(trope && trope.hp > 0) { req.state.whichTropeActive = i; break; }
	}
}

exports.setupCombat = function(req, opponent, opId) {
	var scenes = require("./scenes.js");
	req.state.tropeOpponent = opponent;
	req.state.scene = scenes.BATTLE_TOP.id;
	req.state.dialogPos = 0;
	req.state.cursorPos = 0;
	req.state.opponentId = opId;
}
