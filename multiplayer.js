exports.id = 200;

exports.render = function() {
	
}

exports.process = function(input, req) {
	var scenes = require("./scenes.js");
	
	if(input == "b") {
		req.state.scene = scenes.MENU;
	}
}