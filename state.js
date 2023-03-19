var states = {};
var scenes = exports.scenes = require("./scenes.js");
var tropes = require("./tropes.js")

/*
This is the ordered list of state fields that represents a player's state
Each field has
  a name (used to name its property in the state object),
  a type symbol (used to pack it with jspack, https://github.com/pgriess/node-jspack),
  and a default value (either a string/number or a function that produces one)

We use this to serialize and deserialize a state cookine into a state object: the names of the fields are the names of the state object properties
*/
var fields = exports.fields = [
  { name:"scene", "symbol":"I", "default":scenes.INTRO, "desc":"number indicating what screen we are on (startup, battle, attacks/item/tropes submenu, item, tropes, world, etc)" },
  { name:"cursorPos", "symbol":"B", default:0, "desc":"number indicating cursor position (context-dependent *what* the cursor is)" },
  { name:"dialogPos", "symbol":"B", default:0, "desc":"number indentifying displayed dialogue item" },
  { name:"worldX", "symbol":"h", default:0, "desc":"player coordinate" },
  { name:"worldY", "symbol":"h", default:0, "desc":"player coordinate" },
  { name:"whichTropeActive", "symbol":"B", default:1, "desc":"which trope is active in battle" },
  { name:"trope1", symbol:"11A", default:Array(10).fill(0), desc:"" },
  { name:"trope2", symbol:"11A", default:Array(10).fill(0), desc:"" },
  { name:"trope3", symbol:"11A", default:Array(10).fill(0), desc:"" },
  { name:"trope4", symbol:"11A", default:Array(10).fill(0), desc:"" },
  { name:"trope5", symbol:"11A", default:Array(10).fill(0), desc:"" },
  { name:"trope6", symbol:"11A", default:Array(10).fill(0), desc:"" },
  { name:"tropeOpponent", symbol:"10A", default:Array(10).fill(0), desc:"opponent's active trope" },
  { name:"opponentMove", symbol:"B", default:9, desc:"attack index chosen by opponent -- 9 indicates no move yet" },
  { name:"opponentId", symbol:"36s", default:"", desc: "UUID of multiplayer opponent" }
]



/*
trope fields:
  tropeNum
  level (this informs attack, defense, speed, max HP, available moves)
  hp
  move1PP, move2PP, move3PP, move4PP
  attackDiff, speedDiff, defenceDiff
*/

var formatStr = "";
for(var record of exports.fields) {
	formatStr += record.symbol;
}
exports.formatStr = formatStr;

exports.newStateObject = function() {
    var state = { id: require("crypto").randomUUID() };
	fields.forEach(f=>state[f.name] = f.default&&f.default.slice?f.default.slice():f.default);
	return state;
}

exports.saveState = function(res, state) {
	for(var i of [1,2,3,4,5,6,"Opponent"]) {
		if(state["trope"+i]) { state["trope"+i] = tropes.serializeTrope(state["trope"+i]); }
	}
	
	states[state.id] = state;
	res.cookie('id', state.id, { maxAge: 90000000000, httpOnly: true });
}

exports.createStateObjectFromID = function(id) {
	return states[id] || exports.newStateObject();
}
