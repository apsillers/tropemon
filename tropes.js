var tropes = [
 {},
  { "num":1, "name":"CinnamonRoll", "emoji":"🌀", "moves": [["Flail", 1], ["Puppy Eyes", 1], ["Comfort", 3], ["Bare Soul",5]], "baseHP":20, "hpLvl":5, "evolve":[2,4], "type":"F" },
  { "num":2, "name":"Lil MeowMeow", "emoji":"😿", "moves": [["Flail", 1], ["Puppy Eyes", 1], ["Comfort", 3], ["Bare Soul",5]], "baseHP":20, "hpLvl":6, "type":"F", "minLevel":4 },
  { "num":3, "name":"Pining", "emoji":"🥺", "moves": [["Tackle", 1], ["Weep", 1], ["Bemoan", 3], ["Fury",5]], "baseHP":20, "hpLvl":5, "evolve":[4,4], "type":"A" },
  { "num":4, "name":"Yearning", "emoji":"😭", "moves": [["Tackle", 1], ["Weep", 1], ["Bemoan", 3], ["Fury",5]], "baseHP":20, "hpLvl":5, "type":"A", "minLevel":4 },
  { "num":5, "name":"Fanservice", "emoji":"😘", "moves": [["Gyrate", 1], ["Flirt", 1], ["Smolder", 3], ["Ooh La La",5]], "baseHP":20, "hpLvl":5, "evolve":[6,4], "type":"S" },
  { "num":6, "name":"Explicit", "emoji":"😈", "moves": [["Gyrate", 1], ["Flirt", 1], ["Smolder", 3], ["Ooh La La",5]], "baseHP":20, "hpLvl":5, "type":"S", "minLevel":4 }
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
	for(var j=0; j<4; j++) {
		
		t["pp"+(j+1)] = moves.find(m=>m.name==t.moves[j][0]).pp;
	}
	return t;
}

exports.serializeTrope = function(t) {
	if(Array.isArray(t)) { return t.slice(); }
	return [t.num, t.level, t.hp, t.pp1, t.pp2, t.pp3, t.pp4, t.attackMod, t.defenseMod, t.xp, t.special]
}