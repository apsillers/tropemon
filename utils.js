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