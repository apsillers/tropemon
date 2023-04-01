const { createCanvas } = require("canvas");

exports.videoStreams = {};
exports.homeURL = "https://archiveofourown.org/works/45988723#game";

exports.pushNewFrame = function (res, canvas) {
	var outBuffer = canvas.toBuffer("image/jpeg", { quality: 0.45 });
	//var outBuffer = canvas.toBuffer("image/png", { compressionLevel: 9, palette: new Uint8ClampedArray([ 255,255,255,0, 0,0,0,0 ]) });
	//res.write(`Content-length: ${outBuffer.length}\n\n`);
    res.write(outBuffer);
	res.write(`--endofsection\n`);
	res.write(`Content-Type:image/jpeg\n\n`);
	
	//res.write(`--endofsection\nContent-Type: image/jpeg\n\n`);
    //res.write(outBuffer);
		
	//console.log(outBuffer.length);
}

exports.getCanvasAndCtx = function() {
	var dims = [160, 144];
	const canvas = createCanvas(dims[0], dims[1]);
    const ctx = canvas.getContext('2d');
	ctx.fillStyle = "white";
    ctx.fillRect(0, 0, dims[0], dims[1]);
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
    ctx.beginPath();
    ctx.fillStyle = "#fff";
	ctx.lineWidth = 2;
    ctx.rect(90, 83, 67, 17);
    ctx.stroke();
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = "#000";
    ctx.font = "bold 12px courier";
    ctx.fillText("PP: " + pp + "/" + maxPP, 94, 96);
}

exports.displayBoxText = function(ctx, text) {
    ctx.beginPath();
    ctx.fillStyle = "#fff";
	ctx.lineWidth = 2;
    ctx.rect(2, 102, 157, 40);
    ctx.stroke();
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = "#000";
    ctx.font = "bold 12px courier";
	//ctx.font = "12px 'Noto Emoji'";
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
		if(trope.hp > 0) { req.state.whichTropeActive = i; break; }
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
