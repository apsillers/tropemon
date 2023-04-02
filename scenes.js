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
