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

var tropes = [
 {},
  { "num":1, "name":"CinnamonRoll", "emoji":"🌀", "moves": [["Flail", 1], ["Puppy Eyes", 1], ["Comfort", 3], ["Bare Soul",5]], "baseHP":20, "hpLvl":5, "evolve":[2,4], "type":"F" },
  { "num":2, "name":"Lil MeowMeow", "emoji":"😿", "moves": [["Flail", 1], ["Puppy Eyes", 1], ["Comfort", 3], ["Bare Soul",5]], "baseHP":20, "hpLvl":6, "type":"F", "minLevel":4 },

  { "num":3, "name":"Pining", "emoji":"🥺", "moves": [["Tackle", 1], ["Weep", 1], ["Bemoan", 3], ["Fury",5]], "baseHP":20, "hpLvl":5, "evolve":[4,4], "type":"A" },
  { "num":4, "name":"Yearning", "emoji":"😭", "moves": [["Tackle", 1], ["Weep", 1], ["Bemoan", 3], ["Fury",5]], "baseHP":20, "hpLvl":5, "type":"A", "minLevel":4 },

  { "num":5, "name":"Fanservice", "emoji":"😘", "moves": [["Gyrate", 1], ["Flirt", 1], ["Smolder", 3], ["Ooh La La",5]], "baseHP":20, "hpLvl":5, "evolve":[6,4], "type":"S" },
  { "num":6, "name":"Explicit", "emoji":"😈", "moves": [["Gyrate", 1], ["Flirt", 1], ["Smolder", 3], ["Ooh La La",5]], "baseHP":20, "hpLvl":5, "type":"S", "minLevel":4 },

  { "num":7, "name":"Rarepair", "emoji":"💏", "moves":[["PDA",1], ["Coat Swap", 1], ["Puppy Eyes", 3], ["Body Swap", 6]], "baseHP":15, "hpLvl":7, "evolve":[8,5], "type":"F" },
  { "num":8, "name":"Crackship", "emoji":"👯‍♂️", "moves":[["PDA",1], ["Coat Swap", 1], ["Puppy Eyes", 3], ["Body Swap", 6]], "baseHP":15, "hpLvl":7, "type":"F", "minlevel":5 },

  { "num":9, "name":"Dead Dove", "emoji":"🐦", "moves":[["Whump",1], ["Despair", 1], ["Bemoan", 3], ["MCD", 6]], "baseHP":12, "hpLvl":7, "type":"A" },

  { "num":10, "name":"Hotpants", "emoji":"👖", "moves":[["Thrust",1], ["Harden", 1], ["Sling", 3], ["Suck", 6]], "baseHP":15, "hpLvl":5, "type":"S" },

  { "num":11, "name":"Only One Bed", "emoji":"🛌", "moves":[["Cover Up",1], ["Rest", 1], ["Smash", 3], ["Rezurgays", 6]], "baseHP":25, "hpLvl":7, "type":"F" },

  { "num":12, "name":"Creature Fic", "emoji":"🧛", "moves":[["Tackle",1], ["Soul Bond", 1], ["Growl", 3], ["Knot", 6]], "baseHP":15, "hpLvl":8, "type":"S", "evolve":[13,5] },
  { "num":13, "name":"A/B/O", "emoji":"🐺", "moves":[["Tackle",1], ["Soul Bond", 1], ["Growl", 3], ["Knot", 6]], "baseHP":15, "hpLvl":8, "type":"S", "minlevel":5 },

  { "num":14, "name":"Lemon", "emoji":"🍋", "moves":[["Lick",1], ["Harden", 1], ["Stamina", 3], ["Orgy", 6]], "baseHP":15, "hpLvl":7, "type":"S", "evolve":[15,5] },
  { "num":15, "name":"PWP", "emoji":"🍆", "moves":[["Lick",1], ["Harden", 1], ["Stamina", 3], ["Orgy", 6]], "baseHP":15, "hpLvl":7, "type":"S", "minlevel":5 },

  { "num":16, "name":"Malewife", "emoji":"👰‍♂️", "moves":[["Pancakes",1], ["Cozy Up", 1], ["Bad Idea", 6], ["Oops", 8]], "baseHP":15, "hpLvl":6, "type":"F", "evolves":[17,5] },
  { "num":17, "name":"Himbo", "emoji":"🧑‍🍳", "moves":[["Pancakes",1], ["Cozy Up", 1], ["Bad Idea", 6], ["Oops", 8]], "baseHP":30, "hpLvl":6, "type":"F", "minLevel":5 },

  { "num":18, "name":"Bad Boy", "emoji":"😎", "moves":[["Spite",1], ["Sneer", 1], ["Brood", 3], ["Smash", 6]], "baseHP":20, "hpLvl":7, "type":"A", "evolves":[19,5] },
  { "num":19, "name":"BAMF", "emoji":"🏂", "moves":[["Spite",1], ["Sneer", 1], ["Brood", 3], ["Smash", 6]], "baseHP":30, "hpLvl":8, "type":"A", "minlevel":5 },

];

exports.randomTrope = function(level, predicate) {
	var tropeSpace = tropes.slice(1);
	if(predicate) { tropeSpace = tropeSpace.filter(predicate); }
	console.log(tropeSpace.map(t=>t.name))
	tropeSpace = tropeSpace.filter(t=>!t.minLevel || level >= t.minLevel);
	console.log(tropeSpace.map(t=>t.name))
	var randomType = tropeSpace[Math.floor(tropeSpace.length * Math.random())];
	return exports.createNewTrope(randomType.num, level);
}
var moves = require("./moves.json");

exports.tropeFromState = function(inst) {
	if(!inst || inst[0] == 0) { return; }
	inst = exports.serializeTrope(inst);
	// prototype trope from type numbered by first serial value
    var t = Object.create(tropes[inst[0]]);
    [t.num, t.level, t.hp, t.pp1, t.pp2, t.pp3, t.pp4, t.attackMod, t.defenseMod, t.xp, t.special] = inst;
	t.maxHP = t.baseHP + t.hpLvl * t.level;
	t.learnedMoves = [];
	for(var move of t.moves) {
		if(move[1] <= t.level) {
			t.learnedMoves.push(move[0]);
		}
	}
	return t;
}

exports.getUnevolvedType = function(trope) {
	trope = exports.tropeFromState(trope);
	return tropes.find(t=>t.evolve && t.evolve[0] == trope.num);
}

exports.createNewTrope = function(num, level=1) {
	var t = exports.tropeFromState([num, level, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
	t.hp = t.maxHP;
	for(var j=0; j<t.moves.length; j++) {
		t["pp"+(j+1)] = moves.find(m=>m.name==t.moves[j][0]).pp;
	}
	return t;
}

exports.serializeTrope = function(t) {
	if(Array.isArray(t)) { return t.slice(); }
	return [t.num, t.level, t.hp, t.pp1, t.pp2, t.pp3, t.pp4, t.attackMod, t.defenseMod, t.xp, t.special]
}
