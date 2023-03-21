var utils = require("./utils.js");

exports.id = 101;

exports.render = function (req, ctx) {
	var topDialog = " NEW BATTLE   REORDER   MULTIPLAYER  CREDITS";
	utils.displayBoxText(ctx, topDialog.replace(new RegExp(`(?<=.{${[0,13,23,36][req.state.cursorPos]}}).`), ">"));
	
}

exports.process = function(input, req) {
	var scenes = require("./scenes.js");
	utils.fourCornerPos(input, req);
	if(input == "a") {
		if(req.state.cursorPos == 0) {
			// random battle
		}
		if(req.state.cursorPos == 1) {
			// reorder
			req.state.scene = scenes.TROPE_LIST;
			req.state.dialogPos = 1;
			req.state.cursorPos = 1;
		}
		if(req.state.cursorPos == 2) {
			// multiplayer
		}
		if(req.state.cursorPos == 3) {
			// credits??
		}
		
	}
}