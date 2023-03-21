var tropes = [
 {},
  { "num":1, "name":"CinnamonRoll", "emoji":"🌀", "moves": [["Flail", 1], ["Puppy Eyes", 1], ["Comfort", 3], ["Bare Soul",5]], "baseHP":20, "hpLvl":5, "evolve":[2,4], "type":"F" },
  { "num":2, "name":"Lil MeowMeow", "emoji":"😿", "moves": [["Flail", 1], ["Puppy Eyes", 1], ["Comfort", 3], ["Bare Soul",5]], "baseHP":20, "hpLvl":6, "type":"F" },
  { "num":3, "name":"Pining", "emoji":"🥺", "moves": [["Tackle", 1], ["Weep", 1], ["Bemoan", 3], ["Fury",5]], "baseHP":20, "hpLvl":5, "evolve":[4,4], "type":"A" },
  { "num":4, "name":"Yearning", "emoji":"😭", "moves": [["Tackle", 1], ["Weep", 1], ["Bemoan", 3], ["Fury",5]], "baseHP":20, "hpLvl":5, "type":"A" },
  { "num":5, "name":"Fanservice", "emoji":"😘", "moves": [["Gyrate", 1], ["Flirt", 1], ["Smoulder", 3], ["Ooh La La",5]], "baseHP":20, "hpLvl":5, "evolve":[6,4], "type":"S" },
  { "num":6, "name":"E-Rated", "emoji":"😈", "moves": [["Gyrate", 1], ["Flirt", 1], ["Smoulder", 3], ["Ooh La La",5]], "baseHP":20, "hpLvl":5, "type":"S" }
];
var moves = require("./moves.json");

exports.tropeFromState = function(inst) {
	if(inst[0] == 0) { return; }
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

exports.createNewTrope = function(num, level=1) {
	var t = exports.tropeFromState([num, level, 0, 10, 10, 10, 10, 0, 0, 0, 0]);
	t.hp = t.maxHP;
	return t;
}

exports.serializeTrope = function(t) {
	if(Array.isArray(t)) { return t; }
	return [t.num, t.level, t.hp, t.pp1, t.pp2, t.pp3, t.pp4, t.attackMod, t.defenseMod, t.xp, t.special]
}