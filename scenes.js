var combat = require("./combat.js");
var intro = require("./intro.js");
var menu = require("./menu.js")
var utils = require("./utils.js");

module.exports = {
	find: function(idOrScene) {
		return Object.values(this).find(s=>typeof s == "object" && (s.id == idOrScene || s.id == idOrScene.id));
	},
	
	BATTLE_TOP: {
		id:0,
		process: combat.processInput,
		render: combat.drawCombat
	},
	BATTLE_ATTACKS: {
		id:1,
		process: combat.processAttackInput,
		render: combat.drawAttackList
	},
	
	INTRO: {
		id: 100,
		process: intro.processInput,
		render: intro.drawIntro
	},
	
	MENU: require("./menu.js"),
	
	MULTIPLAYER: require("./multiplayer.js"),
	
	TROPE_LIST: require("./trope_list.js"),
	
	AFTER_BATTLE: {
		id: 2,
		process: combat.processAfterBattleInput,
		render: combat.drawAfterBattle
	},
	
	BATTLE_RUN: {
		id: 3,
		process: combat.processRun,
		render: combat.drawRun
	}
}