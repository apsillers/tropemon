var states = {};
var scenes = exports.scenes = require("./scenes.js");
var tropes = require("./tropes.js")

const { createClient } = require('redis');

/*
This is the ordered list of state fields that represents a player's state
Each field has
  a name (used to name its property in the state object),
  a type symbol (used to pack it with jspack, https://github.com/pgriess/node-jspack),
  and a default value (either a string/number or a function that produces one)

We use this to serialize and deserialize a state cookine into a state object: the names of the fields are the names of the state object properties
*/
var fields = exports.fields = [
  { name:"scene", "symbol":"I", "default":scenes.INTRO.id, "desc":"number indicating what screen we are on (startup, battle, attacks/item/tropes submenu, item, tropes, world, etc)" },
  { name:"cursorPos", "symbol":"B", default:0, "desc":"number indicating cursor position (context-dependent *what* the cursor is)" },
  { name:"dialogPos", "symbol":"B", default:0, "desc":"number indentifying displayed dialogue item" },
  { name:"worldX", "symbol":"h", default:0, "desc":"player coordinate" },
  { name:"worldY", "symbol":"h", default:0, "desc":"player coordinate" },
  { name:"whichTropeActive", "symbol":"B", default:1, "desc":"which trope is active in battle" },
  { name:"trope1", symbol:"12A", default:[0, 3, 5, 10, 10, 10, 10, 0, 0, 299, 0], desc:"" },
  { name:"trope2", symbol:"12A", default:[0, 10, 1, 10, 10, 10, 10, 0, 0, 0, 0], desc:"" },
  { name:"trope3", symbol:"12A", default:[0, 3, 12, 10, 10, 10, 10, 0, 0, 299, 0], desc:"" },
  { name:"trope4", symbol:"12A", default:[0, 11, 12, 10, 10, 10, 10, 0, 0, 0, 0], desc:"" },
  { name:"trope5", symbol:"12A", default:[0, 4, 12, 10, 10, 10, 10, 0, 0, 0, 0], desc:"" },
  { name:"trope6", symbol:"12A", default:[0, 12, 12, 10, 10, 10, 10, 0, 0, 0, 0], desc:"" },
  { name:"tropeOpponent", symbol:"12A", default:[4, 10, 15, 10, 10, 10, 10, 0, 0, 0, 0], desc:"opponent's active trope" },
  // oponentMove and opponentNextMove are separate because your opponent might go through the attack messages quickly
  // and then queue up a next move while you're still rendering their last one
  { name:"opponentMove", symbol:"B", default:99, desc:"attack index chosen by opponent that we are currently animating -- 99 indicates no move yet" },
  { name:"opponentNextMove", symbol:"B", default:99, desc:"attack index chosen by opponent that we will animate next -- 99 indicates no move yet" },
  { name:"opponentId", symbol:"36s", default:"", desc: "UUID of multiplayer opponent" },
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

exports.saveState = async function(res, state) {
	for(var i of [1,2,3,4,5,"Opponent"]) {
		if(state["trope"+i]) { state["trope"+i] = tropes.serializeTrope(state["trope"+i]); }
	}

	console.log("saving", state);

	if(typeof state.scene == "object") {
		state.scene = state.scene.id;
	}

	const client = createClient();
	client.on('error', err => console.log('Redis Client Error', err));

	await client.connect();
	//states[state.id] = state;
	await client.set(state.id, JSON.stringify(state));

	if(res) {
		try {
			res.cookie('id', state.id, { maxAge: 90000000000, httpOnly: true, sameSite: 'none', secure: true });
		} catch(e) {}
	}

	await client.disconnect();
}

exports.createStateObjectFromID = async function(id) {
	const client = createClient();
	client.on('error', err => console.log('Redis Client Error', err));

	await client.connect()
        if(id) {
		var state = JSON.parse(await client.get(id));
	} else {
		var state = exports.newStateObject();
	}
	state.scene = scenes.find(state.scene);
	await client.disconnect();
	return state;
}
